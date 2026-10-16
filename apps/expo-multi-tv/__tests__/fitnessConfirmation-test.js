const React = require('react');
const TestRenderer = require('react-test-renderer');
const { BackHandler, Modal, Platform } = require('react-native');
const Confirm = require('../../../packages/shared-ui/src/components/fitness/ConfirmEnd').default;
jest.mock('react-tv-space-navigation', () => {
  const React = require('react');
  const wrapper = ({ children }) => React.createElement('View', null, children);
  return {
    SpatialNavigationRoot: wrapper,
    SpatialNavigationView: wrapper,
    DefaultFocus: wrapper,
    SpatialNavigationFocusableView: ({ children }) => children({ isFocused: false }),
  };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('keeps native confirmation in the activity and cleans up its hardware Back handler', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  const cancel = jest.fn();
  const remove = jest.fn();
  let handler;
  let renderer;
  const listener = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, callback) => {
    handler = callback;
    return { remove };
  });
  try {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Confirm, { visible: true, cancel, confirm: jest.fn() }));
    });
    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
    expect(handler()).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  } finally {
    listener.mockRestore();
    if (descriptor) Object.defineProperty(Platform, 'OS', descriptor);
    else delete Platform.OS;
  }
});
