const React = require('react');
const TestRenderer = require('react-test-renderer');
const mockMount = jest.fn();
const mockUnmount = jest.fn();
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationView: ({ children }) => require('react').createElement('View', null, children),
  DefaultFocus: ({ children }) => require('react').createElement('InitialFocus', null, children),
}));
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => ({
  __esModule: true,
  default: function Card(props) {
    const React = require('react');
    React.useEffect(() => { mockMount(props.text); return () => mockUnmount(props.text); }, []);
    return React.createElement('OptionCard', props);
  },
}));
const Grid = require('../../../packages/shared-ui/src/components/fitness/WorkoutOptionGrid').default;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Harness() {
  const [selected, setSelected] = React.useState([]);
  return React.createElement(Grid, { multiSelect: true, options: [
    { id: 'none', label: 'No exclusions', actionLabel: 'Clear exclusions', description: 'Reset', selected: selected.length === 0, onSelect: () => setSelected([]) },
    ...['Squat', 'March'].map((name) => ({ id: name, label: name, description: 'Exercise', selected: selected.includes(name), onSelect: () => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]) })),
  ] });
}
it('keeps spatial cards mounted while selecting multiple options, deselecting and clearing', async () => {
  let renderer;
  mockMount.mockClear(); mockUnmount.mockClear();
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Harness)); });
    const card = (name) => renderer.root.findAllByType('OptionCard').find((node) => node.props.text === name);
    const press = async (name) => TestRenderer.act(async () => card(name).props.onSelect());
    await press('Squat');
    expect(card('Squat').props.actionLabel).toBe('Deselect');
    expect(card('Squat').props.accessibilityState.checked).toBe(true);
    expect(card('Squat').props.accessibilityRole).toBe('checkbox');
    await press('March');
    expect(card('Squat').props.accessibilityState.selected).toBe(true);
    await press('Squat');
    expect(card('Squat').props.actionLabel).toBe('Select');
    expect(card('Squat').props.accessibilityState.checked).toBe(false);
    expect(card('March').props.accessibilityState.selected).toBe(true);
    await press('No exclusions');
    expect(card('March').props.accessibilityState.checked).toBe(false);
    expect(mockMount).toHaveBeenCalledTimes(3);
    expect(mockUnmount).not.toHaveBeenCalled();
    expect(renderer.root.findByType('InitialFocus').findByType('OptionCard').props.text).toBe('No exclusions');
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
