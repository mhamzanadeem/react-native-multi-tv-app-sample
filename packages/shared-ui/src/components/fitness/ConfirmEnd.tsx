import React, { useEffect } from 'react';
import { BackHandler, Modal, Platform, StyleSheet, View, Text } from 'react-native';
import { SpatialNavigationRoot, DefaultFocus } from 'react-tv-space-navigation';
import { FitnessButton, Actions, ui } from './FitnessPrimitives';
import { fitnessColors as c } from '../../theme/fitness';
import { scaledPixels as px } from '../../hooks/useScale';
import RemoteControlManager from '../../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../app/remote-control/SupportedKeys';
export default function ConfirmEnd({
  visible,
  cancel,
  confirm,
}: {
  visible: boolean;
  cancel: () => void;
  confirm: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    const token = RemoteControlManager.addKeydownListener((key) => {
      if (key === SupportedKeys.Back) cancel();
    });
    return () => {
      back.remove();
      RemoteControlManager.removeKeydownListener(token);
    };
  }, [visible, cancel]);
  if (!visible) return null;
  const panel = (
    <SpatialNavigationRoot isActive={visible}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.panel}>
          <Text accessibilityRole="header" style={ui.heading}>
            End this workout?
          </Text>
          <Text style={ui.body}>
            Your workout is paused. Ending now will leave this session unrecorded; previous progress stays saved.
          </Text>
          <Actions>
            <DefaultFocus>
              <FitnessButton text="Keep exercising" onSelect={cancel} />
            </DefaultFocus>
            <FitnessButton text="End workout" onSelect={confirm} />
          </Actions>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
  // Native Dialog windows bypass the existing MainActivity key-event forwarding.
  // An in-app overlay keeps TV D-pad/Select/Back in the same activity; web retains a focus-trapping modal.
  return Platform.OS === 'web' ? (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      {panel}
    </Modal>
  ) : (
    panel
  );
}
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.scrimDark,
  },
  panel: {
    width: '72%',
    backgroundColor: c.card,
    borderColor: c.primary,
    borderWidth: px(3),
    padding: px(48),
    borderRadius: px(24),
  },
});
