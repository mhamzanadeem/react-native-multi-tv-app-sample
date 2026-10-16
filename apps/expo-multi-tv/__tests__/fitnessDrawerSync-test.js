const React = require('react');
const TestRenderer = require('react-test-renderer');
const { MenuProvider, useMenuContext } = require('../../../packages/shared-ui/src/components/MenuContext');
const Drawer = require('../../../packages/shared-ui/src/components/CustomDrawerContent').default;
let mockStatus = 'open';
let current;
jest.mock('@react-navigation/drawer', () => ({
  useDrawerStatus: () => mockStatus,
  DrawerContentScrollView: ({ children }) => require('react').createElement('View', null, children),
}));
jest.mock('react-tv-space-navigation', () => {
  const React = require('react');
  const wrapper = ({ children }) => React.createElement('View', null, children);
  return {
    SpatialNavigationRoot: wrapper,
    DefaultFocus: wrapper,
    SpatialNavigationFocusableView: ({ children }) => children({ isFocused: false }),
  };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Probe() {
  current = useMenuContext();
  return React.createElement('View');
}
it('synchronizes native drawer close even when Home has never mounted', async () => {
  const props = {
    navigation: { jumpTo: jest.fn(), closeDrawer: jest.fn() },
    state: { index: 0, routes: [] },
    descriptors: {},
  };
  const tree = () =>
    React.createElement(
      MenuProvider,
      { initiallyOpen: false },
      React.createElement(Probe),
      React.createElement(Drawer, props),
    );
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(tree());
  });
  expect(current.isOpen).toBe(true);
  mockStatus = 'closed';
  await TestRenderer.act(async () => {
    renderer.update(tree());
  });
  expect(current.isOpen).toBe(false);
  await TestRenderer.act(async () => renderer.unmount());
});
