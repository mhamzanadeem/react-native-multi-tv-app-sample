import BrandLogo from './BrandLogo';
import { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { DefaultFocus, SpatialNavigationRoot } from 'react-tv-space-navigation';
import type { Direction } from '@bam.tech/lrud';
import type { DrawerParamList } from '../navigation/types';
import { useMenuContext } from './MenuContext';
import FocusablePressable from './FocusablePressable';
import { scaledPixels as px } from '../hooks/useScale';
import { safeZones } from '../theme';
import { fitnessColors as c } from '../theme/fitness';
import { getCloseDrawerDirection } from '../utils/rtl';

const items: { name: keyof DrawerParamList; label: string; icon: string }[] = [
  { name: 'Home', label: 'Home', icon: 'home' },
  { name: 'Workouts', label: 'Workouts', icon: 'strength' },
  { name: 'Progress', label: 'Progress', icon: 'chart' },
  { name: 'Media', label: 'Media sample', icon: 'play' },
  { name: 'Explore', label: 'Explore sample', icon: 'grid' },
  { name: 'TV', label: 'TV sample', icon: 'home' },
  { name: 'Settings', label: 'Settings', icon: 'settings' },
];
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const navigation = props.navigation;
  const { isOpen, toggleMenu, openRequestId } = useMenuContext();
  const status = useDrawerStatus();
  const handledOpenRequest = useRef(0);
  useEffect(() => {
    if (openRequestId > handledOpenRequest.current) {
      handledOpenRequest.current = openRequestId;
      navigation.openDrawer();
    }
  }, [openRequestId, navigation]);
  useEffect(() => toggleMenu(status === 'open'), [status, toggleMenu]);
  const closeAtEdge = useCallback(
    (direction: Direction) => {
      if (direction === getCloseDrawerDirection()) {
        navigation.closeDrawer();
        toggleMenu(false);
      }
    },
    [navigation, toggleMenu],
  );
  const select = (name: keyof DrawerParamList) => {
    navigation.jumpTo(name);
    navigation.closeDrawer();
    toggleMenu(false);
  };
  return (
    <SpatialNavigationRoot isActive={isOpen} onDirectionHandledWithoutMovement={closeAtEdge}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FocusablePressable
            text="Close menu"
            icon="menu"
            accessibilityLabel="Close menu"
            style={styles.link}
            onSelect={() => {
              navigation.closeDrawer();
              toggleMenu(false);
            }}
          />
          <BrandLogo />
          <Text style={styles.caption}>Move well. Your pace.</Text>
        </View>
        <DrawerContentScrollView
          {...props}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: px(16),
            paddingBottom: px(20),
            ...(Platform.OS === 'ios' && Platform.isTV && { paddingStart: px(16), paddingEnd: px(16), paddingTop: 0 }),
          }}>
          {items.map((item, index) => {
            const link = (
              <FocusablePressable
                text={item.label}
                icon={item.icon}
                variant="compact"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: props.state.routes[props.state.index]?.name === item.name }}
                style={styles.link}
                onSelect={() => select(item.name)}
              />
            );
            return index === 0 ? (
              <DefaultFocus key={item.name}>{link}</DefaultFocus>
            ) : (
              <View key={item.name}>{link}</View>
            );
          })}
        </DrawerContentScrollView>
      </View>
    </SpatialNavigationRoot>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17191F',
    borderEndWidth: 1,
    borderEndColor: '#414854',
    paddingTop: px(safeZones.titleSafe.vertical),
  },
  header: { paddingHorizontal: px(28), paddingBottom: px(28), gap: px(10) },
  brand: { color: c.text, fontSize: px(32), fontWeight: '700' },
  accent: { color: c.primary },
  caption: {
    color: c.textSecondary,
    fontSize: px(24),
    lineHeight: px(34),
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  link: { width: '100%', minWidth: 0, minHeight: px(84), marginBottom: px(12), backgroundColor: '#282D36' },
});
