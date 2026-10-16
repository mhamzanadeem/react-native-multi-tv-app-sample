const React = require('react');
const TestRenderer = require('react-test-renderer');
const mockScrollTo = jest.fn();
const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ dispatch: mockDispatch, navigate: jest.fn() }),
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
}));
jest.mock('../../../packages/shared-ui/src/hooks/FormFitContext', () => ({
  useFormFit: () => ({ ready: true, storageWarning: null }),
}));
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({ isOpen: false, toggleMenu: jest.fn() }),
}));
jest.mock('react-tv-space-navigation', () => {
  const React = require('react');
  return {
    SpatialNavigationRoot: ({ children, ...props }) => React.createElement('TVRoot', props, children),
    SpatialNavigationView: ({ children }) => React.createElement('View', null, children),
    SpatialNavigationScrollView: React.forwardRef(({ children }, ref) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement('View', null, children);
    }),
    SpatialNavigationFocusableView: ({ children, ...props }) => React.createElement('FocusNode', props, children({ isFocused: false })),
  };
});
const Screen = require('../../../packages/shared-ui/src/components/fitness/FitnessScreen').default;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());
it.each([{ backAction: jest.fn() }, { drawer: true }])('restores the full top content when focus reaches the header: %j', async (props) => {
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Screen, { title: 'Test', eyebrow: 'Test', ...props }, React.createElement('View'))); });
    const header = renderer.root.findAllByType('FocusNode').find((node) => typeof node.props.onFocus === 'function');
    expect(header).toBeDefined();
    await TestRenderer.act(async () => header.props.onFocus());
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    expect(mockDispatch).not.toHaveBeenCalled();
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
it('scrolls to the top at the Up boundary without a header and leaves other directions alone', async () => {
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Screen, { title: 'Completion', eyebrow: 'Done' }, React.createElement('View'))); });
    const edge = renderer.root.findByType('TVRoot').props.onDirectionHandledWithoutMovement;
    edge('down'); edge('right'); edge('left');
    expect(mockScrollTo).not.toHaveBeenCalled();
    edge('up');
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
