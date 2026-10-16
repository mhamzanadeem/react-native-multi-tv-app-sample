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
  useIsFocused: () => true,
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
it('renders the primary journey, records a real summary, and reloads local progress', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    await press(renderer, 'Start Workout');
    expect(mockRoute.name).toBe('WorkoutSetup');
    await press(renderer, 'Cardio');
    await press(renderer, '20 minutes');
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
    await press(renderer, 'Generate workout plan');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutPlan', expect.any(Object));
    const strength = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Strength' && typeof node.props.onPress === 'function',
    )[0];
    expect(strength.props.accessibilityState.selected).toBe(true);
    expect(JSON.parse(mockValues.get('formfit-preferences-v1')).value.goal).toBe('strength');
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
  }
});

it('keeps Continue Workout disabled until a plan exists and opens the current plan from Quick Start', async () => {
  mockValues.clear();
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    const continueButton = () => renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Continue Workout' && typeof node.props.onPress === 'function',
    )[0];
    expect(continueButton().props.disabled).toBe(true);
    await press(renderer, 'Continue Workout');
    expect(mockRoute.name).toBe('Home');
    await press(renderer, 'Build Your Plan');
    expect(mockRoute.name).toBe('WorkoutSetup');
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
    expect(selected.sort()).toEqual(['General fitness', 'Beginner', '10 minutes', 'No equipment', 'Low impact'].sort());
    // Chosen options use a checkmark; the blue background belongs only to remote focus.
    const { StyleSheet } = require('react-native');
    const selectedButtons = buttons.filter((node) => node.props.accessibilityState.selected);
    for (const button of selectedButtons) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.backgroundColor).toBe('#202E40');
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

it('runs the customized cloud journey through the real HTTP adapter and Lambda handler', async () => {
  mockValues.clear();
  const { createHandler } = require('../../../infrastructure/lambda/handler');
  const records = new Map();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const handle = createHandler({
    get: async (key) => records.has(key) ? clone(records.get(key)) : null,
    put: async (key, value) => { records.set(key, clone(value)); },
    putIfAbsent: async (key, value) => { if (records.has(key)) return false; records.set(key, clone(value)); return true; },
    list: async (prefix, limit) => [...records.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => b.localeCompare(a)).slice(0, limit).map(([, value]) => clone(value)),
  }, () => 'cloud-screen-test');
  const transport = jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    const result = await handle({ rawPath: new URL(url).pathname, requestContext: { http: { method: options.method } }, headers: options.headers, body: options.body });
    return { status: result.statusCode, text: async () => result.body };
  });
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { initial: 'WorkoutSetup' })); });
    await press(renderer, 'Cardio');
    await press(renderer, 'Customize workout style');
    await press(renderer, 'Cardio intervals');
    await press(renderer, 'Standing only');
    await press(renderer, 'Extra rest');
    await press(renderer, 'Change exercise order');
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
    await press(renderer, 'Refresh AWS demo history');
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
    await press(renderer, 'Customize workout style');
    await press(renderer, 'Bodyweight strength');
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
