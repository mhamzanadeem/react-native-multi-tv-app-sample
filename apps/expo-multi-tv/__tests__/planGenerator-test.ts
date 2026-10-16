import { generatePlan, isEligible } from '../../../packages/shared-ui/src/utils/planGenerator';
import { EXERCISES } from '../../../packages/shared-ui/src/data/exercises';
import type {
  WorkoutConfig,
  WorkoutEquipment,
  WorkoutGoal,
  FitnessLevel,
  WorkoutDuration,
} from '../../../packages/shared-ui/src/types/workout';

const goals: WorkoutGoal[] = ['general-fitness', 'weight-management', 'strength', 'endurance', 'mobility'];
const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];
const durations: WorkoutDuration[] = [10, 15, 20, 30, 45];
const equipment: WorkoutEquipment[] = ['dumbbells', 'resistance-band', 'exercise-mat'];
const configs = goals.flatMap((goal) =>
  levels.flatMap((fitnessLevel) =>
    durations.flatMap((durationMinutes) =>
      Array.from(
        { length: 8 },
        (_, mask): WorkoutConfig => ({
          goal,
          fitnessLevel,
          durationMinutes,
          equipment: equipment.filter((_, index) => (mask & (1 << index)) !== 0),
        }),
      ),
    ),
  ),
);
const rank = { beginner: 0, intermediate: 1, advanced: 2 };

it.each(configs)('generates a suitable, accurately timed plan for %j', (config) => {
  const plan = generatePlan(config);
  expect(plan.exercises.length).toBeGreaterThan(0);
  for (const item of plan.exercises) {
    expect(item.exercise.goals).toContain(config.goal);
    expect(rank[item.exercise.level]).toBeLessThanOrEqual(rank[config.fitnessLevel]);
    expect(item.exercise.equipment.every((value) => config.equipment.includes(value))).toBe(true);
    expect(item.estimatedSeconds).toBe(
      item.sets * (item.durationSeconds ?? (item.reps ?? 10) * 4) + Math.max(0, item.sets - 1) * item.restSeconds,
    );
  }
  expect(plan.estimatedDurationSeconds).toBe(
    plan.exercises.reduce((sum, item) => sum + item.estimatedSeconds, 0) + (plan.exercises.length - 1) * 15,
  );
  expect(plan.estimatedDurationSeconds).toBeLessThanOrEqual(config.durationMinutes * 60 + 60);
  expect(plan.estimatedDurationSeconds).toBeGreaterThan(config.durationMinutes * 60 - 180);
  const candidates = EXERCISES.filter((item) => isEligible(item, config));
  const firstCircuit = plan.exercises.slice(0, candidates.length).map((item) => item.exercise.id);
  expect(new Set(firstCircuit).size).toBe(firstCircuit.length);
});

it.each([
  null,
  {},
  { goal: 'invalid' },
  { goal: 'strength', fitnessLevel: 'beginner', durationMinutes: -1, equipment: [] },
  { goal: 'mobility', fitnessLevel: 'beginner', durationMinutes: 10, equipment: ['invalid'] },
])('rejects invalid config %j', (value) => {
  expect(() => generatePlan(value as unknown as WorkoutConfig)).toThrow('Invalid workout configuration');
});

it('reports an empty candidate list', () => {
  const saved = EXERCISES.splice(0);
  try {
    expect(() =>
      generatePlan({ goal: 'strength', fitnessLevel: 'beginner', durationMinutes: 10, equipment: [] }),
    ).toThrow('No suitable exercises');
  } finally {
    EXERCISES.push(...saved);
  }
});

it('keeps catalog IDs unique and exercise estimates finite and positive', () => {
  expect(new Set(EXERCISES.map((item) => item.id)).size).toBe(EXERCISES.length);
  for (const item of EXERCISES) {
    expect(Number.isInteger(item.sets) && item.sets > 0).toBe(true);
    expect(Number.isFinite(item.restSeconds) && item.restSeconds >= 0).toBe(true);
    const active = item.durationSeconds ?? (item.reps ?? 0) * 4;
    expect(Number.isFinite(active) && active > 0).toBe(true);
  }
});
