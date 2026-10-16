import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Image,
  View,
  Text,
  StyleSheet,
  PressableProps,
  ViewStyle,
  StyleProp,
  type ImageSourcePropType,
} from 'react-native';
import { scaledPixels } from '../hooks/useScale';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { colors } from '../theme/colors';
import { usesRemoteSelectionOnly } from '../utils/tvSelection';
import { useFocusReveal } from './fitness/FocusScroll';
import { resolveCardArtwork } from './tvCardArtwork';

interface CustomPressableProps extends PressableProps {
  text: string;
  description?: string;
  icon?: string;
  variant?: 'tile' | 'compact';
  backgroundImage?: ImageSourcePropType;
  onSelect: () => void;
  onSpatialFocus?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FocusSurface({
  isFocused,
  text,
  description,
  icon,
  variant = 'tile',
  backgroundImage,
  onSelect,
  style,
  ...props
}: CustomPressableProps & { isFocused: boolean }) {
  const reveal = useFocusReveal(isFocused);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let current = true;
    const animate = (reduceMotion: boolean) => {
      if (!current) return;
      Animated.timing(scale, {
        toValue: isFocused && !props.disabled && !reduceMotion ? 1.04 : 1,
        duration: reduceMotion ? 0 : 140,
        useNativeDriver: true,
      }).start();
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(animate)
      .catch(() => animate(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', animate);
    return () => {
      current = false;
      subscription.remove();
      scale.stopAnimation();
    };
  }, [isFocused, props.disabled, scale]);
  return (
    <AnimatedPressable
      ref={reveal.ref}
      onLayout={reveal.onLayout}
      accessibilityRole="button"
      focusable={false}
      {...props}
      style={[
        styles.watchButton,
        variant === 'compact' && styles.compact,
        style,
        props.accessibilityState?.selected && { backgroundColor: colors.cardElevated, borderColor: 'transparent' },
        isFocused && !props.disabled && styles.watchButtonFocused,
        props.disabled && styles.disabled,
        { transform: [{ scale }] },
      ]}
      onPress={(event) => {
        if (usesRemoteSelectionOnly()) return;
        event.stopPropagation?.();
        if (!props.disabled) onSelect();
      }}>
      <View
        pointerEvents="none"
        style={styles.artLayer}
        accessible={false}
        importantForAccessibility="no-hide-descendants">
        {backgroundImage && (
          <Image source={backgroundImage} resizeMode="cover" style={styles.photo} accessible={false} />
        )}
        <Image
          source={resolveCardArtwork(props.accessibilityLabel ?? text, icon)}
          resizeMode="contain"
          style={[styles.ghostArt, variant === 'compact' && styles.compactGhost]}
          accessible={false}
        />
        <View style={styles.rim} />
        <View style={[styles.accent, isFocused && !props.disabled && styles.accentFocused]} />
      </View>
      <Image
        source={resolveCardArtwork(props.accessibilityLabel ?? text, icon)}
        resizeMode="contain"
        style={[styles.cardIcon, variant === 'compact' && styles.compactIcon]}
        accessible={false}
        importantForAccessibility="no"
      />
      {props.accessibilityState?.selected && (
        <View pointerEvents="none" accessible={false} style={styles.selectedBadge}>
          <Text style={styles.selectedMark}>{'\u2713'}</Text>
        </View>
      )}
      <View pointerEvents="none" style={[styles.copy, variant === 'compact' && styles.compactCopy]}>
        <Text
          numberOfLines={1}
          style={[
            styles.watchButtonText,
            variant === 'compact' && styles.compactText,
            isFocused && !props.disabled && styles.watchButtonTextFocused,
          ]}>
          {text}
        </Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </AnimatedPressable>
  );
}

const FocusablePressable = React.memo(({ text, onSelect, onSpatialFocus, style, ...props }: CustomPressableProps) => {
  return (
    <SpatialNavigationFocusableView
      onFocus={onSpatialFocus}
      onSelect={() => {
        if (!props.disabled) onSelect();
      }}>
      {({ isFocused, isRootActive }) => (
        <FocusSurface
          {...props}
          text={text}
          onSelect={onSelect}
          style={style}
          isFocused={isFocused && isRootActive !== false}
        />
      )}
    </SpatialNavigationFocusableView>
  );
});

const styles = StyleSheet.create({
  watchButton: {
    backgroundColor: colors.cardElevated,
    paddingVertical: scaledPixels(20),
    paddingHorizontal: scaledPixels(20),
    borderRadius: scaledPixels(18),
    borderWidth: scaledPixels(3),
    borderColor: 'transparent',
    alignItems: 'flex-start',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    width: 'auto',
    minWidth: scaledPixels(280),
    minHeight: scaledPixels(112),
    maxWidth: '100%',
  },
  compact: {},
  artLayer: { ...StyleSheet.absoluteFillObject, borderRadius: scaledPixels(15), overflow: 'hidden' },
  photo: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  ghostArt: {
    position: 'absolute',
    width: scaledPixels(180),
    height: scaledPixels(180),
    end: scaledPixels(-30),
    top: scaledPixels(-15),
    opacity: 0.12,
  },
  compactGhost: { width: scaledPixels(100), height: scaledPixels(100), top: scaledPixels(-12), opacity: 0.08 },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(143, 174, 255, 0.22)',
    borderRadius: scaledPixels(15),
  },
  accent: {
    position: 'absolute',
    top: 0,
    start: scaledPixels(20),
    width: scaledPixels(40),
    height: scaledPixels(3),
    backgroundColor: '#718EFF',
    borderRadius: scaledPixels(2),
  },
  accentFocused: { width: scaledPixels(72), backgroundColor: '#9CEEFF' },
  cardIcon: { position: 'absolute', start: scaledPixels(16), width: scaledPixels(44), height: scaledPixels(44) },
  compactIcon: {
    position: 'absolute',
    start: scaledPixels(16),
    width: scaledPixels(44),
    height: scaledPixels(44),
    marginBottom: 0,
  },
  copy: { paddingStart: scaledPixels(64), paddingEnd: scaledPixels(24), flexShrink: 1 },
  compactCopy: {},
  selectedBadge: {
    position: 'absolute',
    top: scaledPixels(12),
    end: scaledPixels(12),
    width: scaledPixels(28),
    height: scaledPixels(28),
    borderRadius: scaledPixels(7),
    backgroundColor: '#15243F',
    borderWidth: 1,
    borderColor: '#93B8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMark: { color: '#D7F1FF', fontSize: scaledPixels(18), lineHeight: scaledPixels(22), fontWeight: '700' },
  description: {
    color: '#D3DBEB',
    fontSize: scaledPixels(20),
    lineHeight: scaledPixels(28),
    marginTop: scaledPixels(12),
  },
  disabled: { opacity: 0.5 },
  watchButtonFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: '#9CEEFF',

    // Shadow for depth
    shadowColor: '#6B8FFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.85,
    shadowRadius: scaledPixels(22),
    elevation: 12,
  },
  watchButtonText: {
    color: colors.text,
    fontSize: scaledPixels(24),
    lineHeight: scaledPixels(32),
    flexShrink: 1,
    fontWeight: 'bold',
    textAlign: 'left',
    minHeight: 0,
  },
  watchButtonTextFocused: {
    color: colors.textOnPrimary,
    fontSize: scaledPixels(24),
    fontWeight: 'bold',
  },
  compactText: { minHeight: 0 },
});

export default FocusablePressable;
