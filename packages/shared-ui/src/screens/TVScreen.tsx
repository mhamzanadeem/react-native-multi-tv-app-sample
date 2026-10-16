// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { scaledPixels } from '../hooks/useScale';
import { useMenuContext } from '../components/MenuContext';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Direction } from '@bam.tech/lrud';
import { safeZones } from '../theme';
import FocusablePressable from '../components/FocusablePressable';
import { fitnessColors as colors } from '../theme/fitness';
import { getOpenDrawerDirection } from '../utils/rtl';

export default function TVScreen() {
  const styles = tvStyles;
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const isFocused = useIsFocused();
  const isActive = isFocused && !isMenuOpen;
  const navigation = useNavigation();
  const [focusedIndex, setFocusedIndex] = useState(0);

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection() && focusedIndex === 0) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, focusedIndex, navigation],
  );

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={styles.container}>
        <View style={{ backgroundColor: colors.card, padding: scaledPixels(32), borderRadius: scaledPixels(20), maxWidth: '100%', borderWidth: scaledPixels(2), borderColor: colors.border }}>
          <Text accessibilityRole="header" style={styles.title}>TV</Text>
          <Text style={{ color: colors.textSecondary, fontSize: scaledPixels(24), lineHeight: scaledPixels(36), marginBottom: scaledPixels(24) }}>No live channels are configured. Open Menu to browse the available media sample or start a workout.</Text>
          <DefaultFocus>
            <FocusablePressable text="Open Menu" onSelect={() => { navigation.dispatch(DrawerActions.openDrawer()); toggleMenu(true); }} />
          </DefaultFocus>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const tvStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
      paddingVertical: scaledPixels(safeZones.titleSafe.vertical),
    },
    title: {
      fontSize: scaledPixels(32),
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: scaledPixels(20),
    },
  });
