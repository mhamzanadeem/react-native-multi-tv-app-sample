import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Platform,
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
  cardLayout?: 'inline' | 'poster';
  description?: string;
  actionLabel?: string;
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
  cardLayout = 'inline',
  text,
  description,
  actionLabel,
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
        toValue: isFocused && !props.disabled && !reduceMotion ? 1.025 : 1,
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
        <View style={[styles.sheen, isFocused && !props.disabled && styles.sheenFocused]} />
        <View style={[styles.accent, isFocused && !props.disabled && styles.accentFocused]} />
      </View>
      {icon === 'menu' || icon === 'scroll-up' || icon === 'scroll-down' ? (
        <Text
          accessible={false}
          style={[
            styles.cardIcon,
            { color: '#F5F6F8', fontSize: scaledPixels(36), lineHeight: scaledPixels(44), textAlign: 'center' },
            variant === 'compact' && styles.compactIcon,
            cardLayout === 'poster' && styles.posterIcon,
          ]}>
          {icon === 'menu' ? '\u2630' : icon === 'scroll-up' ? '\u2191' : '\u2193'}
        </Text>
      ) : (
        <Image
          source={resolveCardArtwork(props.accessibilityLabel ?? text, icon)}
          resizeMode="contain"
          style={[
            styles.cardIcon,
            variant === 'compact' && styles.compactIcon,
            cardLayout === 'poster' && styles.posterIcon,
          ]}
          accessible={false}
          importantForAccessibility="no"
        />
      )}
      {props.accessibilityState?.selected && (
        <View pointerEvents="none" accessible={false} style={styles.selectedBadge}>
          <Text style={styles.selectedMark}>{'\u2713'}</Text>
        </View>
      )}
      <View
        pointerEvents="none"
        style={[
          styles.copy,
          variant === 'compact' && styles.compactCopy,
          cardLayout === 'poster' && styles.posterCopy,
        ]}>
        <Text
          numberOfLines={1}
          style={[
            styles.watchButtonText,
            variant === 'compact' && styles.compactText,
            isFocused && !props.disabled && styles.watchButtonTextFocused,
          ]}>
          {text}
        </Text>
        {description && (
          <Text style={[styles.description, isFocused && !props.disabled && { color: colors.text }]}>
            {description}
          </Text>
        )}
        {actionLabel && (
          <View style={styles.toggleAction}>
            <Text style={styles.toggleActionText}>{actionLabel}</Text>
          </View>
        )}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: scaledPixels(5) },
    shadowOpacity: 0.2,
    shadowRadius: scaledPixels(10),
    elevation: 2,
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
    opacity: 0.06,
  },
  compactGhost: { width: scaledPixels(100), height: scaledPixels(100), top: scaledPixels(-12), opacity: 0.04 },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(183, 191, 204, 0.14)',
    borderRadius: scaledPixels(15),
  },
  sheen: {
    position: 'absolute',
    top: 0,
    start: scaledPixels(18),
    end: scaledPixels(18),
    height: scaledPixels(1),
    backgroundColor: 'rgba(245, 246, 248, 0.12)',
  },
  sheenFocused: { backgroundColor: colors.focusBorder },
  accent: {
    position: 'absolute',
    top: 0,
    start: scaledPixels(20),
    width: scaledPixels(40),
    height: scaledPixels(3),
    backgroundColor: '#414854',
    borderRadius: scaledPixels(2),
  },
  accentFocused: { width: scaledPixels(72), backgroundColor: '#B8D2FF' },
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
  posterIcon: {
    position: 'relative',
    start: 0,
    marginBottom: scaledPixels(16),
    width: scaledPixels(48),
    height: scaledPixels(48),
  },
  posterCopy: { paddingStart: 0, paddingEnd: 0, width: '100%' },
  selectedBadge: {
    position: 'absolute',
    top: scaledPixels(12),
    end: scaledPixels(12),
    width: scaledPixels(28),
    height: scaledPixels(28),
    borderRadius: scaledPixels(7),
    backgroundColor: '#20242B',
    borderWidth: 1,
    borderColor: '#8EAAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMark: { color: '#D6E2FF', fontSize: scaledPixels(18), lineHeight: scaledPixels(22), fontWeight: '700' },
  description: {
    color: '#B7BFCC',
    fontSize: scaledPixels(22),
    lineHeight: scaledPixels(32),
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
    marginTop: scaledPixels(12),
  },
  toggleAction: {
    alignSelf: 'flex-start',
    marginTop: scaledPixels(16),
    borderRadius: scaledPixels(8),
    paddingVertical: scaledPixels(8),
    paddingHorizontal: scaledPixels(16),
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActionText: { color: colors.text, fontSize: scaledPixels(20), fontWeight: '600' },
  disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  watchButtonFocused: {
    backgroundColor: colors.focusBackground,
    borderColor: '#B8D2FF',

    // Shadow for depth
    shadowColor: '#8EAAFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.42,
    shadowRadius: scaledPixels(20),
    elevation: 7,
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
