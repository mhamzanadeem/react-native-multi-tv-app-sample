import React from 'react';
import { Image, Text, View } from 'react-native';
import { scaledPixels as px } from '../hooks/useScale';

export default function BrandLogo() {
  return (
    <View
      accessible
      accessibilityLabel="FormFit TV"
      style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
      <Image
        source={require('../assets/branding/formfit-logo.png')}
        accessible={false}
        style={{ width: px(52), height: px(52), borderRadius: px(10) }}
      />
      <Text style={{ color: '#ECF3FF', fontSize: px(26), fontWeight: '700' }}>
        FormFit <Text style={{ color: '#A2BAFF' }}>TV</Text>
      </Text>
    </View>
  );
}
