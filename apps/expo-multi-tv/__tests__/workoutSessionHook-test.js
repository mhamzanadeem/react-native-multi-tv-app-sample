const React = require('react');
const TestRenderer = require('react-test-renderer');
const { AppState } = require('react-native');
const { useWorkoutSession } = require('../../../packages/shared-ui/src/hooks/useWorkoutSession');
const { generatePlan } = require('../../../packages/shared-ui/src/utils/planGenerator');
const { DEFAULT_CONFIG } = require('../../../packages/shared-ui/src/domain/workoutConfig');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let latest;
let intervalSpy;
let clearSpy;
function activeWorkoutTimers() {
  return intervalSpy.mock.calls.reduce((count, args, index) => {
    const handle = intervalSpy.mock.results[index].value;
    return count + (args[1] === 250 && !clearSpy.mock.calls.some((call) => call[0] === handle) ? 1 : 0);
  }, 0);
}
function Probe({ plan, focused = true }) {
  latest = useWorkoutSession(plan, focused);
  return React.createElement('Text', null, latest.state.status);
}
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  intervalSpy = jest.spyOn(global, 'setInterval');
  clearSpy = jest.spyOn(global, 'clearInterval');
  jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it('owns one timer, freezes on pause, pauses in background and cleans up on unmount', async () => {
  let onAppState;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    onAppState = callback;
    return { remove };
  });
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe, { plan: generatePlan(DEFAULT_CONFIG) }));
  });
  expect(activeWorkoutTimers()).toBe(0);
  await TestRenderer.act(async () => {
    latest.dispatch({ type: 'start', now: Date.now() });
  });
  expect(activeWorkoutTimers()).toBe(1);
  await TestRenderer.act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(latest.state.activeMs).toBe(1000);
  await TestRenderer.act(async () => {
    latest.dispatch({ type: 'pause', now: Date.now() });
  });
  expect(activeWorkoutTimers()).toBe(0);
  await TestRenderer.act(async () => {
    jest.advanceTimersByTime(10000);
  });
  expect(latest.state.activeMs).toBe(1000);
  await TestRenderer.act(async () => {
    latest.dispatch({ type: 'resume', now: Date.now() });
  });
  expect(activeWorkoutTimers()).toBe(1);
  await TestRenderer.act(async () => {
    onAppState('background');
  });
  expect(latest.state.status).toBe('paused');
  expect(activeWorkoutTimers()).toBe(0);
  await TestRenderer.act(async () => {
    renderer.unmount();
  });
  expect(remove).toHaveBeenCalledTimes(1);
});
it('never creates duplicate StrictMode intervals and pauses when focus is lost', async () => {
  const removers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
    const remove = jest.fn();
    removers.push(remove);
    return { remove };
  });
  const plan = generatePlan(DEFAULT_CONFIG);
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(React.StrictMode, null, React.createElement(Probe, { plan })));
  });
  await TestRenderer.act(async () => {
    latest.dispatch({ type: 'start', now: Date.now() });
  });
  expect(activeWorkoutTimers()).toBe(1);
  await TestRenderer.act(async () => {
    renderer.update(React.createElement(React.StrictMode, null, React.createElement(Probe, { plan, focused: false })));
  });
  expect(latest.state.status).toBe('paused');
  expect(activeWorkoutTimers()).toBe(0);
  await TestRenderer.act(async () => {
    renderer.unmount();
  });
  expect(removers.every((remove) => remove.mock.calls.length === 1)).toBe(true);
});
