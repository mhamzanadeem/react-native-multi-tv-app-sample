import { EXERCISES } from '../../../packages/shared-ui/src/data/exercises';
import { DEFAULT_CONFIG, isWorkoutConfig } from '../../../packages/shared-ui/src/domain/workoutConfig';
import { generatePlan } from '../../../packages/shared-ui/src/utils/planGenerator';
import { acceptRecommendation, validatePlan } from '../../../packages/shared-ui/src/services/workoutPlanner';
import { createSession, sessionReducer, summarizeSession } from '../../../packages/shared-ui/src/domain/workoutSession';
import { createRepositories } from '../../../packages/shared-ui/src/data/workoutRepositories';
import { memoryStorage } from '../../../packages/shared-ui/src/data/storageTypes';
import type { WorkoutConfig, WorkoutGoal } from '../../../packages/shared-ui/src/types/workout';

it.each(['cardio', 'flexibility', 'mobility', 'strength', 'general-fitness'] as WorkoutGoal[])(
  'personalizes the new %s goal',
  (goal) => {
    const config = { ...DEFAULT_CONFIG, goal, durationMinutes: 45 as const };
    const plan = generatePlan(config);
    validatePlan(plan);
    expect(
      plan.exercises.every(
        (item) => item.exercise.goals.includes(goal) && item.exercise.lowImpact && item.exercise.equipment.length === 0,
      ),
    ).toBe(true);
    expect(plan.estimatedDurationSeconds).toBeGreaterThan(45 * 60 - 180);
  },
);
it('honors low impact while allowing suitable advanced impact exercises when selected', () => {
  const config: WorkoutConfig = {
    ...DEFAULT_CONFIG,
    goal: 'cardio',
    fitnessLevel: 'advanced',
    durationMinutes: 45,
    lowImpact: false,
  };
  expect(generatePlan(config).exercises.some((item) => !item.exercise.lowImpact)).toBe(true);
  expect(generatePlan({ ...config, lowImpact: true }).exercises.every((item) => item.exercise.lowImpact)).toBe(true);
});
it.each([
  { ...DEFAULT_CONFIG, lowImpact: 'yes' },
  { ...DEFAULT_CONFIG, goal: '__proto__' },
  { ...DEFAULT_CONFIG, equipment: [null] },
])('rejects invalid runtime config %j', (value) => {
  expect(isWorkoutConfig(value)).toBe(false);
});
it('keeps exercise selection deterministic and exposes complete catalogue guidance', () => {
  expect(generatePlan(DEFAULT_CONFIG).exercises).toEqual(generatePlan(DEFAULT_CONFIG).exercises);
  for (const exercise of EXERCISES) {
    expect(exercise.techniqueCues.length).toBeGreaterThan(0);
    expect(exercise.muscles.length).toBeGreaterThan(0);
  }
});
it('rejects unknown, unsuitable or altered recommendations before sessions can run', () => {
  expect(() => acceptRecommendation({ exerciseIds: ['unknown'] }, DEFAULT_CONFIG)).toThrow('unknown exercise');
  expect(() => acceptRecommendation({ exerciseIds: ['dumbbell-row'] }, DEFAULT_CONFIG)).toThrow(
    'unavailable equipment',
  );
  const plan = generatePlan(DEFAULT_CONFIG);
  const changed = { ...plan, exercises: plan.exercises.map((item, index) => (index ? item : { ...item, sets: 999 })) };
  expect(() => validatePlan(changed)).toThrow('altered guidance');
  expect(() =>
    acceptRecommendation({ exerciseIds: plan.exercises.map((item) => item.exercise.id) }, DEFAULT_CONFIG),
  ).not.toThrow();
});
it('completes the actual setup-plan-session-history journey without a cloud service', async () => {
  const plan = generatePlan({ ...DEFAULT_CONFIG, goal: 'flexibility' });
  validatePlan(plan);
  let session = sessionReducer(createSession(plan), { type: 'start', now: 1000 });
  session = sessionReducer(session, { type: 'tick', now: 1000 + plan.estimatedDurationSeconds * 1000 });
  const summary = summarizeSession(session);
  const repo = createRepositories(memoryStorage());
  await repo.history.append(summary);
  expect((await repo.history.list())[0].completedExercises).toBe(plan.exercises.length);
  expect((await repo.history.list())[0].activeSeconds).toBe(plan.estimatedDurationSeconds);
});
it('requires a declared stable chair for seated exercises', () => {
  const withoutChair = generatePlan({ ...DEFAULT_CONFIG, goal: 'flexibility', durationMinutes: 30 });
  expect(withoutChair.exercises.some((item) => item.exercise.id === 'hamstring-stretch')).toBe(false);
  const withChair = generatePlan({ ...DEFAULT_CONFIG, goal: 'flexibility', durationMinutes: 30, equipment: ['chair'] });
  expect(withChair.exercises.some((item) => item.exercise.id === 'hamstring-stretch')).toBe(true);
});
it('rejects recommendations too short for the requested time', () => {
  expect(() => acceptRecommendation({ exerciseIds: ['march-in-place'] }, DEFAULT_CONFIG)).toThrow(
    'duration is invalid',
  );
});
it('includes upper/lower strength and cardio even in a short general-fitness plan', () => {
  const plan = generatePlan(DEFAULT_CONFIG);
  expect(plan.exercises.some((item) => item.exercise.id === 'bodyweight-squat')).toBe(true);
  expect(plan.exercises.some((item) => item.exercise.id === 'wall-push-up')).toBe(true);
  expect(plan.exercises.some((item) => item.exercise.category === 'cardio')).toBe(true);
});
it('rejects repeated recommendation IDs while suitable alternatives remain unused', () => {
  expect(() => acceptRecommendation({ exerciseIds: Array(6).fill('march-in-place') }, DEFAULT_CONFIG)).toThrow(
    'repeats an exercise',
  );
});
it('copies exercise metadata so altered plan guidance cannot mutate the trusted catalogue', () => {
  const plan = generatePlan(DEFAULT_CONFIG);
  const canonical = EXERCISES.find((item) => item.id === plan.exercises[0].exercise.id);
  const originalCue = canonical?.techniqueCues[0];
  plan.exercises[0].exercise.techniqueCues[0] = 'Altered guidance';
  expect(canonical?.techniqueCues[0]).toBe(originalCue);
  expect(() => validatePlan(plan)).toThrow('altered guidance');
});
