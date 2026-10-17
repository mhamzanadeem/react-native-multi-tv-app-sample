const React = require('react');
const TestRenderer = require('react-test-renderer');
const { Text } = require('react-native');
const Stepper = require('../../../packages/shared-ui/src/components/fitness/WorkoutStepper').default;
const steps = ['Goal', 'Experience', 'Duration', 'Equipment', 'Workout style', 'Body focus', 'Position', 'Recovery', 'Avoid exercises', 'Review'];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it.each([[0, ['Goal', 'Experience', 'Duration']], [2, ['Goal', 'Experience', 'Duration']], [3, ['Equipment', 'Workout style', 'Body focus']], [8, ['Position', 'Recovery', 'Avoid exercises']], [9, ['Review']]])('shows only the three-step batch containing step %i', async (current, expected) => {
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Stepper, { steps, current })); });
    const labels = renderer.root.findAllByType(Text).map((node) => node.props.children).filter((label) => steps.includes(label));
    expect(labels).toEqual(expected);
    expect(renderer.root.findAll((node) => node.props.accessibilityRole === 'progressbar')[0].props.accessibilityValue.now).toBe(current);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Current step')).toBe(true);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
it('returns to the previous batch when going back and distinguishes completion from current focus', async () => {
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Stepper, { steps, current: 3 })); });
    await TestRenderer.act(async () => renderer.update(React.createElement(Stepper, { steps, current: 2 })));
    const labels = renderer.root.findAllByType(Text).map((node) => node.props.children);
    expect(labels).toContain('Duration');
    expect(labels).not.toContain('Equipment');
    expect(labels.filter((label) => label === 'Completed')).toHaveLength(2);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
