import React from 'react';
import { Image, Text, View } from 'react-native';
import { scaledPixels as px } from '../hooks/useScale';

export default function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="FormFit TV"
      style={{ flexDirection: 'row', alignItems: 'center', gap: px(large ? 20 : 12) }}>
      <Image
        source={require('../assets/branding/formfit-logo.png')}
        accessible={false}
        style={{ width: px(large ? 92 : 52), height: px(large ? 92 : 52), borderRadius: px(large ? 16 : 10) }}
      />
      <Text style={{ color: '#F5F6F8', fontSize: px(large ? 44 : 26), fontWeight: '700' }}>
        FormFit <Text style={{ color: '#8EAAFF' }}>TV</Text>
      </Text>
    </View>
  );
}
