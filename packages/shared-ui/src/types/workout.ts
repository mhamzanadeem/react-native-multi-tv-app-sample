
export type WorkoutGoal =
  | 'general-fitness'
  | 'weight-management'
  | 'strength'
  | 'endurance'
  | 'mobility';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutEquipment =
  | 'dumbbells'
  | 'resistance-band'
  | 'exercise-mat';

export type WorkoutDuration = 10 | 15 | 20 | 30 | 45;

export interface WorkoutConfig {
  goal: WorkoutGoal;
  fitnessLevel: FitnessLevel;
  durationMinutes: WorkoutDuration;
  equipment: WorkoutEquipment[];
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
}
