import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { scaledPixels as px } from '../../hooks/useScale';
export default function WorkoutHero({
  children,
  wide = false,
  immersive = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
  immersive?: boolean;
}) {
  return (
    <ImageBackground
      source={require('../../assets/fitness/workout-hero.png')}
      resizeMode="cover"
      style={[styles.hero, immersive && { minHeight: px(650) }]}
      imageStyle={styles.image}>
      <View style={styles.scrim}>
        <View style={[styles.copy, wide && { width: '100%' }, immersive && { width: '70%' }]}>{children}</View>
      </View>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  hero: {
    minHeight: px(420),
    backgroundColor: '#1C1F26',
    borderRadius: px(24),
    marginBottom: px(28),
    overflow: 'hidden',
  },
  image: { borderRadius: px(24) },
  scrim: { flex: 1, padding: px(40), backgroundColor: 'rgba(16, 17, 20, 0.35)', justifyContent: 'center' },
  copy: { width: '58%', padding: px(20), borderRadius: px(20), backgroundColor: 'rgba(16, 17, 20, 0.82)' },
});
