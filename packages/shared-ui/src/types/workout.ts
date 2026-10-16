export type WorkoutGoal =
  | 'general-fitness'
  | 'weight-management'
  | 'strength'
  | 'endurance'
  | 'mobility'
  | 'cardio'
  | 'flexibility';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutEquipment =
  | 'dumbbells'
  | 'resistance-band'
  | 'exercise-mat'
  | 'chair'
  | 'kettlebell'
  | 'stationary-bike'
  | 'rowing-machine';

export type WorkoutDuration = 5 | 10 | 15 | 20 | 30 | 45 | 60;

export type WorkoutStyle =
  | 'balanced'
  | 'bodyweight'
  | 'dumbbell-strength'
  | 'band-strength'
  | 'kettlebell-strength'
  | 'steady-cardio'
  | 'cardio-intervals'
  | 'hiit'
  | 'boxing'
  | 'dance'
  | 'indoor-walking'
  | 'cycling'
  | 'rowing'
  | 'core'
  | 'pilates'
  | 'yoga'
  | 'balance'
  | 'mobility-flow'
  | 'stretching'
  | 'seated';
export type BodyFocus = 'full-body' | 'upper-body' | 'lower-body' | 'core';
export type MovementPosition = 'any' | 'standing-only' | 'seated-only';

export interface WorkoutConfig {
  goal: WorkoutGoal;
  fitnessLevel: FitnessLevel;
  durationMinutes: WorkoutDuration;
  equipment: WorkoutEquipment[];
  lowImpact?: boolean;
  style?: WorkoutStyle;
  bodyFocus?: BodyFocus;
  position?: MovementPosition;
  restPreference?: 'standard' | 'extra';
  excludedExerciseIds?: string[];
  variation?: number;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  description: string;
  goals: WorkoutGoal[];
  level: FitnessLevel;
  equipment: WorkoutEquipment[];
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds: number;
  category: 'strength' | 'cardio' | 'mobility' | 'flexibility';
  muscles: string[];
  techniqueCues: string[];
  lowImpact: boolean;
  modification?: string;
  order: number;
  position?: 'standing' | 'seated' | 'floor';
  /** New specialist exercises are opt-in, preserving the v1 default catalogue. */
  styles?: WorkoutStyle[];
}

export interface PlannedExercise {
  exercise: ExerciseDefinition;
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds: number;
  estimatedSeconds: number;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  goal: WorkoutGoal;
  fitnessLevel: FitnessLevel;
  targetDurationMinutes: number;
  estimatedDurationSeconds: number;
  exercises: PlannedExercise[];
  createdAt: string;
  config: WorkoutConfig;
  notes?: string[];
  plannerVersion?: string;
  source?: 'local' | 'aws';
}
