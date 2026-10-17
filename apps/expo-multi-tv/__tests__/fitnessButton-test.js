const React = require('react');
const TestRenderer = require('react-test-renderer');
const { Platform } = require('react-native');
const Button = require('../../../packages/shared-ui/src/components/FocusablePressable').default;
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationFocusableView: ({ children, onSelect }) =>
    require('react').createElement('FocusNode', { onSelect }, children({ isFocused: true })),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('prevents bubbled web activation and ignores disabled spatial selection', async () => {
  const onSelect = jest.fn();
  const stopPropagation = jest.fn();
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Button, { text: 'Action', onSelect, accessibilityLabel: 'Action' }),
    );
  });
  const press = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === 'Action' && typeof node.props.onPress === 'function',
  )[0];
  await TestRenderer.act(async () => {
    press.props.onPress({ stopPropagation });
  });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledTimes(1);
  await TestRenderer.act(async () => {
    renderer.update(React.createElement(Button, { text: 'Action', onSelect, disabled: true }));
  });
  renderer.root.findByType('FocusNode').props.onSelect();
  expect(onSelect).toHaveBeenCalledTimes(1);
  await TestRenderer.act(async () => renderer.unmount());
});
it('uses only the remote subscriber for TV activation rather than selecting again on native release', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'isTV');
  const onSelect = jest.fn();
  let renderer;
  Object.defineProperty(Platform, 'isTV', { value: true, configurable: true });
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        React.createElement(Button, { text: 'TV action', onSelect, accessibilityLabel: 'TV action' }),
      );
    });
    const press = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'TV action' && typeof node.props.onPress === 'function',
    )[0];
    renderer.root.findByType('FocusNode').props.onSelect();
    press.props.onPress({});
    expect(onSelect).toHaveBeenCalledTimes(1);
  } finally {
    if (renderer) await TestRenderer.act(async () => renderer.unmount());
    if (descriptor) Object.defineProperty(Platform, 'isTV', descriptor);
    else delete Platform.isTV;
  }
});
it('keeps focused buttons readable even when a selected style supplies a dark background', async () => {
  const { StyleSheet } = require('react-native');
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Button, {
        text: 'Selected option',
        onSelect: jest.fn(),
        accessibilityLabel: 'Selected option',
        style: { backgroundColor: '#234C40', borderColor: '#99EDBF' },
      }),
    );
  });
  const press = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === 'Selected option' && typeof node.props.onPress === 'function',
  )[0];
  expect(StyleSheet.flatten(press.props.style).backgroundColor).toBe('#27334D');
  await TestRenderer.act(async () => renderer.unmount());
});

it('renders offline decorative artwork and a checkmark without changing the accessible label', async () => {
  const { Image, Text } = require('react-native');
  let renderer;
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Button, { text: 'Cardio', accessibilityLabel: 'Cardio', accessibilityState: { selected: true }, onSelect: jest.fn() }));
    });
    const images = renderer.root.findAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images.every((node) => node.props.accessible === false)).toBe(true);
    expect(images.every((node) => !node.props.source?.uri)).toBe(true);
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === '\u2713')).toBe(true);
    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === 'Cardio' && typeof node.props.onPress === 'function').length).toBeGreaterThan(0);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
it('keeps disabled cards neutral even when their spatial node is focused', async () => {
  const { StyleSheet } = require('react-native');
  const onSelect = jest.fn();
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Button, { text: 'Unavailable', accessibilityLabel: 'Unavailable', disabled: true, onSelect })); });
    const button = renderer.root.findAll((node) => node.props.accessibilityLabel === 'Unavailable' && typeof node.props.onPress === 'function')[0];
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe('#282D36');
    expect(StyleSheet.flatten(button.props.style).shadowOpacity).toBe(0);
    renderer.root.findByType('FocusNode').props.onSelect();
    expect(onSelect).not.toHaveBeenCalled();
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
it('uses consistent card dimensions for header and playback controls', async () => {
  const { StyleSheet } = require('react-native');
  let renderer;
  const props = { text: 'Back', accessibilityLabel: 'Back', onSelect: jest.fn() };
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Button, props)); });
    const find = () => renderer.root.findAll((node) => node.props.accessibilityLabel === 'Back' && typeof node.props.onPress === 'function')[0];
    const tileHeight = StyleSheet.flatten(find().props.style).minHeight;
    await TestRenderer.act(async () => renderer.update(React.createElement(Button, { ...props, variant: 'compact' })));
    expect(StyleSheet.flatten(find().props.style).minHeight).toBe(tileHeight);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
