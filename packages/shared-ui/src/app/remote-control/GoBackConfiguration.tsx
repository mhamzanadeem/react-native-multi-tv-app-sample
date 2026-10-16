import React, { useEffect, useCallback } from 'react';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import RemoteControlManager from './RemoteControlManager';
import { SupportedKeys } from './SupportedKeys';
import { useMenuContext } from '../../components/MenuContext';

export const GoBackConfiguration: React.FC = () => {
  const navigation = useNavigation();
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();

  const handleBackPress = useCallback(() => {
    if (isMenuOpen) {
      navigation.dispatch(DrawerActions.closeDrawer());
      toggleMenu(false);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, isMenuOpen, toggleMenu]);

  useEffect(() => {
    const remoteControlListener = (pressedKey: SupportedKeys) => {
      if (pressedKey === SupportedKeys.Back) {
        handleBackPress();
      }
    };

    RemoteControlManager.addKeydownListener(remoteControlListener);
    return () => RemoteControlManager.removeKeydownListener(remoteControlListener);
  }, [handleBackPress]);

  return null;
};
