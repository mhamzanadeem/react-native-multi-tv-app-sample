jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
it('handles browser remote keys without repeated actions or default page scrolling', () => {
  const descriptor = Object.getOwnPropertyDescriptor(global, 'window');
  let handle;
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      addEventListener: (_, callback) => {
        handle = callback;
      },
    },
  });
  try {
    const manager = require('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager.ts').default;
    const { SupportedKeys } = require('../../../packages/shared-ui/src/app/remote-control/SupportedKeys');
    const callback = jest.fn();
    manager.addKeydownListener(callback);
    const event = (code, repeat = false) => ({ code, key: code, repeat, preventDefault: jest.fn() });
    const enter = event('Enter');
    handle(enter);
    handle(event('Enter', true));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(SupportedKeys.Enter);
    expect(enter.preventDefault).toHaveBeenCalledTimes(1);
    handle(event('ArrowRight'));
    handle(event('ArrowRight', true));
    expect(callback).toHaveBeenCalledTimes(3);
    const unknown = event('KeyQ');
    handle(unknown);
    expect(unknown.preventDefault).not.toHaveBeenCalled();
    manager.removeKeydownListener(callback);
  } finally {
    if (descriptor) Object.defineProperty(global, 'window', descriptor);
    else delete global.window;
  }
});
