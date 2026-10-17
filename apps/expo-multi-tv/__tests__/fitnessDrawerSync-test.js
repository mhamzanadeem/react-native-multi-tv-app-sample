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

it('opens the actual drawer controller once per Menu request and waits for native open status', async () => {
  mockStatus = 'closed';
  const openDrawer = jest.fn();
  const props = { navigation: { openDrawer, closeDrawer: jest.fn(), jumpTo: jest.fn() }, state: { index: 0, routes: [] }, descriptors: {} };
  const tree = () => React.createElement(MenuProvider, { initiallyOpen: false }, React.createElement(Probe), React.createElement(Drawer, props));
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(tree()); });
    await TestRenderer.act(async () => current.requestOpen());
    expect(openDrawer).toHaveBeenCalledTimes(1);
    expect(current.isOpen).toBe(false);
    mockStatus = 'open';
    await TestRenderer.act(async () => renderer.update(tree()));
    expect(current.isOpen).toBe(true);
    expect(openDrawer).toHaveBeenCalledTimes(1);
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});

it('shows Settings once in the main list and does not expose the AWS lab entry', async () => {
  mockStatus = 'open';
  const jumpTo = jest.fn();
  const props = { navigation: { openDrawer: jest.fn(), closeDrawer: jest.fn(), jumpTo }, state: { index: 0, routes: [{ name: 'Home' }] }, descriptors: {} };
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(MenuProvider, { initiallyOpen: false }, React.createElement(Drawer, props))); });
    const Button = require('../../../packages/shared-ui/src/components/FocusablePressable').default;
    const labels = renderer.root.findAllByType(Button.type ?? Button).map((node) => node.props.text);
    expect(labels).not.toContain('AWS demo lab');
    expect(labels.filter((label) => label === 'Settings')).toHaveLength(1);
    const settings = renderer.root.findAllByType(Button.type ?? Button).find((node) => node.props.text === 'Settings');
    await TestRenderer.act(async () => settings.props.onSelect());
    expect(jumpTo).toHaveBeenCalledWith('Settings');
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
