const React = require('react');
const TestRenderer = require('react-test-renderer');
const { MenuProvider, useMenuContext } = require('../../../packages/shared-ui/src/components/MenuContext');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let current;
function Probe() {
  current = useMenuContext();
  return React.createElement('View');
}
it('preserves the legacy/Vega open-drawer default while allowing FormFit to start closed', async () => {
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(MenuProvider, null, React.createElement(Probe)));
  });
  expect(current.isOpen).toBe(true);
  await TestRenderer.act(async () => renderer.unmount());
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(MenuProvider, { initiallyOpen: false }, React.createElement(Probe)),
    );
  });
  expect(current.isOpen).toBe(false);
  await TestRenderer.act(async () => current.toggleMenu(true));
  expect(current.isOpen).toBe(true);
  await TestRenderer.act(async () => renderer.unmount());
});
