import mitt from 'mitt';
import KeyEvent from 'react-native-keyevent';
import { SupportedKeys } from './SupportedKeys';
import { RemoteControlManagerInterface } from './RemoteControlManager.interface';

const KEY_CODE_MAPPING: Record<number, SupportedKeys> = {
  21: SupportedKeys.Left,
  22: SupportedKeys.Right,
  20: SupportedKeys.Down,
  19: SupportedKeys.Up,
  66: SupportedKeys.Enter,
  23: SupportedKeys.Enter,
  67: SupportedKeys.Back,
  85: SupportedKeys.PlayPause,
  89: SupportedKeys.Rewind,
  90: SupportedKeys.FastForward,
};

class RemoteControlManager implements RemoteControlManagerInterface {
  private eventEmitter = mitt<{ keyDown: SupportedKeys }>();
  private heldActionKeys = new Set<number>();

  constructor() {
    KeyEvent.onKeyDownListener(this.handleKeyDown);
    KeyEvent.onKeyUpListener(this.handleKeyUp);
  }

  private handleKeyDown = (keyEvent: { keyCode: number }): void => {
    const mappedKey = KEY_CODE_MAPPING[keyEvent.keyCode];
    if (mappedKey) {
      // Held Select/PlayPause/Back keys must not activate multiple steps or routes.
      // Directional repeats stay enabled for normal D-pad scrolling.
      if ([SupportedKeys.Enter, SupportedKeys.PlayPause, SupportedKeys.Back].includes(mappedKey)) {
        if (this.heldActionKeys.has(keyEvent.keyCode)) return;
        this.heldActionKeys.add(keyEvent.keyCode);
      }
      console.log(`Key pressed: ${mappedKey}`);
      this.eventEmitter.emit('keyDown', mappedKey);
    }
  };

  private handleKeyUp = (keyEvent: { keyCode: number }): void => {
    this.heldActionKeys.delete(keyEvent.keyCode);
  };

  addKeydownListener = (listener: (event: SupportedKeys) => void): ((event: SupportedKeys) => void) => {
    this.eventEmitter.on('keyDown', listener);
    console.log('Key listener added');
    return listener;
  };

  removeKeydownListener = (listener: (event: SupportedKeys) => void): void => {
    this.eventEmitter.off('keyDown', listener);
    console.log('Key listener removed');
  };

  emitKeyDown = (key: SupportedKeys): void => {
    this.eventEmitter.emit('keyDown', key);
  };

  cleanup = (): void => {
    KeyEvent.removeKeyDownListener();
    KeyEvent.removeKeyUpListener();
    this.heldActionKeys.clear();
  };
}

export default new RemoteControlManager();
