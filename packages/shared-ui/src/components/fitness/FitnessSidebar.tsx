import BrandLogo from '../BrandLogo';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpatialNavigationView } from 'react-tv-space-navigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels as px } from '../../hooks/useScale';
import { fitnessColors as c } from '../../theme/fitness';
const links: { label: string; screen: keyof DrawerParamList; icon: string }[] = [
  { label: 'Home', screen: 'Home', icon: 'home' },
  { label: 'Workouts', screen: 'Workouts', icon: 'strength' },
  { label: 'Progress', screen: 'Progress', icon: 'chart' },
  { label: 'Settings', screen: 'Settings', icon: 'settings' },
];
export default function FitnessSidebar({ title }: { title: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SpatialNavigationView direction="vertical" style={styles.sidebar}>
      <BrandLogo />
      {links.map(({ label, screen, icon }) => (
        <FocusablePressable
          key={screen}
          text={label}
          icon={icon}
          variant="compact"
          accessibilityLabel={label}
          accessibilityState={{ selected: title === label }}
          style={styles.link}
          onSelect={() => navigation.navigate('DrawerNavigator', { screen })}
        />
      ))}
      <View style={styles.footer}>
        <Text style={styles.caption}>MOVE WELL. YOUR PACE.</Text>
        <Text style={styles.caption}>On your TV. On your terms.</Text>
      </View>
    </SpatialNavigationView>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    width: px(280),
    paddingVertical: px(32),
    paddingHorizontal: px(20),
    backgroundColor: '#101114',
    gap: px(14),
    borderRightWidth: 1,
    borderRightColor: '#303640',
  },
  brand: { color: c.text, fontSize: px(24), fontWeight: '700', marginBottom: px(40), marginHorizontal: px(12) },
  mark: { color: '#8EAAFF' },
  link: {
    width: '100%',
    minWidth: 0,
    paddingHorizontal: px(20),
    minHeight: px(112),
    alignItems: 'flex-start',
    borderRadius: px(16),
    backgroundColor: '#1C1F26',
  },
  footer: { marginTop: px(100), paddingHorizontal: px(12), gap: px(20) },
  caption: { color: c.textTertiary, fontSize: px(18), lineHeight: px(28) },
});
