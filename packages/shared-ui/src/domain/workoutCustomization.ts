import type {
  BodyFocus,
  ExerciseDefinition,
  MovementPosition,
  WorkoutConfig,
  WorkoutGoal,
  WorkoutStyle,
} from '../types/workout';

const allGoals: WorkoutGoal[] = [
  'general-fitness',
  'strength',
  'cardio',
  'endurance',
  'weight-management',
  'mobility',
  'flexibility',
];
const strength: WorkoutGoal[] = ['general-fitness', 'strength'];
const cardio: WorkoutGoal[] = ['general-fitness', 'cardio', 'endurance', 'weight-management'];
export const WORKOUT_STYLES: { id: WorkoutStyle; label: string; goals: WorkoutGoal[]; description: string }[] = [
  { id: 'balanced', label: 'Balanced mix', goals: allGoals, description: 'A varied sequence matching your goal.' },
  {
    id: 'bodyweight',
    label: 'Bodyweight strength',
    goals: strength,
    description: 'Strength movements without weights or bands; a mat or chair may be needed.',
  },
  {
    id: 'dumbbell-strength',
    label: 'Dumbbell strength',
    goals: strength,
    description: 'Requires dumbbells. Choose a manageable load; no weight is prescribed.',
  },
  {
    id: 'band-strength',
    label: 'Resistance bands',
    goals: strength,
    description: 'Requires an intact resistance band.',
  },
  {
    id: 'kettlebell-strength',
    label: 'Kettlebell basics',
    goals: strength,
    description: 'Controlled deadlifts and carries for experienced users; no ballistic swings.',
  },
  { id: 'steady-cardio', label: 'Steady cardio', goals: cardio, description: 'Comfortable timed cardio blocks.' },
  {
    id: 'cardio-intervals',
    label: 'Cardio intervals',
    goals: cardio,
    description: 'Short timed movement blocks with planned recovery.',
  },
  {
    id: 'hiit',
    label: 'HIIT-style intervals',
    goals: cardio,
    description: 'Intermediate or advanced only. Self-paced intervals, not measured heart-rate training.',
  },
  {
    id: 'boxing',
    label: 'Shadow boxing',
    goals: cardio,
    description: 'Controlled punches without contact or a punching bag.',
  },
  {
    id: 'dance',
    label: 'Dance cardio',
    goals: cardio,
    description: 'Simple step-touch and grapevine patterns; no choreography video.',
  },
  {
    id: 'indoor-walking',
    label: 'Indoor walking',
    goals: cardio,
    description: 'Marching and walking-inspired movements in place.',
  },
  {
    id: 'cycling',
    label: 'Stationary cycling',
    goals: cardio,
    description: 'Requires a stationary bike; set resistance yourself. No automatic device control.',
  },
  {
    id: 'rowing',
    label: 'Indoor rowing',
    goals: cardio,
    description: 'Requires a rowing machine and familiarity with its technique.',
  },
  { id: 'core', label: 'Core stability', goals: strength, description: 'Controlled trunk stability movements.' },
  {
    id: 'pilates',
    label: 'Pilates-inspired',
    goals: strength,
    description: 'Basic controlled mat movements; not a complete instructor-led Pilates class.',
  },
  {
    id: 'yoga',
    label: 'Yoga-inspired',
    goals: ['mobility', 'flexibility'],
    description: 'Gentle basic poses without advanced inversions or breath holds.',
  },
  {
    id: 'balance',
    label: 'Supported balance',
    goals: ['general-fitness', 'mobility'],
    description: 'Use a stable wall or chair within reach.',
  },
  {
    id: 'mobility-flow',
    label: 'Mobility flow',
    goals: ['general-fitness', 'mobility'],
    description: 'Controlled movements through a comfortable range.',
  },
  {
    id: 'stretching',
    label: 'Stretch and unwind',
    goals: ['mobility', 'flexibility'],
    description: 'Gentle stretching without bouncing or forcing range.',
  },
  {
    id: 'seated',
    label: 'Seated movement',
    goals: allGoals,
    description: 'Requires a stable non-wheeled chair; not a rehabilitation prescription.',
  },
];
export const BODY_FOCUS: Record<BodyFocus, string> = {
  'full-body': 'Full body',
  'upper-body': 'Upper body',
  'lower-body': 'Lower body',
  core: 'Core',
};
export const POSITIONS: Record<MovementPosition, string> = {
  any: 'Floor or standing',
  'standing-only': 'Standing only',
  'seated-only': 'Seated only',
};
export function exercisePosition(exercise: ExerciseDefinition): 'standing' | 'seated' | 'floor' {
  return (
    exercise.position ??
    (['glute-bridge', 'dead-bug'].includes(exercise.id)
      ? 'floor'
      : ['seated-knee-extension', 'hamstring-stretch'].includes(exercise.id)
        ? 'seated'
        : 'standing')
  );
}
export function matchesCustomization(exercise: ExerciseDefinition, config: WorkoutConfig): boolean {
  if (config.excludedExerciseIds?.includes(exercise.id)) return false;
  const position = exercisePosition(exercise);
  if (config.position === 'standing-only' && position !== 'standing') return false;
  if (config.position === 'seated-only' && position !== 'seated') return false;
  const muscles = exercise.muscles.join(' ').toLowerCase();
  if (config.bodyFocus === 'upper-body' && !/chest|arm|shoulder|back/.test(muscles)) return false;
  if (config.bodyFocus === 'lower-body' && !/leg|glute|quad|hamstring|calv|hip|ankle/.test(muscles)) return false;
  if (config.bodyFocus === 'core' && !/core|torso|abdominal/.test(muscles)) return false;
  const style = config.style ?? 'balanced';
  if (style === 'balanced') return !exercise.styles;
  if (exercise.styles?.includes(style)) return true;
  if (exercise.styles) return false;
  if (style === 'bodyweight')
    return (
      exercise.category === 'strength' &&
      exercise.equipment.every((item) => item === 'chair' || item === 'exercise-mat')
    );
  if (style === 'dumbbell-strength')
    return exercise.category === 'strength' && exercise.equipment.includes('dumbbells');
  if (style === 'band-strength')
    return exercise.category === 'strength' && exercise.equipment.includes('resistance-band');
  if (['steady-cardio', 'cardio-intervals', 'hiit'].includes(style)) return exercise.category === 'cardio';
  if (style === 'boxing') return exercise.id === 'standing-punch';
  if (style === 'dance') return ['standing-side-step', 'heel-dig'].includes(exercise.id);
  if (style === 'indoor-walking')
    return ['march-in-place', 'quick-march', 'heel-dig', 'standing-knee-raise', 'standing-side-step'].includes(
      exercise.id,
    );
  if (style === 'core') return exercise.category === 'strength' && exercise.muscles.includes('core');
  if (style === 'pilates') return ['glute-bridge', 'dead-bug'].includes(exercise.id);
  if (style === 'balance') return exercise.id === 'standing-balance';
  if (style === 'mobility-flow') return exercise.category === 'mobility';
  if (style === 'stretching') return exercise.category === 'flexibility';
  if (style === 'seated') return position === 'seated';
  return false;
}
export function customizationConflict(config: WorkoutConfig): string | null {
  const style = WORKOUT_STYLES.find((item) => item.id === (config.style ?? 'balanced'));
  if (!style?.goals.includes(config.goal))
    return 'This workout style does not match your goal. Choose a matching style or change your goal.';
  if (config.style === 'hiit' && config.fitnessLevel === 'beginner')
    return 'HIIT-style intervals require intermediate or advanced experience. Choose Cardio intervals for a beginner-friendly alternative.';
  if (config.style === 'kettlebell-strength' && config.fitnessLevel === 'beginner')
    return 'Kettlebell basics require intermediate experience. Choose Bodyweight strength or Dumbbell strength instead.';
  const requirements: Partial<Record<WorkoutStyle, string>> = {
    'dumbbell-strength': 'dumbbells',
    'band-strength': 'resistance-band',
    'kettlebell-strength': 'kettlebell',
    cycling: 'stationary-bike',
    rowing: 'rowing-machine',
    seated: 'chair',
    pilates: 'exercise-mat',
  };
  const needed = requirements[config.style ?? 'balanced'];
  if (needed && !config.equipment.some((item) => item === needed))
    return `This style requires ${needed}. Add it under Equipment or choose a different style.`;
  if (config.style === 'rowing' && config.fitnessLevel === 'beginner')
    return 'Indoor rowing requires intermediate experience with rowing technique. Choose Indoor walking for an equipment-free alternative.';
  return null;
}
