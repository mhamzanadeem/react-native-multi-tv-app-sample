import { EXERCISES } from '../data/exercises';
import { isWorkoutConfig, LEVEL_RANK, WorkoutPlanningError } from '../domain/workoutConfig';
import { customizationConflict, matchesCustomization, WORKOUT_STYLES } from '../domain/workoutCustomization';
import type { ExerciseDefinition, PlannedExercise, WorkoutConfig, WorkoutGoal, WorkoutPlan } from '../types/workout';

const GOAL_TITLES: Record<WorkoutGoal, string> = {
  'general-fitness': 'Everyday full body',
  strength: 'Build your strength',
  cardio: 'Move with energy',
  'weight-management': 'Low-impact cardio',
  endurance: 'Endurance builder',
  mobility: 'Move more freely',
  flexibility: 'Stretch and reset',
};
export function estimateExerciseSeconds(exercise: ExerciseDefinition): number {
  return (
    exercise.sets * (exercise.durationSeconds ?? (exercise.reps ?? 10) * 4) +
    Math.max(0, exercise.sets - 1) * exercise.restSeconds
  );
}
export function createPlannedExercise(exercise: ExerciseDefinition, config?: WorkoutConfig): PlannedExercise {
  const interval = config?.style === 'cardio-intervals' || config?.style === 'hiit';
  const sets = interval ? 3 : exercise.sets;
  const durationSeconds = interval ? (config?.style === 'hiit' ? 40 : 30) : exercise.durationSeconds;
  const reps = interval ? undefined : exercise.reps;
  const restSeconds = (interval ? 30 : exercise.restSeconds) + (config?.restPreference === 'extra' ? 15 : 0);
  return {
    exercise: {
      ...exercise,
      goals: [...exercise.goals],
      equipment: [...exercise.equipment],
      muscles: [...exercise.muscles],
      techniqueCues: [...exercise.techniqueCues],
    },
    sets,
    reps,
    durationSeconds,
    restSeconds,
    estimatedSeconds: sets * (durationSeconds ?? (reps ?? 10) * 4) + Math.max(0, sets - 1) * restSeconds,
  };
}
export function isEligible(exercise: ExerciseDefinition, config: WorkoutConfig): boolean {
  return (
    LEVEL_RANK[exercise.level] <= LEVEL_RANK[config.fitnessLevel] &&
    exercise.equipment.every((item) => config.equipment.includes(item)) &&
    exercise.goals.includes(config.goal) &&
    (!config.lowImpact || exercise.lowImpact) &&
    matchesCustomization(exercise, config)
  );
}
let sequence = 0;
export function generatePlan(config: WorkoutConfig, catalogue: readonly ExerciseDefinition[] = EXERCISES): WorkoutPlan {
  if (!isWorkoutConfig(config))
    throw new WorkoutPlanningError(
      'INVALID_CONFIG',
      'Invalid workout configuration. Choose a goal, level, duration and supported equipment.',
    );
  const conflict = customizationConflict(config);
  if (conflict) throw new WorkoutPlanningError('NO_EXERCISES', conflict);
  if (config.excludedExerciseIds?.some((id) => !catalogue.some((exercise) => exercise.id === id)))
    throw new WorkoutPlanningError(
      'INVALID_CONFIG',
      'An excluded exercise ID is unknown. Refresh the exercise list and try again.',
    );
  const candidates = catalogue
    .filter((exercise) => isEligible(exercise, config))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (!candidates.length)
    throw new WorkoutPlanningError(
      'NO_EXERCISES',
      'No suitable exercises were found for all your choices. Try Full body, allow floor movements, remove an exclusion, or choose a different style. Your equipment and impact limits were not relaxed.',
    );
  if (
    candidates.some(
      (exercise) =>
        !Number.isFinite(estimateExerciseSeconds(exercise)) ||
        estimateExerciseSeconds(exercise) <= 0 ||
        !Number.isInteger(exercise.sets) ||
        exercise.sets < 1,
    )
  ) {
    throw new WorkoutPlanningError('INVALID_PLAN', 'The exercise catalogue contains invalid timing guidance.');
  }
  let circuit = candidates;
  if (config.goal === 'general-fitness' && (!config.style || config.style === 'balanced')) {
    // One warm-up, then alternate strength/cardio/mobility so short plans have variety.
    const warmup =
      candidates.find((item) => item.id === 'march-in-place') ?? candidates.find((item) => item.order === 0);
    const strengthPriority = ['bodyweight-squat', 'wall-push-up', 'glute-bridge', 'dumbbell-row'];
    const strength = candidates
      .filter((item) => item !== warmup && item.category === 'strength')
      .sort((a, b) => {
        const aRank = strengthPriority.indexOf(a.id);
        const bRank = strengthPriority.indexOf(b.id);
        return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank) || a.id.localeCompare(b.id);
      });
    const cardio = candidates.filter((item) => item !== warmup && item.category === 'cardio');
    const mobility = candidates.filter((item) => item !== warmup && item.category === 'mobility');
    const flexibility = candidates.filter((item) => item !== warmup && item.category === 'flexibility');
    circuit = warmup ? [warmup] : [];
    while (strength.length || cardio.length || mobility.length) {
      for (const pool of [strength, cardio, strength, mobility]) {
        const item = pool.shift();
        if (item) circuit.push(item);
      }
    }
    circuit.push(...flexibility);
  }
  if (config.variation && circuit.length > 1) {
    const offset = config.variation % circuit.length;
    circuit = [...circuit.slice(offset), ...circuit.slice(0, offset)];
  }
  const selected: PlannedExercise[] = [];
  const targetSeconds = config.durationMinutes * 60;
  let totalSeconds = 0;
  // Full circuits repeat only after each eligible exercise has been used once.
  // Preserve a stable, goal-specific order within each circuit.
  while (totalSeconds < targetSeconds) {
    const exercise = circuit[selected.length % circuit.length];
    const planned = createPlannedExercise(exercise, config);
    const extra = planned.estimatedSeconds + (selected.length ? 15 : 0);
    if (selected.length && totalSeconds + extra > targetSeconds + 60) {
      // Use a shorter unused alternative in the current circuit when a full
      // block will not fit. Stop here instead of restarting a partial circuit.
      const start = selected.length % circuit.length;
      for (const alternative of circuit.slice(start + 1)) {
        if (totalSeconds >= targetSeconds) break;
        const tail = createPlannedExercise(alternative, config);
        const tailSeconds = tail.estimatedSeconds + 15;
        if (totalSeconds + tailSeconds <= targetSeconds + 60) {
          selected.push(tail);
          totalSeconds += tailSeconds;
        }
      }
      break;
    }
    selected.push(planned);
    totalSeconds += extra;
  }
  if (totalSeconds < targetSeconds - 180 || totalSeconds > targetSeconds + 60)
    throw new WorkoutPlanningError(
      'NO_EXERCISES',
      'Complete exercise blocks and recovery do not fit this duration. Choose a longer workout, standard rest, or a different style. No set was cut short.',
    );
  const now = new Date();
  return {
    id: `workout-${now.getTime()}-${++sequence}`,
    title:
      config.style && config.style !== 'balanced'
        ? WORKOUT_STYLES.find((item) => item.id === config.style)!.label
        : GOAL_TITLES[config.goal],
    goal: config.goal,
    fitnessLevel: config.fitnessLevel,
    targetDurationMinutes: config.durationMinutes,
    estimatedDurationSeconds: totalSeconds,
    exercises: selected,
    createdAt: now.toISOString(),
    config: {
      ...config,
      equipment: [...config.equipment],
      ...(config.excludedExerciseIds ? { excludedExerciseIds: [...config.excludedExerciseIds] } : {}),
    },
    plannerVersion: 'rules-v2',
    source: 'local',
    notes: [
      'Rule-based plan from the FormFit catalogue; no AI or medical assessment.',
      'Timing includes between-set rest and 15-second exercise transitions. Move at a comfortable pace.',
      ...(circuit.length < 3
        ? ['Only a small exercise pool matches these choices; the sequence repeats after all matching alternatives.']
        : []),
      ...(config.lowImpact
        ? [
            'Only catalogue movements marked low impact were selected. Low impact does not mean injury-specific suitability.',
          ]
        : []),
      ...(config.restPreference === 'extra' ? ['Extra recovery: 15 additional seconds between sets.'] : []),
      ...(totalSeconds < targetSeconds
        ? [
            `Estimated plan is ${targetSeconds - totalSeconds} seconds shorter than requested to avoid truncating a set.`,
          ]
        : []),
    ],
  };
}
