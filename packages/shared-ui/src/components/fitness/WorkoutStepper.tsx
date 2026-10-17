import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { scaledPixels as px } from '../../hooks/useScale';
import { fitnessColors as c } from '../../theme/fitness';

export default function WorkoutStepper({ steps, current }: { steps: string[]; current: number }) {
  if (!steps.length) return null;
  const active = Math.max(0, Math.min(current, steps.length - 1));
  const start = Math.floor(active / 3) * 3;
  const visible = steps.slice(start, start + 3);
  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text
          accessibilityLiveRegion="polite"
          style={styles.summaryText}>{`Step ${active + 1} of ${steps.length}`}</Text>
        <Text style={styles.range}>{`Showing ${start + 1}-${start + visible.length} of ${steps.length}`}</Text>
      </View>
      <View style={styles.row}>
        {Array.from({ length: 3 }, (_, slot) => {
          const label = visible[slot];
          if (!label) return <View key={slot} style={styles.empty} />;
          const index = start + slot;
          const completed = index < active;
          const isCurrent = index === active;
          const status = completed ? 'Completed' : isCurrent ? 'Current step' : 'Up next';
          return (
            <View
              key={label}
              accessible
              accessibilityLabel={`${index + 1}. ${label}. ${status}`}
              style={[styles.step, isCurrent && styles.current, completed && styles.completed]}>
              <View style={[styles.number, (completed || isCurrent) && styles.activeNumber]}>
                <Text style={styles.numberText}>{completed ? '\u2713' : index + 1}</Text>
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.label, isCurrent && styles.currentLabel]}>
                  {label}
                </Text>
                <Text style={styles.status}>{status}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Completed setup steps"
        accessibilityValue={{ min: 0, max: steps.length, now: active }}
        style={styles.track}>
        {steps.map((label, index) => (
          <View
            key={label}
            style={[styles.segment, index < active && styles.segmentDone, index === active && styles.segmentCurrent]}
          />
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginVertical: px(16), gap: px(12) },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryText: { color: c.text, fontSize: px(22), fontWeight: '600' },
  range: { color: c.textSecondary, fontSize: px(20) },
  row: { flexDirection: 'row', gap: px(16) },
  step: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(16),
    padding: px(16),
    borderRadius: px(14),
    backgroundColor: c.card,
    borderWidth: px(2),
    borderColor: c.border,
  },
  current: { backgroundColor: c.focusBackground, borderColor: c.focusBorder },
  completed: { borderColor: c.primary },
  empty: { flex: 1 },
  number: {
    width: px(44),
    height: px(44),
    borderRadius: px(22),
    backgroundColor: c.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNumber: { backgroundColor: c.focusBackground },
  numberText: { color: c.text, fontSize: px(22), fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  label: { color: c.textSecondary, fontSize: px(24), fontWeight: '600' },
  currentLabel: { color: c.text },
  status: { color: c.textSecondary, fontSize: px(18), marginTop: px(4) },
  track: { flexDirection: 'row', gap: px(6), marginTop: px(2) },
  segment: { flex: 1, height: px(4), borderRadius: px(2), backgroundColor: c.border },
  segmentDone: { backgroundColor: c.primary },
  segmentCurrent: { backgroundColor: c.focusBorder },
});
