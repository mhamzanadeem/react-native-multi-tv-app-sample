import { SpatialNavigation, Directions } from 'react-tv-space-navigation';
import RemoteControlManager from '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../../packages/shared-ui/src/app/remote-control/SupportedKeys';
import '../../../packages/shared-ui/src/app/configureRemoteControl';

jest.mock('react-native-keyevent', () => ({ onKeyDownListener: jest.fn(), removeKeyDownListener: jest.fn() }));
jest.mock('react-tv-space-navigation', () => ({
  Directions: jest.requireActual('@bam.tech/lrud').Directions,
  SpatialNavigation: { configureRemoteControl: jest.fn() },
}));

it('routes D-pad keys to focus and media/Back keys to null, and removes the listener', () => {
  const configure = jest.mocked(SpatialNavigation.configureRemoteControl);
  const options = configure.mock.calls[0][0];
  const callback = jest.fn();
  const token = options.remoteControlSubscriber(callback);
  const pairs = [
    [SupportedKeys.Up, Directions.UP], [SupportedKeys.Down, Directions.DOWN],
    [SupportedKeys.Left, Directions.LEFT], [SupportedKeys.Right, Directions.RIGHT],
    [SupportedKeys.Enter, Directions.ENTER], [SupportedKeys.Back, null],
    [SupportedKeys.PlayPause, null], [SupportedKeys.FastForward, null], [SupportedKeys.Rewind, null],
  ] as const;
  for (const [key, expected] of pairs) {
    callback.mockClear();
    RemoteControlManager.emitKeyDown(key);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expected);
  }
  options.remoteControlUnsubscriber(token);
  callback.mockClear();
  RemoteControlManager.emitKeyDown(SupportedKeys.Enter);
  expect(callback).not.toHaveBeenCalled();
});
