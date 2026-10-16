import { EXERCISES } from '../../../packages/shared-ui/src/data/exercises';
import {
  DEFAULT_CONFIG,
  isWorkoutConfig,
  WorkoutPlanningError,
} from '../../../packages/shared-ui/src/domain/workoutConfig';
import { WORKOUT_STYLES, exercisePosition } from '../../../packages/shared-ui/src/domain/workoutCustomization';
import { generatePlan } from '../../../packages/shared-ui/src/utils/planGenerator';
import { validatePlan } from '../../../packages/shared-ui/src/services/workoutPlanner';
import { validResponse } from '../../../packages/shared-ui/src/services/backend/validation';
import type {
  BodyFocus,
  FitnessLevel,
  MovementPosition,
  WorkoutConfig,
  WorkoutDuration,
  WorkoutEquipment,
} from '../../../packages/shared-ui/src/types/workout';

const gear: WorkoutEquipment[] = [
  'dumbbells',
  'resistance-band',
  'exercise-mat',
  'chair',
  'kettlebell',
  'stationary-bike',
  'rowing-machine',
];
test.each(WORKOUT_STYLES)(
  '$label respects limits across level, impact, position, focus and duration combinations',
  (style) => {
    let successes = 0;
    for (const fitnessLevel of ['beginner', 'intermediate', 'advanced'] as FitnessLevel[])
      for (const lowImpact of [true, false])
        for (const position of ['any', 'standing-only', 'seated-only'] as MovementPosition[])
          for (const bodyFocus of ['full-body', 'upper-body', 'lower-body', 'core'] as BodyFocus[])
            for (const durationMinutes of [5, 20, 60] as WorkoutDuration[]) {
              const config: WorkoutConfig = {
                ...DEFAULT_CONFIG,
                goal: style.goals[0],
                style: style.id,
                equipment: gear,
                fitnessLevel,
                lowImpact,
                position,
                bodyFocus,
                durationMinutes,
                restPreference: 'extra',
              };
              let plan;
              try {
                plan = generatePlan(config);
              } catch (error) {
                expect(error).toBeInstanceOf(WorkoutPlanningError);
                expect((error as WorkoutPlanningError).code).toBe('NO_EXERCISES');
                continue;
              }
              successes++;
              try {
                validatePlan(plan, config);
              } catch (error) {
                throw new Error(
                  JSON.stringify({
                    config,
                    estimate: plan.estimatedDurationSeconds,
                    timings: plan.exercises.map((item) => item.estimatedSeconds),
                  }) + String(error),
                );
              }
              for (const item of plan.exercises) {
                expect(item.exercise.equipment.every((equipment) => config.equipment.includes(equipment))).toBe(true);
                if (lowImpact) expect(item.exercise.lowImpact).toBe(true);
                if (position === 'standing-only') expect(exercisePosition(item.exercise)).toBe('standing');
                if (position === 'seated-only') expect(exercisePosition(item.exercise)).toBe('seated');
              }
              expect(plan.estimatedDurationSeconds).toBeLessThanOrEqual(durationMinutes * 60 + 60);
              expect(plan.estimatedDurationSeconds).toBeGreaterThanOrEqual(durationMinutes * 60 - 180);
            }
    expect(successes).toBeGreaterThan(0);
  },
);
test('exclusions and variation change actual selections without mutating input', () => {
  const config: WorkoutConfig = {
    ...DEFAULT_CONFIG,
    style: 'indoor-walking',
    excludedExerciseIds: ['march-in-place'],
    variation: 1,
  };
  const saved = JSON.stringify(config);
  const plan = generatePlan(config);
  expect(plan.exercises.every((item) => item.exercise.id !== 'march-in-place')).toBe(true);
  expect(JSON.stringify(config)).toBe(saved);
  expect(plan.exercises[0].exercise.id).not.toBe(generatePlan({ ...config, variation: 0 }).exercises[0].exercise.id);
  expect(() => generatePlan({ ...config, excludedExerciseIds: EXERCISES.map((item) => item.id) })).toThrow(
    'No suitable exercises',
  );
});
test.each([
  { style: 'cycling', equipment: [] },
  { style: 'hiit', fitnessLevel: 'beginner' },
  { style: 'pilates', equipment: ['exercise-mat'], position: 'standing-only' },
  { style: 'yoga', goal: 'strength' },
])('does not silently relax conflicting constraints: %j', (options) => {
  expect(() => generatePlan({ ...DEFAULT_CONFIG, ...options } as WorkoutConfig)).toThrow();
});
test.each([
  { variation: -1 },
  { variation: 10000 },
  { variation: NaN },
  { style: 'medical-rehab' },
  { position: 'anything' },
  { excludedExerciseIds: ['../bad'] },
  { excludedExerciseIds: ['wall-plank', 'wall-plank'] },
  { equipment: ['chair', 'chair'] },
  { durationMinutes: 90 },
])('rejects malformed customization: %j', (options) => {
  expect(isWorkoutConfig({ ...DEFAULT_CONFIG, ...options })).toBe(false);
});
test('rejects unknown exclusions and altered server timing or constraints', () => {
  expect(isWorkoutConfig({ ...DEFAULT_CONFIG, restPreference: { toString: 'extra' } })).toBe(false);
  expect(() => generatePlan({ ...DEFAULT_CONFIG, excludedExerciseIds: ['not-in-catalogue'] })).toThrow('unknown');
  const config: WorkoutConfig = {
    ...DEFAULT_CONFIG,
    goal: 'cardio',
    style: 'cardio-intervals',
    restPreference: 'extra',
  };
  const plan = generatePlan(config);
  plan.exercises[0].restSeconds = 0;
  expect(() => validatePlan(plan, config)).toThrow();
  const correct = generatePlan(config);
  expect(
    validResponse(
      'generate',
      { requestId: 'custom', status: 'success', planId: correct.id, plan: correct, notes: [] },
      { ...config, requestId: 'custom' },
    ),
  ).toBe(true);
  correct.config.style = 'steady-cardio';
  expect(
    validResponse(
      'generate',
      { requestId: 'custom', status: 'success', planId: correct.id, plan: correct, notes: [] },
      { ...config, requestId: 'custom' },
    ),
  ).toBe(false);
});
