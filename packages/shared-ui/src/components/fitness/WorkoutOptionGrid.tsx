import React, { useRef } from 'react';
import { View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels as px } from '../../hooks/useScale';

export interface WorkoutOption {
  id: string;
  label: string;
  description: string;
  actionLabel?: string;
  selected: boolean;
  onSelect: () => void;
}
export default function WorkoutOptionGrid({
  options,
  disabled = false,
  multiSelect = false,
}: {
  options: WorkoutOption[];
  disabled?: boolean;
  multiSelect?: boolean;
}) {
  const columns = 3;
  // Initial focus is a mount-time decision. Moving this wrapper on selection
  // remounts spatial nodes and changes the D-pad order of existing cards.
  const preferred = useRef(
    Math.max(
      0,
      options.findIndex((option) => option.selected),
    ),
  ).current;
  return (
    <SpatialNavigationView direction="vertical" style={{ gap: px(24), marginVertical: px(24) }}>
      {Array.from({ length: Math.ceil(options.length / columns) }, (_, row) => (
        <SpatialNavigationView key={row} direction="horizontal" style={{ gap: px(24), alignItems: 'stretch' }}>
          {Array.from({ length: columns }, (_, column) => {
            const index = row * columns + column;
            const option = options[index];
            if (!option) return <View key={column} style={{ flex: 1 }} />;
            const card = (
              <FocusablePressable
                cardLayout="poster"
                text={option.label}
                description={option.description}
                actionLabel={
                  multiSelect ? (option.actionLabel ?? (option.selected ? 'Deselect' : 'Select')) : undefined
                }
                accessibilityRole={multiSelect && !option.actionLabel ? 'checkbox' : 'button'}
                accessibilityLabel={option.label}
                accessibilityHint={`${option.description}${multiSelect && !option.actionLabel ? (option.selected ? ' Press OK to deselect.' : ' Press OK to select.') : ''}`}
                accessibilityState={{
                  selected: option.selected,
                  disabled,
                  ...(multiSelect && !option.actionLabel ? { checked: option.selected } : {}),
                }}
                disabled={disabled}
                onSelect={option.onSelect}
                style={{
                  width: '100%',
                  minWidth: 0,
                  minHeight: px(270),
                  padding: px(24),
                  justifyContent: 'flex-start',
                }}
              />
            );
            return (
              <View key={option.id} style={{ flex: 1, minWidth: 0 }}>
                {index === preferred ? <DefaultFocus>{card}</DefaultFocus> : card}
              </View>
            );
          })}
        </SpatialNavigationView>
      ))}
    </SpatialNavigationView>
  );
}
