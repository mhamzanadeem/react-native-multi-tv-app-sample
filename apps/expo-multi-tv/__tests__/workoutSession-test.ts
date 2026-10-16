import {
  createSession,
  sessionReducer,
  buildTimeline,
  summarizeSession,
} from '../../../packages/shared-ui/src/domain/workoutSession';
import { generatePlan } from '../../../packages/shared-ui/src/utils/planGenerator';
import { DEFAULT_CONFIG } from '../../../packages/shared-ui/src/domain/workoutConfig';

function fresh() {
  return createSession(generatePlan(DEFAULT_CONFIG));
}
it('timeline matches the actual plan estimate and has no final transition', () => {
  const state = fresh();
  expect(buildTimeline(state.plan).reduce((sum, step) => sum + step.seconds, 0)).toBe(
    state.plan.estimatedDurationSeconds,
  );
  expect(state.steps[state.steps.length - 1].kind).toBe('exercise');
});
it('starts once, pauses without accruing time, and resumes without counting the pause', () => {
  const ready = fresh();
  let state = sessionReducer(ready, { type: 'start', now: 1000 });
  state = sessionReducer(state, { type: 'start', now: 2000 });
  expect(state.startedAt).toBe(1000);
  state = sessionReducer(state, { type: 'tick', now: 6000 });
  expect(state.activeMs).toBe(5000);
  state = sessionReducer(state, { type: 'pause', now: 7000 });
  const paused = state;
  expect(sessionReducer(paused, { type: 'tick', now: 100000 })).toBe(paused);
  state = sessionReducer(state, { type: 'resume', now: 100000 });
  state = sessionReducer(state, { type: 'tick', now: 102000 });
  expect(state.activeMs).toBe(8000);
});
it('advances through exercise, rest, sets and transitions using elapsed time', () => {
  let state = sessionReducer(fresh(), { type: 'start', now: 0 });
  const firstWork = state.steps[0].seconds;
  state = sessionReducer(state, { type: 'tick', now: firstWork * 1000 });
  expect(state.steps[state.stepIndex].kind).toBe('rest');
  state = sessionReducer(state, { type: 'tick', now: state.plan.exercises[0].estimatedSeconds * 1000 });
  expect(state.completed).toEqual([0]);
  expect(state.steps[state.stepIndex].kind).toBe('transition');
});
it('delayed ticks finish at the planned boundary and terminal states cannot restart', () => {
  let state = sessionReducer(fresh(), { type: 'start', now: 1000 });
  const duration = state.plan.estimatedDurationSeconds * 1000;
  state = sessionReducer(state, { type: 'tick', now: 1000 + duration + 50000 });
  expect(state.status).toBe('completed');
  expect(state.activeMs).toBe(duration);
  expect(state.finishedAt).toBe(1000 + duration);
  expect(state.completed.length).toBe(state.plan.exercises.length);
  expect(sessionReducer(state, { type: 'resume', now: 999999 })).toBe(state);
  expect(summarizeSession(state).completedExercises).toBe(state.plan.exercises.length);
});
it('skips an entire exercise without counting it as completed', () => {
  let state = sessionReducer(fresh(), { type: 'start', now: 1000 });
  state = sessionReducer(state, { type: 'skip', now: 2000 });
  expect(state.skipped).toEqual([0]);
  expect(state.completed).toEqual([]);
  expect(state.steps[state.stepIndex].exerciseIndex).toBe(1);
  state = sessionReducer(state, { type: 'tick', now: 9999999 });
  const summary = summarizeSession(state);
  expect(summary.completedExercises + summary.skippedExercises).toBe(summary.exerciseCount);
  expect(summary.activeSeconds).toBeLessThan(state.plan.estimatedDurationSeconds);
});
it('manual next finishes one step, not an entire workout; paused steps remain paused', () => {
  let state = sessionReducer(fresh(), { type: 'start', now: 1000 });
  state = sessionReducer(state, { type: 'pause', now: 2000 });
  state = sessionReducer(state, { type: 'next', now: 3000 });
  expect(state.status).toBe('paused');
  expect(state.stepIndex).toBe(1);
  expect(state.activeMs).toBe(1000);
});
it('abandonment is terminal and cannot produce a completed history entry', () => {
  let state = sessionReducer(fresh(), { type: 'start', now: 1000 });
  state = sessionReducer(state, { type: 'abandon', now: 2000 });
  expect(state.status).toBe('abandoned');
  expect(() => summarizeSession(state)).toThrow('Only completed');
  expect(sessionReducer(state, { type: 'tick', now: 3000 })).toBe(state);
});
it('ignores backwards/non-finite clocks and invalid transitions from ready', () => {
  const ready = fresh();
  expect(sessionReducer(ready, { type: 'next', now: 0 })).toBe(ready);
  let state = sessionReducer(ready, { type: 'start', now: 1000 });
  state = sessionReducer(state, { type: 'tick', now: 500 });
  expect(state.activeMs).toBe(0);
  expect(state.lastTickAt).toBe(1000);
  expect(sessionReducer(state, { type: 'tick', now: NaN })).toBe(state);
});
it('rejects zero-set, negative-rest, or non-finite exercise timing', () => {
  const plan = generatePlan(DEFAULT_CONFIG);
  for (const patch of [{ sets: 0 }, { restSeconds: -1 }, { restSeconds: NaN }, { durationSeconds: Infinity }]) {
    expect(() => buildTimeline({ ...plan, exercises: [{ ...plan.exercises[0], ...patch }] })).toThrow(
      'Invalid exercise timing',
    );
  }
});
