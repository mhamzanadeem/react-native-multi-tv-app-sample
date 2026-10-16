jest.mock('react-native', () => ({ TVEventHandler: { addListener: jest.fn(() => ({ remove: jest.fn() })) } }));
it('handles tvOS Play/Pause once and leaves Menu to the native BackHandler', () => {
  const { TVEventHandler } = require('react-native');
  const manager = require('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager.ios').default;
  const { SupportedKeys } = require('../../../packages/shared-ui/src/app/remote-control/SupportedKeys');
  const listener = jest.fn();
  manager.addKeydownListener(listener);
  const handle = TVEventHandler.addListener.mock.calls[0][0];
  handle({ eventType: 'playPause', eventKeyAction: 0 });
  handle({ eventType: 'playPause', eventKeyAction: 1 });
  handle({ eventType: 'menu', eventKeyAction: 0 });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith(SupportedKeys.PlayPause);
  manager.removeKeydownListener(listener);
  manager.cleanup();
  expect(TVEventHandler.addListener.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
});
