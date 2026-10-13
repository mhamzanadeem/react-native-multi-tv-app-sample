import { Directions, SpatialNavigation } from 'react-tv-space-navigation';
import { SupportedKeys } from './remote-control/SupportedKeys';
import RemoteControlManager from './remote-control/RemoteControlManager';
import type { KeydownListener } from './remote-control/RemoteControlManager.interface';
import type { Direction } from '@bam.tech/lrud';

SpatialNavigation.configureRemoteControl({
  remoteControlSubscriber: (callback) => {
    console.log("Configure remote control");

    const mapping: Record<SupportedKeys, Direction | null> = {
      [SupportedKeys.Right]: Directions.RIGHT,
      [SupportedKeys.Left]: Directions.LEFT,
      [SupportedKeys.Up]: Directions.UP,
      [SupportedKeys.Down]: Directions.DOWN,
      [SupportedKeys.Enter]: Directions.ENTER,
      [SupportedKeys.Back]: null,
      [SupportedKeys.PlayPause]: null,
      [SupportedKeys.FastForward]: null,
      [SupportedKeys.Rewind]: null,
    };

    const remoteControlListener = (keyEvent: SupportedKeys) => {
      callback(mapping[keyEvent]);
    };

    return RemoteControlManager.addKeydownListener(remoteControlListener);
  },

  remoteControlUnsubscriber: (remoteControlListener: KeydownListener) => {
    RemoteControlManager.removeKeydownListener(remoteControlListener);
  },
});
