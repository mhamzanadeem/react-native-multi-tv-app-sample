const React = require('react');
const TestRenderer = require('react-test-renderer');
const Screen = require('../../../packages/shared-ui/src/screens/fitness/MockAwsScreen').default;
const { FitnessButton } = require('../../../packages/shared-ui/src/components/fitness/FitnessPrimitives');
const { backendConfig } = require('../../../packages/shared-ui/src/services/backend/config');
jest.mock('../../../packages/shared-ui/src/components/fitness/FitnessScreen', () => ({
  __esModule: true,
  default: ({ children }) => require('react').createElement('View', null, children),
}));
jest.mock('react-tv-space-navigation', () => {
  const React = require('react');
  const wrapper = ({ children }) => React.createElement('View', null, children);
  return {
    SpatialNavigationView: wrapper,
    DefaultFocus: wrapper,
    SpatialNavigationFocusableView: ({ children }) =>
      React.createElement('View', null, typeof children === 'function' ? children({ isFocused: false }) : children),
  };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
const rendered = () => JSON.stringify(renderer.toJSON());
const press = async (label) => {
  const button = renderer.root.findAllByType(FitnessButton).find((node) => node.props.text === label);
  expect(button).toBeDefined();
  await TestRenderer.act(async () => button.props.onSelect());
};
beforeEach(async () => {
  backendConfig.mode = 'mock';
  backendConfig.baseUrl = '';
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(Screen));
  });
});
afterEach(async () => {
  await TestRenderer.act(async () => renderer.unmount());
  jest.useRealTimers();
  backendConfig.mode = 'mock';
  backendConfig.baseUrl = '';
});
test('real screen changes request, loads, sends backend result and resets', async () => {
  expect(rendered()).toContain('MOCK MODE');
  await press('Strength');
  await press('intermediate');
  await press('30 minutes');
  await press('Dumbbells');
  await press('Send Mock Request');
  expect(rendered()).toContain('Sending');
  await TestRenderer.act(async () => jest.advanceTimersByTime(500));
  expect(rendered()).toContain('SUCCESS');
  expect(rendered()).toContain('generate-workout-success.json');
  const texts = renderer.root
    .findAllByType(require('react-native').Text)
    .map((node) => node.props.children)
    .filter((s) => typeof s === 'string')
    .join('\n');
  expect(texts).toContain('"goal": "strength"');
  expect(texts).toContain('"durationMinutes": 30');
  expect(texts).toContain('"dumbbells"');
  await press('Reset demo');
  expect(rendered()).not.toContain('HTTP 200');
});
test('simulated server/network errors are displayed with actual fixture identity', async () => {
  for (const [label, code, fixture] of [
    ['Simulated server error', 'SERVER_ERROR', 'server-error.json'],
    ['Simulated network failure', 'NETWORK_ERROR', 'network-error.json'],
  ]) {
    await press(label);
    await press('Send Mock Request');
    await TestRenderer.act(async () => jest.advanceTimersByTime(500));
    expect(rendered()).toContain(code);
    expect(rendered()).toContain(fixture);
  }
});
test('invalid AWS mode visibly blocks sending without mock fallback', async () => {
  await TestRenderer.act(async () => renderer.unmount());
  backendConfig.mode = 'aws';
  backendConfig.baseUrl = '';
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(Screen));
  });
  expect(rendered()).toContain('CONFIGURATION BLOCKED');
  const send = renderer.root.findAllByType(FitnessButton).find((node) => node.props.text === 'Send Real AWS Request');
  expect(send.props.disabled).toBe(true);
  expect(rendered()).not.toContain('MOCK MODE');
});
