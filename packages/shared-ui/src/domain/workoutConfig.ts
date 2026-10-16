import { BODY_FOCUS, POSITIONS, WORKOUT_STYLES } from './workoutCustomization';
import type { FitnessLevel, WorkoutConfig, WorkoutEquipment, WorkoutGoal } from '../types/workout';

export const GOAL_LABELS: Record<WorkoutGoal, string> = {
  'general-fitness': 'General fitness',
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  flexibility: 'Flexibility',
  endurance: 'Endurance',
  'weight-management': 'Low-impact cardio',
};
export const LEVEL_RANK: Record<FitnessLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };
export const EQUIPMENT_LABELS: Record<WorkoutEquipment, string> = {
  chair: 'Stable chair',
  dumbbells: 'Dumbbells',
  'resistance-band': 'Resistance band',
  'exercise-mat': 'Exercise mat',
  kettlebell: 'Kettlebell',
  'stationary-bike': 'Stationary bike',
  'rowing-machine': 'Rowing machine',
};
export const DEFAULT_CONFIG: WorkoutConfig = {
  goal: 'general-fitness',
  fitnessLevel: 'beginner',
  durationMinutes: 10,
  equipment: [],
  lowImpact: true,
};
export function isWorkoutConfig(value: unknown): value is WorkoutConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.goal === 'string' &&
    Object.prototype.hasOwnProperty.call(GOAL_LABELS, config.goal) &&
    typeof config.fitnessLevel === 'string' &&
    Object.prototype.hasOwnProperty.call(LEVEL_RANK, config.fitnessLevel) &&
    typeof config.durationMinutes === 'number' &&
    [5, 10, 15, 20, 30, 45, 60].includes(config.durationMinutes) &&
    Array.isArray(config.equipment) &&
    config.equipment.every(
      (item) => typeof item === 'string' && Object.prototype.hasOwnProperty.call(EQUIPMENT_LABELS, item),
    ) &&
    new Set(config.equipment).size === config.equipment.length &&
    (config.lowImpact === undefined || typeof config.lowImpact === 'boolean') &&
    (config.style === undefined || WORKOUT_STYLES.some((item) => item.id === config.style)) &&
    (config.bodyFocus === undefined ||
      (typeof config.bodyFocus === 'string' && Object.prototype.hasOwnProperty.call(BODY_FOCUS, config.bodyFocus))) &&
    (config.position === undefined ||
      (typeof config.position === 'string' && Object.prototype.hasOwnProperty.call(POSITIONS, config.position))) &&
    (config.restPreference === undefined ||
      (typeof config.restPreference === 'string' && ['standard', 'extra'].includes(config.restPreference))) &&
    (config.variation === undefined ||
      (Number.isInteger(config.variation) && Number(config.variation) >= 0 && Number(config.variation) <= 9999)) &&
    (config.excludedExerciseIds === undefined ||
      (Array.isArray(config.excludedExerciseIds) &&
        config.excludedExerciseIds.length <= 100 &&
        config.excludedExerciseIds.every((id) => typeof id === 'string' && /^[a-z0-9-]{1,80}$/.test(id)) &&
        new Set(config.excludedExerciseIds).size === config.excludedExerciseIds.length))
  );
}
export class WorkoutPlanningError extends Error {
  constructor(
    public readonly code: 'INVALID_CONFIG' | 'NO_EXERCISES' | 'INVALID_PLAN',
    message: string,
  ) {
    super(message);
    this.name = 'WorkoutPlanningError';
  }
}
export function equipmentLabel(equipment: WorkoutEquipment[]): string {
  return equipment.length ? equipment.map((item) => EQUIPMENT_LABELS[item]).join(' + ') : 'No equipment';
}
export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
