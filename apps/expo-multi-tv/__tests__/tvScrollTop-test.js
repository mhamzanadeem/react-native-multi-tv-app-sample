const React = require('react');
const TestRenderer = require('react-test-renderer');
const mockScrollTo = jest.fn();
const mockDispatch = jest.fn();
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => ({
  __esModule: true,
  default: require('react').forwardRef(({ children, ...props }, ref) => {
    require('react').useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return require('react').createElement('Viewport', props, children);
  }),
}));
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
    SpatialNavigationView: ({ children, ...props }) => React.createElement('FocusGroup', props, children),
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

const { focusScrollTarget } = require('../../../packages/shared-ui/src/components/fitness/FocusScroll');
it('keeps the viewport fixed when moving Menu to Start Workout in the same visible row', () => {
  expect(focusScrollTarget(220, 170, 0, 600, 24)).toBeNull();
  expect(focusScrollTarget(220, 170, 0, 600, 24)).toBeNull();
});
it('reveals an offscreen lower row with the minimum vertical movement', () => {
  expect(focusScrollTarget(650, 170, 0, 600, 24)).toBe(244);
  expect(focusScrollTarget(650, 170, 244, 600, 24)).toBeNull();
});
it('reveals an upper row and waits for valid initial viewport measurements', () => {
  expect(focusScrollTarget(220, 170, 500, 600, 24)).toBe(196);
  expect(focusScrollTarget(220, 170, 0, 0, 24)).toBeNull();
});

it('jumps to the bottom, changes to Back to top, and returns to the beginning', async () => {
  const { FitnessButton } = require('../../../packages/shared-ui/src/components/fitness/FitnessPrimitives');
  let renderer;
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Screen, { title: 'Long page', eyebrow: 'Test' }, React.createElement('View'))); });
    const shortcut = () => renderer.root.findAllByType(FitnessButton).find((node) => node.props.testID === 'scroll-shortcut');
    expect(shortcut().props.disabled).toBe(true);
    const viewport = renderer.root.findByType('Viewport');
    await TestRenderer.act(async () => {
      viewport.props.onLayout({ nativeEvent: { layout: { height: 600 } } });
      viewport.props.onContentSizeChange(1000, 2000);
    });
    expect(shortcut().props.disabled).toBe(false);
    expect(shortcut().props.text).toBe('Jump to bottom');
    await TestRenderer.act(async () => shortcut().props.onSelect());
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 1400, animated: true });
    expect(shortcut().props.text).toBe('Back to top');
    await TestRenderer.act(async () => shortcut().props.onSelect());
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
    expect(shortcut().props.text).toBe('Jump to bottom');
    await TestRenderer.act(async () => viewport.props.onScroll({ nativeEvent: { contentOffset: { y: 1400 } } }));
    expect(shortcut().props.text).toBe('Back to top');
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});

it('clears remembered content focus when returning to Back, without changing the screen draft', async () => {
  let renderer;
  let mounts = 0;
  function ContentProbe() {
    React.useEffect(() => { mounts++; }, []);
    return React.createElement('ExerciseDraft', { selectedIds: ['march'] });
  }
  try {
    await TestRenderer.act(async () => { renderer = TestRenderer.create(React.createElement(Screen, { title: 'Avoid exercises', eyebrow: 'Step 9', backAction: jest.fn() }, React.createElement(ContentProbe))); });
    expect(mounts).toBe(1);
    const back = renderer.root.findAllByType('FocusNode').find((node) => typeof node.props.onFocus === 'function');
    await TestRenderer.act(async () => back.props.onFocus());
    expect(mounts).toBe(2);
    expect(renderer.root.findByType('ExerciseDraft').props.selectedIds).toEqual(['march']);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
  } finally { if (renderer) await TestRenderer.act(async () => renderer.unmount()); }
});
