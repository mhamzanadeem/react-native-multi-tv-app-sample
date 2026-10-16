import { EXERCISES } from '../data/exercises';
import { sameJson } from '../utils/sameJson';
import { isWorkoutConfig, WorkoutPlanningError } from '../domain/workoutConfig';
import { customizationConflict } from '../domain/workoutCustomization';
import { generatePlan, isEligible, createPlannedExercise } from '../utils/planGenerator';
import type { ExerciseDefinition, WorkoutConfig, WorkoutPlan } from '../types/workout';

export interface ExerciseRepository {
  list(): readonly ExerciseDefinition[];
}
export interface WorkoutPlanGenerator {
  generate(config: WorkoutConfig): Promise<WorkoutPlan>;
}
export interface RecommendationRequest {
  config: WorkoutConfig;
  catalogueVersion: '1';
}
// Future model responses use trusted IDs; UI never receives prompts or model-specific payloads.
export interface RecommendationResponse {
  exerciseIds: string[];
}
export const exerciseRepository: ExerciseRepository = { list: () => EXERCISES };
export const localPlanGenerator: WorkoutPlanGenerator = {
  generate: async (config) => generatePlan(config, exerciseRepository.list()),
};

export function validatePlan(plan: WorkoutPlan, config: WorkoutConfig = plan.config): void {
  if (
    !isWorkoutConfig(config) ||
    customizationConflict(config) ||
    !plan.exercises?.length ||
    plan.exercises.length > 100 ||
    plan.goal !== config.goal ||
    plan.fitnessLevel !== config.fitnessLevel
  ) {
    throw new WorkoutPlanningError('INVALID_PLAN', 'This workout plan is invalid. Generate a new plan.');
  }
  const alternatives = EXERCISES.filter((exercise) => isEligible(exercise, config)).length;
  const seen = new Set<string>();
  let estimate = Math.max(0, plan.exercises.length - 1) * 15;
  let index = 0;
  for (const item of plan.exercises) {
    if (index++ % alternatives === 0) seen.clear();
    if (seen.has(item.exercise?.id))
      throw new WorkoutPlanningError(
        'INVALID_PLAN',
        'The plan repeats an exercise before suitable alternatives are used.',
      );
    seen.add(item.exercise?.id);
    const canonical = EXERCISES.find((exercise) => exercise.id === item.exercise?.id);
    const expected = canonical ? createPlannedExercise(canonical, config) : null;
    if (
      !canonical ||
      !isEligible(canonical, config) ||
      item.sets !== expected?.sets ||
      item.reps !== expected?.reps ||
      item.durationSeconds !== expected?.durationSeconds ||
      item.restSeconds !== expected?.restSeconds ||
      !sameJson(item.exercise, canonical) ||
      item.estimatedSeconds !== expected?.estimatedSeconds
    ) {
      throw new WorkoutPlanningError(
        'INVALID_PLAN',
        'A plan contains unavailable equipment, unsuitable exercises or altered guidance.',
      );
    }
    estimate += item.estimatedSeconds;
  }
  if (
    estimate !== plan.estimatedDurationSeconds ||
    estimate > config.durationMinutes * 60 + 60 ||
    estimate < config.durationMinutes * 60 - 180 ||
    plan.targetDurationMinutes !== config.durationMinutes
  ) {
    throw new WorkoutPlanningError('INVALID_PLAN', 'The workout duration is invalid. Generate a new plan.');
  }
}
// Validate an untrusted recommendation using local constraints before constructing a session-ready plan.
export function acceptRecommendation(response: unknown, config: WorkoutConfig): WorkoutPlan {
  if (
    !response ||
    typeof response !== 'object' ||
    !('exerciseIds' in response) ||
    !Array.isArray(response.exerciseIds)
  ) {
    throw new WorkoutPlanningError('INVALID_PLAN', 'Recommendation must contain exercise IDs.');
  }
  const baseline = generatePlan(config);
  const ids: unknown[] = response.exerciseIds;
  if (!ids.length || ids.length > 100)
    throw new WorkoutPlanningError('INVALID_PLAN', 'Recommendation has an invalid number of exercises.');
  const exercises = ids.map((id) => {
    const exercise = EXERCISES.find((item) => item.id === id);
    if (!exercise) throw new WorkoutPlanningError('INVALID_PLAN', 'Recommendation contains an unknown exercise.');
    return createPlannedExercise(exercise, config);
  });
  const plan = {
    ...baseline,
    exercises,
    estimatedDurationSeconds:
      exercises.reduce((sum, item) => sum + item.estimatedSeconds, 0) + Math.max(0, exercises.length - 1) * 15,
  };
  validatePlan(plan, config);
  return plan;
}
