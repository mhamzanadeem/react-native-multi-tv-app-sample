import React from 'react';
import { Image, StyleSheet, View, Text, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SpatialNavigationView, SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels as px } from '../../hooks/useScale';
import { fitnessColors as c } from '../../theme/fitness';
import { useFocusReveal } from './FocusScroll';
import { resolveCardArtwork } from '../tvCardArtwork';

export function FitnessButton({
  text,
  description,
  icon,
  onSelect,
  onFocus,
  variant = 'tile',
  selected = false,
  disabled = false,
  style,
  testID,
}: {
  text: string;
  description?: string;
  icon?: string;
  onSelect: () => void;
  onFocus?: () => void;
  variant?: 'tile' | 'compact';
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <FocusablePressable
      onSpatialFocus={onFocus}
      text={text}
      description={description}
      cardLayout={description ? 'poster' : 'inline'}
      icon={icon}
      variant={variant}
      onSelect={() => {
        if (!disabled) onSelect();
      }}
      disabled={disabled}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={text}
      testID={testID}
      style={[ui.button, variant === 'compact' && ui.compactButton, disabled && ui.disabled, style]}
    />
  );
}
export function Actions({
  children,
  columns: requestedColumns,
  singleRow = false,
}: {
  children: React.ReactNode;
  columns?: number;
  singleRow?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = React.useState(width - px(400));
  const items = React.Children.toArray(children);
  function labelLength(child: React.ReactNode): number {
    if (!React.isValidElement<{ text?: string; children?: React.ReactNode }>(child)) return 0;
    return child.props.text?.length ?? Math.max(0, ...React.Children.toArray(child.props.children).map(labelLength));
  }
  // Reserve room for the icon, checkmark, label and row gap before adding another card.
  const cardWidth = px(Math.max(360, ...items.map((item) => labelLength(item) * 15 + 140)));
  const columns = singleRow
    ? Math.max(1, items.length)
    : Math.max(1, Math.min(requestedColumns ?? 3, Math.floor(availableWidth / cardWidth)));
  const rows = Array.from({ length: Math.ceil(items.length / columns) }, (_, i) =>
    items.slice(i * columns, (i + 1) * columns),
  );
  return (
    <View onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}>
      <SpatialNavigationView direction="vertical" style={{ marginVertical: px(20), gap: px(24) }}>
        {rows.map((row, i) => (
          <SpatialNavigationView
            key={
              singleRow
                ? row.map((child, index) => (React.isValidElement(child) ? (child.key ?? index) : index)).join(':')
                : i
            }
            direction="horizontal"
            style={{ flexDirection: 'row', gap: px(24), alignItems: 'flex-start' }}>
            {singleRow
              ? row.map((child, index) => (
                  <View
                    key={React.isValidElement(child) ? (child.key ?? index) : index}
                    style={{ flex: 1, minWidth: 0 }}>
                    {React.isValidElement<{ style?: StyleProp<ViewStyle> }>(child)
                      ? React.cloneElement(child, { style: [child.props.style, { width: '100%', minWidth: 0 }] })
                      : child}
                  </View>
                ))
              : row}
          </SpatialNavigationView>
        ))}
      </SpatialNavigationView>
    </View>
  );
}
function ReadingSurface({ children, label, focused }: { children: React.ReactNode; label: string; focused: boolean }) {
  const reveal = useFocusReveal(focused);
  return (
    <View
      ref={reveal.ref}
      onLayout={reveal.onLayout}
      accessible
      accessibilityLabel={label}
      style={[ui.card, focused && ui.focusCard]}>
      <Image
        source={resolveCardArtwork(label)}
        resizeMode="contain"
        accessible={false}
        importantForAccessibility="no"
        style={ui.readingIcon}
      />
      {children}
    </View>
  );
}
export function ReadingCard({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <SpatialNavigationFocusableView viewProps={{ accessibilityRole: 'text', accessibilityLabel: label }}>
      {({ isFocused, isRootActive }) => (
        <ReadingSurface label={label} focused={isFocused && isRootActive !== false}>
          {children}
        </ReadingSurface>
      )}
    </SpatialNavigationFocusableView>
  );
}
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.stat}>
      <Image source={resolveCardArtwork(label)} resizeMode="contain" accessible={false} style={ui.statIcon} />
      <Text style={ui.statValue}>{value}</Text>
      <Text style={ui.caption}>{label}</Text>
    </View>
  );
}
export const ui = StyleSheet.create({
  actions: { flexDirection: 'row', gap: px(16), flexWrap: 'wrap', alignItems: 'center', marginVertical: px(16) },
  button: {
    backgroundColor: c.cardElevated,
    minHeight: px(112),
    minWidth: px(280),
    paddingHorizontal: px(20),
    maxWidth: '100%',
    borderRadius: px(18),
  },
  compactButton: {},
  disabled: { opacity: 0.5 },
  card: {
    padding: px(28),
    backgroundColor: c.card,
    borderWidth: px(2),
    borderColor: c.border,
    borderRadius: px(20),
    marginBottom: px(18),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: px(6) },
    shadowOpacity: 0.18,
    shadowRadius: px(14),
    elevation: 2,
  },
  focusCard: {
    borderColor: c.focusBorder,
    backgroundColor: c.backgroundElevated,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: px(18),
    elevation: 6,
  },
  readingIcon: { width: px(44), height: px(44), marginBottom: px(12) },
  statIcon: { position: 'absolute', end: px(20), top: px(16), width: px(64), height: px(64), opacity: 0.18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: px(24) },
  column: { flex: 1, minWidth: px(480) },
  kicker: { color: c.primary, fontSize: px(22), fontWeight: '700', letterSpacing: px(3), marginBottom: px(12) },
  hero: { color: c.text, fontSize: px(48), fontWeight: '700', lineHeight: px(58), marginBottom: px(16) },
  heading: { color: c.text, fontSize: px(36), lineHeight: px(46), fontWeight: '700', marginBottom: px(12) },
  body: { color: c.textSecondary, fontSize: px(24), fontWeight: '500', lineHeight: px(36), marginBottom: px(12) },
  caption: { color: c.textSecondary, fontSize: px(22), fontWeight: '500', lineHeight: px(32) },
  small: { color: c.textTertiary, fontSize: px(20), lineHeight: px(28) },
  error: { color: c.accent, fontSize: px(24), lineHeight: px(34), marginVertical: px(12) },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: px(24), marginVertical: px(20) },
  stat: {
    flex: 1,
    minWidth: px(280),
    backgroundColor: c.backgroundElevated,
    padding: px(24),
    borderRadius: px(16),
    borderWidth: px(2),
    borderColor: c.border,
  },
  statValue: { color: c.primary, fontSize: px(48), fontWeight: '700', marginBottom: px(6) },
  primary: { backgroundColor: '#27334D', borderColor: '#8EAAFF' },
});
