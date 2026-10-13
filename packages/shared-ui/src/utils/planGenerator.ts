
import type {
  ExerciseDefinition,
  FitnessLevel,
  WorkoutConfig,
  WorkoutGoal,
  WorkoutPlan,
  PlannedExercise,
} from '../types/workout';

import { EXERCISES } from '../data/exercises';

const LEVEL_RANK: Record<FitnessLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const GOAL_TITLES: Record<WorkoutGoal, string> = {
  'general-fitness': 'Full Body Fitness',
  'weight-management': 'Low-Impact Cardio',
  strength: 'Strength Training',
  endurance: 'Endurance Builder',
  mobility: 'Mobility and Balance',
};

function estimateExerciseSeconds(
  exercise: ExerciseDefinition,
): number {
  const activeSeconds =
    exercise.durationSeconds ?? (exercise.reps ?? 10) * 4;

  return (
    exercise.sets * activeSeconds +
    Math.max(0, exercise.sets - 1) * exercise.restSeconds
  );
}

function createPlannedExercise(
  exercise: ExerciseDefinition,
): PlannedExercise {
  return {
    exercise,
    sets: exercise.sets,
    ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
    ...(exercise.durationSeconds !== undefined
      ? { durationSeconds: exercise.durationSeconds }
      : {}),
    restSeconds: exercise.restSeconds,
    estimatedSeconds: estimateExerciseSeconds(exercise),
  };
}

export function generatePlan(config: WorkoutConfig): WorkoutPlan {
  // Config can originate from persisted data or a JavaScript caller.
  if (
    !config ||
    !Object.prototype.hasOwnProperty.call(GOAL_TITLES, config.goal) ||
    !Object.prototype.hasOwnProperty.call(LEVEL_RANK, config.fitnessLevel) ||
    ![10, 15, 20, 30, 45].includes(config.durationMinutes) ||
    !Array.isArray(config.equipment) ||
    config.equipment.some((item) =>
      !['dumbbells', 'resistance-band', 'exercise-mat'].includes(item),
    )
  ) {
    throw new Error('Invalid workout configuration.');
  }

  const targetSeconds = config.durationMinutes * 60;

  const candidates = EXERCISES.filter((exercise) => {
    const levelIsSuitable =
      LEVEL_RANK[exercise.level] <= LEVEL_RANK[config.fitnessLevel];

    const equipmentIsAvailable = exercise.equipment.every((item) =>
      config.equipment.includes(item),
    );

    return levelIsSuitable && equipmentIsAvailable && exercise.goals.includes(config.goal);
  });

  if (candidates.length === 0) {
    throw new Error(
      'No suitable exercises were found. Try changing your equipment or fitness level.',
    );
  }

  const selected: PlannedExercise[] = [];
  let totalSeconds = 0;
  let candidateIndex = 0;

  // A short transition allowance between exercises.
  const transitionSeconds = 15;

  // Repeat a full circuit only after all suitable exercises have been used.
  // The duration bounds and positive exercise durations keep this loop finite.
  while (totalSeconds < targetSeconds) {
    const exercise = candidates[candidateIndex % candidates.length];
    const planned = createPlannedExercise(exercise);

    const extraSeconds =
      planned.estimatedSeconds +
      (selected.length > 0 ? transitionSeconds : 0);

    // Avoid overshooting the requested duration when possible.
    if (
      selected.length > 0 &&
      totalSeconds + extraSeconds > targetSeconds + 60
    ) {
      break;
    }

    selected.push(planned);
    totalSeconds += extraSeconds;
    candidateIndex += 1;
  }

  const now = new Date();

  return {
    id: `workout-${now.getTime()}`,
    title: GOAL_TITLES[config.goal],
    goal: config.goal,
    fitnessLevel: config.fitnessLevel,
    targetDurationMinutes: config.durationMinutes,
    estimatedDurationSeconds: totalSeconds,
    exercises: selected,
    createdAt: now.toISOString(),
  };
}
