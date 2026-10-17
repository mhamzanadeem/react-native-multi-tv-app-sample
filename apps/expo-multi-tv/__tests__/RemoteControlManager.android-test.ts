import KeyEvent from 'react-native-keyevent';
import RemoteControlManager from '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager.android';
import { SupportedKeys } from '../../../packages/shared-ui/src/app/remote-control/SupportedKeys';

jest.mock('react-native-keyevent', () => ({
  __esModule: true,
  default: {
    onKeyDownListener: jest.fn(),
    onKeyUpListener: jest.fn(),
    removeKeyDownListener: jest.fn(),
    removeKeyUpListener: jest.fn(),
  },
}));

const keyEventMock = KeyEvent as jest.Mocked<typeof KeyEvent>;
const onKeyDown = keyEventMock.onKeyDownListener.mock.calls[0][0];

describe('RemoteControlManager.android', () => {
  const listener = jest.fn();

  beforeAll(() => {
    RemoteControlManager.addKeydownListener(listener);
  });

  beforeEach(() => {
    listener.mockClear();
  });

  afterAll(() => {
    RemoteControlManager.removeKeydownListener(listener);
  });

  it('emits directional keys on key down', () => {
    onKeyDown({ keyCode: 22 });

    expect(listener).toHaveBeenCalledWith(SupportedKeys.Right);
  });

  it.each([23, 66])('emits Enter for key code %i on key down', (keyCode) => {
    onKeyDown({ keyCode });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(SupportedKeys.Enter);
  });
});

// Media keys must remain separate from D-pad focus navigation.
describe('Android media and Back keys', () => {
  it.each([
    [67, SupportedKeys.Back],
    [85, SupportedKeys.PlayPause],
    [89, SupportedKeys.Rewind],
    [90, SupportedKeys.FastForward],
  ])('maps key code %i to %s', (keyCode, expected) => {
    const handler = jest.fn();
    const token = RemoteControlManager.addKeydownListener(handler);
    onKeyDown({ keyCode });
    expect(handler).toHaveBeenCalledWith(expected);
    RemoteControlManager.removeKeydownListener(token);
    handler.mockClear();
    onKeyDown({ keyCode });
    expect(handler).not.toHaveBeenCalled();
  });
});
it('activates once per held Select key while retaining directional repeats', () => {
  const onKeyUp = keyEventMock.onKeyUpListener.mock.calls[0][0];
  const callback = jest.fn();
  RemoteControlManager.addKeydownListener(callback);
  onKeyUp({ keyCode: 23 });
  onKeyDown({ keyCode: 23 });
  onKeyDown({ keyCode: 23 });
  expect(callback).toHaveBeenCalledTimes(1);
  onKeyUp({ keyCode: 23 });
  onKeyDown({ keyCode: 23 });
  expect(callback).toHaveBeenCalledTimes(2);
  onKeyDown({ keyCode: 22 });
  onKeyDown({ keyCode: 22 });
  expect(callback).toHaveBeenCalledTimes(4);
  RemoteControlManager.removeKeydownListener(callback);
  onKeyUp({ keyCode: 23 });
});

it('does not activate the newly opened drawer on Select release', () => {
  const up = keyEventMock.onKeyUpListener.mock.calls[0][0];
  const actions: string[] = [];
  let drawerOpen = false;
  const handler = () => {
    actions.push(drawerOpen ? 'close' : 'open');
    drawerOpen = !drawerOpen;
  };
  const token = RemoteControlManager.addKeydownListener(handler);
  try {
    up({ keyCode: 23 });
    onKeyDown({ keyCode: 23 });
    onKeyDown({ keyCode: 23 });
    up({ keyCode: 23 });
    expect(actions).toEqual(['open']);
    expect(drawerOpen).toBe(true);
    onKeyDown({ keyCode: 23 });
    up({ keyCode: 23 });
    expect(actions).toEqual(['open', 'close']);
  } finally {
    RemoteControlManager.removeKeydownListener(token);
    up({ keyCode: 23 });
  }
});
