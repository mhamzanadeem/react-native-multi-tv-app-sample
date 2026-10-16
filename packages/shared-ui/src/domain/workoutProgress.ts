import type { WorkoutSummary } from './workoutSession';
export function progressTotals(history: readonly WorkoutSummary[], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return {
    sessions: history.length,
    completedExercises: history.reduce((sum, item) => sum + item.completedExercises, 0),
    activeSeconds: history.reduce((sum, item) => sum + item.activeSeconds, 0),
    thisWeek: history.filter(
      (item) => Date.parse(item.completedAt) >= weekAgo && Date.parse(item.completedAt) <= now.getTime(),
    ).length,
  };
}
