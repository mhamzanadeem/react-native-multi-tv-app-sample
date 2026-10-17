const React = require('react');
const TestRenderer = require('react-test-renderer');
const { MenuProvider } = require('../../../packages/shared-ui/src/components/MenuContext');
const { FormFitProvider } = require('../../../packages/shared-ui/src/hooks/FormFitContext');
const Home = require('../../../packages/shared-ui/src/screens/fitness/FitnessHomeScreen').default;
const Setup = require('../../../packages/shared-ui/src/screens/fitness/WorkoutSetupScreen').default;
const Plan = require('../../../packages/shared-ui/src/screens/fitness/WorkoutPlanScreen').default;
const Session = require('../../../packages/shared-ui/src/screens/fitness/WorkoutSessionScreen').default;
const Complete = require('../../../packages/shared-ui/src/screens/fitness/WorkoutCompleteScreen').default;
const Progress = require('../../../packages/shared-ui/src/screens/fitness/WorkoutProgressScreen').default;
const mockValues = new Map();
let mockRoute;
let mockNavigation;
jest.mock('../../../packages/shared-ui/src/data/storage', () => ({
  __esModule: true,
  default: {
    persistent: true,
    getItem: async (key) => mockValues.get(key) ?? null,
    setItem: async (key, value) => {
      mockValues.set(key, value);
    },
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useIsFocused: jest.fn(() => true),
  usePreventRemove: jest.fn(),
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }), closeDrawer: () => ({ type: 'CLOSE_DRAWER' }) },
}));
jest.mock('react-tv-space-navigation', () => {
  const React = require('react');
  const wrapper = ({ children }) => React.createElement('View', null, children);
  return {
    SpatialNavigationRoot: wrapper,
    SpatialNavigationScrollView: wrapper,
    SpatialNavigationView: wrapper,
    DefaultFocus: wrapper,
    SpatialNavigationFocusableView: ({ children, onSelect }) =>
      React.createElement(
        'FocusNode',
        { onSelect },
        typeof children === 'function' ? children({ isFocused: false }) : children,
      ),
  };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline')); });
afterEach(() => jest.restoreAllMocks());
function Harness({ initial = 'Home' }) {
  const [route, setRoute] = React.useState({ name: initial, params: undefined });
  mockRoute = route;
  const navigate = (name, params) =>
    setRoute({ name: name === 'DrawerNavigator' ? (params?.screen ?? 'Home') : name, params });
  mockNavigation = {
    navigate,
    replace: navigate,
    reset: (state) => navigate(state.routes[0].name, state.routes[0].params),
    goBack: () => navigate('Home'),
    dispatch: jest.fn(),
  };
  const screens = {
    Home,
    Workouts: Setup,
    WorkoutSetup: Setup,
    WorkoutPlan: Plan,
    WorkoutSession: Session,
    WorkoutComplete: Complete,
    Progress,
  };
  return React.createElement(
    MenuProvider,
    { initiallyOpen: false },
    React.createElement(FormFitProvider, null, React.createElement(screens[route.name])),
  );
}
async function press(renderer, label) {
  const button = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  )[0];
  if (!button) throw new Error(`Missing real control: ${label}`);
  await TestRenderer.act(async () => {
    button.props.onPress({ stopPropagation: jest.fn() });
  });
}
async function advanceToReview(renderer) {
  for (let i = 0; i < 9; i++) {
    const next = renderer.root.findAll((node) => node.props.accessibilityLabel === 'Next' && typeof node.props.onPress === 'function')[0];
    if (!next) return;
    await press(renderer, 'Next');
  }
}
it('renders the primary journey, records a real summary, and reloads local progress', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    await press(renderer, 'Create Workout Plan');
    expect(mockRoute.name).toBe('WorkoutSetup');
    await press(renderer, 'Cardio');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, '20 minutes');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutPlan');
    const { FitnessButton } = require('../../../packages/shared-ui/src/components/fitness/FitnessPrimitives');
    expect(renderer.root.findAllByType(FitnessButton).filter((node) => node.props.text === 'Start Workout')).toHaveLength(1);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Workout overview');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Start this workout');
    expect(JSON.parse(mockValues.get('formfit-preferences-v1')).value.goal).toBe('cardio');
    await press(renderer, 'Start Workout');
    expect(mockRoute.name).toBe('WorkoutSession');
    await press(renderer, 'Begin session');
    await TestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await press(renderer, 'Pause workout');
    await TestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'Resume workout');
    await press(renderer, 'Skip exercise');
    for (let guard = 0; mockRoute.name === 'WorkoutSession' && guard < 200; guard++) {
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(1000);
      });
      const label = ['Finish set', 'Finish rest', 'Next exercise'].find(
        (text) =>
          renderer.root.findAll(
            (node) => node.props.accessibilityLabel === text && typeof node.props.onPress === 'function',
          ).length,
      );
      if (!label) break;
      await press(renderer, label);
    }
    expect(mockRoute.name).toBe('WorkoutComplete');
    const rows = JSON.parse(mockValues.get('formfit-history-v1')).value;
    expect(rows).toHaveLength(1);
    expect(rows[0].goal).toBe('cardio');
    expect(rows[0].skippedExercises).toBe(1);
    expect(rows[0].completedExercises + rows[0].skippedExercises).toBe(rows[0].exerciseCount);
    expect(rows[0].activeSeconds).toBeGreaterThan(0);
    expect(rows[0].activeSeconds).toBeLessThan(20 * 60);
    await press(renderer, 'View progress');
    expect(mockRoute.name).toBe('Progress');
    await TestRenderer.act(async () => {
      renderer.unmount();
    });
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, { initial: 'Progress' }));
    });
    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === 'View session summary').length,
    ).toBeGreaterThan(0);
  } finally {
    if (renderer)
      await TestRenderer.act(async () => {
        renderer.unmount();
      });
    jest.useRealTimers();
  }
}, 30000);
it('pauses before exit confirmation, resumes on cancel, and leaves abandoned sessions unrecorded', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    await press(renderer, 'View 10-minute plan');
    await press(renderer, 'Start Workout');
    await press(renderer, 'Begin session');
      const { Actions, FitnessButton, ui } = require('../../../packages/shared-ui/src/components/fitness/FitnessPrimitives');
      const { StyleSheet } = require('react-native');
      const actionRow = renderer.root.findAllByType(Actions).find((row) => row.findAllByType(FitnessButton).some((button) => button.props.testID === 'session-main'));
      expect(actionRow.props.singleRow).toBe(true);
      expect(actionRow.findAllByType(FitnessButton)).toHaveLength(4);
      const mainAction = actionRow.findAllByType(FitnessButton)[0];
      expect(StyleSheet.flatten(mainAction.props.style).backgroundColor).not.toBe(StyleSheet.flatten(ui.primary).backgroundColor);
    await press(renderer, 'End session');
    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === 'Keep exercising').length).toBeGreaterThan(
      0,
    );
    await TestRenderer.act(async () => jest.advanceTimersByTime(10000));
    await press(renderer, 'Keep exercising');
    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === 'Pause workout').length).toBeGreaterThan(
      0,
    );
    await press(renderer, 'End session');
    await press(renderer, 'End workout');
      expect(require('@react-navigation/native').usePreventRemove.mock.calls.at(-1)[0]).toBe(false);
      expect(mockRoute.name).toBe('WorkoutSession');
      await TestRenderer.act(async () => jest.advanceTimersByTime(32));
    expect(mockRoute.name).toBe('Home');
    expect(mockValues.has('formfit-history-v1')).toBe(false);
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    jest.useRealTimers();
  }
}, 30000);
it('keeps changed setup choices when preferences are saved beneath the plan screen', async () => {
  mockValues.clear();
  mockRoute = { name: 'WorkoutSetup', params: { goal: 'cardio' } };
  mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn() };
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          MenuProvider,
          { initiallyOpen: false },
          React.createElement(FormFitProvider, null, React.createElement(Setup)),
        ),
      );
    });
    await press(renderer, 'Strength');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutPlan', expect.any(Object));
    for (let i = 0; i < 9; i++) await press(renderer, 'Previous step');
    const strength = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Strength' && typeof node.props.onPress === 'function',
    )[0];
    expect(strength.props.accessibilityState.selected).toBe(true);
    expect(JSON.parse(mockValues.get('formfit-preferences-v1')).value.goal).toBe('strength');
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
  }
});

it('hides Continue Workout until a plan exists and opens the current plan from Quick Start', async () => {
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    const continueButton = () => renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Continue Workout' && typeof node.props.onPress === 'function',
    )[0];
    expect(continueButton()).toBeUndefined();
    expect(mockRoute.name).toBe('Home');
    await press(renderer, 'Build Your Plan');
    expect(mockRoute.name).toBe('WorkoutSetup');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutPlan');
    const planId = mockRoute.params.planId;
    await TestRenderer.act(async () => mockNavigation.navigate('Home'));
    expect(continueButton().props.disabled).toBeFalsy();
    await press(renderer, 'Continue Workout');
    expect(mockRoute).toEqual({ name: 'WorkoutPlan', params: { planId } });
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
  }
});

it('preselects only the first option in each setup group despite saved preferences and a route goal', async () => {
  mockValues.clear();
  mockValues.set('formfit-preferences-v1', JSON.stringify({ version: 1, value: {
    goal: 'cardio', fitnessLevel: 'advanced', durationMinutes: 45, equipment: ['dumbbells'], lowImpact: false,
  } }));
  mockRoute = { name: 'WorkoutSetup', params: { goal: 'cardio' } };
  mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn() };
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(MenuProvider, { initiallyOpen: false },
        React.createElement(FormFitProvider, null, React.createElement(Setup))));
    });
    const buttons = renderer.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityState?.selected !== undefined);
    const selected = [...new Set(buttons.filter((node) => node.props.accessibilityState.selected).map((node) => node.props.accessibilityLabel))];
    expect(selected).toEqual(['General fitness']);
    // Chosen options use a checkmark; the blue background belongs only to remote focus.
    const { StyleSheet } = require('react-native');
    const selectedButtons = buttons.filter((node) => node.props.accessibilityState.selected);
    for (const button of selectedButtons) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.backgroundColor).toBe('#282D36');
      expect(style.borderColor).toBe('transparent');
    }

    const texts = renderer.root.findAllByType(require('react-native').Text).map((node) => node.props.children);
    expect(texts.some((text) => typeof text === 'string' && text.includes('/ selected'))).toBe(false);
    await press(renderer, 'Cardio');
    const cardio = renderer.root.findAll((node) => node.props.accessibilityLabel === 'Cardio' && typeof node.props.onPress === 'function')[0];
    expect(cardio.props.accessibilityState.selected).toBe(true);
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
  }
});

it.each(['aws', 'offline'])('preserves Advanced / 30-minute choices through generation (%s)', async (mode) => {
  mockValues.clear();
  const { createGuestHandler } = require('../../../infrastructure/lambda/guestHandler');
  const records = new Map();
  const handle = createGuestHandler(() => ({
    get: async (key) => records.get(key) ?? null,
    put: async (key, value) => { records.set(key, value); },
    putIfAbsent: async (key, value) => { if (records.has(key)) return false; records.set(key, value); return true; },
    list: async () => [],
  }), () => 'advanced-plan-test');
  const transport = jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    if (mode === 'offline') throw new Error('offline');
    const result = await handle({ rawPath: new URL(url).pathname, requestContext: { http: { method: options.method } }, headers: options.headers, body: options.body });
    return { status: result.statusCode, text: async () => result.body };
  });
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Next');
    await press(renderer, 'Advanced');
    await press(renderer, 'Next');
    await press(renderer, '30 minutes');
    await advanceToReview(renderer);
    expect(JSON.stringify(renderer.toJSON())).toContain('advanced');
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutPlan');
    expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({ fitnessLevel: 'advanced', durationMinutes: 30 });
    expect(JSON.stringify(renderer.toJSON())).toContain('ADVANCED');
    if (mode === 'aws') {
      const plan = [...records.values()].find((value) => value.plan)?.plan;
      expect(plan).toMatchObject({ fitnessLevel: 'advanced', targetDurationMinutes: 30 });
      expect(plan.estimatedDurationSeconds).toBeGreaterThanOrEqual(27 * 60);
      expect(JSON.stringify(renderer.toJSON())).not.toContain('offline exercise catalogue');
    }
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    transport.mockRestore();
  }
});

it('runs the customized cloud journey through the real HTTP adapter and Lambda handler', async () => {
  mockValues.clear();
  const { createGuestHandler } = require('../../../infrastructure/lambda/guestHandler');
  const records = new Map();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const handle = createGuestHandler(() => ({
    get: async (key) => records.has(key) ? clone(records.get(key)) : null,
    put: async (key, value) => { records.set(key, clone(value)); },
    putIfAbsent: async (key, value) => { if (records.has(key)) return false; records.set(key, clone(value)); return true; },
    list: async (prefix, limit) => [...records.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => b.localeCompare(a)).slice(0, limit).map(([, value]) => clone(value)),
  }), () => 'cloud-screen-test');
  const transport = jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    const result = await handle({ rawPath: new URL(url).pathname, requestContext: { http: { method: options.method } }, headers: options.headers, body: options.body });
    return { status: result.statusCode, text: async () => result.body };
  });
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Cardio');
    for (let i = 0; i < 4; i++) await press(renderer, 'Next');
    await press(renderer, 'Cardio intervals');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Standing only');
    await press(renderer, 'Next');
    await press(renderer, 'Extra rest');
    await press(renderer, 'Change exercise order');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutPlan');
    const submitted = JSON.parse(transport.mock.calls[0][1].body);
    expect(submitted).toMatchObject({ style: 'cardio-intervals', position: 'standing-only', restPreference: 'extra', variation: 1 });
    await press(renderer, 'Start Workout');
    await press(renderer, 'Begin session');
    for (let step = 0; step < 100 && mockRoute.name === 'WorkoutSession'; step++) {
      const next = renderer.root.findAll((node) => typeof node.props.onPress === 'function' && ['Finish set', 'Finish rest', 'Next exercise'].includes(node.props.accessibilityLabel))[0];
      expect(next).toBeDefined();
      await TestRenderer.act(async () => next.props.onPress({ stopPropagation: jest.fn() }));
    }
    expect(mockRoute.name).toBe('WorkoutComplete');
    expect([...records.keys()].filter((key) => key.startsWith('SESSION#'))).toHaveLength(1);
    await press(renderer, 'View progress');
    await press(renderer, 'Refresh recent sessions');
    expect(transport.mock.calls.some(([url]) => url.endsWith('/v1/workouts/history'))).toBe(true);
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    transport.mockRestore();
  }
});
it('automatically falls back to the offline catalogue and displays a warning', async () => {
  mockValues.clear();
  const transport = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Strength');
    for (let i = 0; i < 4; i++) await press(renderer, 'Next');
    await press(renderer, 'Bodyweight strength');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutPlan');
    expect(transport).toHaveBeenCalledTimes(1);
    const alerts = renderer.root.findAll((node) => node.props.accessibilityRole === 'alert');
    expect(alerts.some((node) => String(node.props.children).includes('offline exercise catalogue'))).toBe(true);
    expect(mockRoute.name).toBe('WorkoutPlan');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockValues.get('formfit-preferences-v1')).value.style).toBe('bodyweight');
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    transport.mockRestore();
  }
});

it('falls back after ten seconds when AWS never responds', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    expect(mockRoute.name).toBe('WorkoutSetup');
    await TestRenderer.act(async () => { jest.advanceTimersByTime(9999); });
    expect(mockRoute.name).toBe('WorkoutSetup');
    await TestRenderer.act(async () => { jest.advanceTimersByTime(1); });
    expect(mockRoute.name).toBe('WorkoutPlan');
    expect(JSON.stringify(renderer.toJSON())).toContain('offline exercise catalogue');
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    jest.useRealTimers();
  }
});

it('updates the sticky Home heading as remote focus changes sections', async () => {
  let renderer;
  const Screen = require('../../../packages/shared-ui/src/components/fitness/FitnessScreen').default;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness)); });
    expect(renderer.root.findByType(Screen).props.title).toBe('Home');
    for (const [label, title] of [['Build Your Plan', 'Quick Start'], ['Cardio', 'Choose your direction'], ['View progress', 'Your activity'], ['Create Workout Plan', 'Home']]) {
      const control = renderer.root.findAll((node) => node.props.text === label && typeof node.props.onSpatialFocus === 'function')[0];
      expect(control).toBeDefined();
      await TestRenderer.act(async () => control.props.onSpatialFocus());
      expect(renderer.root.findByType(Screen).props.title).toBe(title);
    }
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});

it('shows ten stages, retains choices when going back, and generates only from Review', async () => {
  mockValues.clear();
  let renderer;
  const Screen = require('../../../packages/shared-ui/src/components/fitness/FitnessScreen').default;
  const control = (label) => renderer.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    expect(renderer.root.findByType(Screen).props.eyebrow).toContain('STEP 1 OF 10');
    expect(control('Generate workout plan')).toBeUndefined();
    expect(control('Cardio').props.accessibilityHint).toContain('timed movement');
    await press(renderer, 'Cardio');
    await press(renderer, 'Next');
    await press(renderer, 'Intermediate');
    await press(renderer, 'Previous step');
    expect(control('Cardio').props.accessibilityState.selected).toBe(true);
    await press(renderer, 'Next');
    expect(control('Intermediate').props.accessibilityState.selected).toBe(true);
    await press(renderer, 'Next');
    await press(renderer, '20 minutes');
    await press(renderer, 'Next');
    await press(renderer, 'Dumbbells');
    await press(renderer, 'Resistance band');
    expect(control('No equipment').props.accessibilityState.selected).toBe(false);
    await press(renderer, 'Next');
    expect(renderer.root.findByType(Screen).props.eyebrow).toContain('STEP 5 OF 10');
    expect(control('Generate workout plan')).toBeUndefined();
    await advanceToReview(renderer);
    expect(renderer.root.findByType(Screen).props.eyebrow).toContain('STEP 10 OF 10');
    expect(control('Generate workout plan')).toBeDefined();
    const text = JSON.stringify(renderer.toJSON());
    expect(text.toLowerCase()).toContain('cardio');
    expect(text).toContain('intermediate');
    for (let i = 0; i < 6; i++) await press(renderer, 'Previous step');
    expect(control('Dumbbells').props.accessibilityState.selected).toBe(true);
    await press(renderer, 'No equipment');
    expect(control('Dumbbells').props.accessibilityState.selected).toBe(false);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});

it('offers every customization as its own step and retains exclusions when navigating back', async () => {
  let renderer;
  const Screen = require('../../../packages/shared-ui/src/components/fitness/FitnessScreen').default;
  const exercise = require('../../../packages/shared-ui/src/data/exercises').EXERCISES[0];
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    const titles = [];
    for (let i = 0; i < 8; i++) {
      titles.push(renderer.root.findByType(Screen).props.title);
      await press(renderer, 'Next');
    }
    expect(titles.slice(4)).toEqual(['Choose your workout style', 'Which body region should the plan focus on?', 'Which movement positions suit you?', 'Choose rest and exercise variety']);
    expect(renderer.root.findByType(Screen).props.title).toBe('Any exercises you want to leave out?');
    await press(renderer, exercise.name);
    await press(renderer, 'Next');
    expect(JSON.stringify(renderer.toJSON())).toContain(exercise.name);
    await press(renderer, 'Previous step');
    const selected = renderer.root.findAll((node) => node.props.accessibilityLabel === exercise.name && typeof node.props.onPress === 'function')[0];
    expect(selected.props.accessibilityState.selected).toBe(true);
    await press(renderer, 'No exclusions');
    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === exercise.name && typeof node.props.onPress === 'function')[0].props.accessibilityState.selected).toBe(false);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
it('releases the hidden builder exit guard without losing its selections', async () => {
  mockValues.clear();
  const navigationHooks = require('@react-navigation/native');
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Next');
    await press(renderer, 'Advanced');
    expect(navigationHooks.usePreventRemove.mock.calls.at(-1)[0]).toBe(true);
    navigationHooks.useIsFocused.mockReturnValue(false);
    await TestRenderer.act(async () => renderer.update(React.createElement(Harness, { initial: 'WorkoutSetup' })));
    expect(navigationHooks.usePreventRemove.mock.calls.at(-1)[0]).toBe(false);
    navigationHooks.useIsFocused.mockReturnValue(true);
    await TestRenderer.act(async () => renderer.update(React.createElement(Harness, { initial: 'WorkoutSetup' })));
    expect(navigationHooks.usePreventRemove.mock.calls.at(-1)[0]).toBe(true);
    const advanced = renderer.root.findAll((node) => node.props.accessibilityLabel === 'Advanced' && typeof node.props.onPress === 'function')[0];
    expect(advanced.props.accessibilityState.selected).toBe(true);
  } finally {
    navigationHooks.useIsFocused.mockReturnValue(true);
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
  }
});
it('shows generated Advanced plans in the single recent list after restart and can reopen them', async () => {
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Next');
    await press(renderer, 'Advanced');
    await press(renderer, 'Next');
    await press(renderer, '30 minutes');
    await advanceToReview(renderer);
    await press(renderer, 'Generate workout plan');
    await TestRenderer.act(async () => renderer.unmount());
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'Progress' })); });
    expect(JSON.stringify(renderer.toJSON())).toContain('ADVANCED');
    expect(JSON.stringify(renderer.toJSON())).toContain('Generated / ready to start');
    expect(mockValues.has('formfit-history-v1')).toBe(false);
    await press(renderer, 'View workout');
    expect(mockRoute.name).toBe('WorkoutPlan');
    expect(JSON.stringify(renderer.toJSON())).toContain('ADVANCED');
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
