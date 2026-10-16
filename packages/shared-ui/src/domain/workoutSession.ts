import type { WorkoutGoal, FitnessLevel, WorkoutPlan } from '../types/workout';

export type SessionStatus = 'ready' | 'running' | 'paused' | 'completed' | 'abandoned';
export interface SessionStep {
  kind: 'exercise' | 'rest' | 'transition';
  exerciseIndex: number;
  set: number;
  seconds: number;
  lastSet: boolean;
}
export interface SessionState {
  plan: WorkoutPlan;
  steps: SessionStep[];
  status: SessionStatus;
  stepIndex: number;
  remainingMs: number;
  activeMs: number;
  completed: number[];
  skipped: number[];
  startedAt: number | null;
  finishedAt: number | null;
  lastTickAt: number | null;
}
export type SessionAction = { type: 'start' | 'pause' | 'resume' | 'tick' | 'next' | 'skip' | 'abandon'; now: number };
export interface WorkoutSummary {
  id: string;
  planId: string;
  title: string;
  goal: WorkoutGoal;
  fitnessLevel: FitnessLevel;
  exerciseCount: number;
  completedExercises: number;
  skippedExercises: number;
  activeSeconds: number;
  startedAt: string;
  completedAt: string;
}
export function buildTimeline(plan: WorkoutPlan): SessionStep[] {
  const steps: SessionStep[] = [];
  plan.exercises.forEach((item, exerciseIndex) => {
    if (
      !Number.isInteger(item.sets) ||
      item.sets < 1 ||
      item.sets > 10 ||
      !Number.isFinite(item.restSeconds) ||
      item.restSeconds < 0
    ) {
      throw new Error('Invalid exercise timing. Generate a new workout.');
    }
    for (let set = 1; set <= item.sets; set++) {
      const seconds = item.durationSeconds ?? (item.reps ?? 10) * 4;
      if (!Number.isFinite(seconds) || seconds <= 0)
        throw new Error('Invalid exercise timing. Generate a new workout.');
      steps.push({ kind: 'exercise', exerciseIndex, set, seconds, lastSet: set === item.sets });
      if (set < item.sets && item.restSeconds > 0)
        steps.push({ kind: 'rest', exerciseIndex, set, seconds: item.restSeconds, lastSet: false });
    }
    if (exerciseIndex < plan.exercises.length - 1)
      steps.push({ kind: 'transition', exerciseIndex, set: item.sets, seconds: 15, lastSet: false });
  });
  return steps;
}
export function createSession(plan: WorkoutPlan): SessionState {
  const steps = buildTimeline(plan);
  if (!steps.length) throw new Error('A workout needs at least one exercise.');
  return {
    plan,
    steps,
    status: 'ready',
    stepIndex: 0,
    remainingMs: steps[0].seconds * 1000,
    activeMs: 0,
    completed: [],
    skipped: [],
    startedAt: null,
    finishedAt: null,
    lastTickAt: null,
  };
}
function finishStep(state: SessionState, now: number): SessionState {
  const step = state.steps[state.stepIndex];
  const completed =
    step.kind === 'exercise' && step.lastSet && !state.completed.includes(step.exerciseIndex)
      ? [...state.completed, step.exerciseIndex]
      : state.completed;
  const stepIndex = state.stepIndex + 1;
  if (stepIndex >= state.steps.length)
    return { ...state, completed, stepIndex, remainingMs: 0, status: 'completed', finishedAt: now, lastTickAt: null };
  return { ...state, completed, stepIndex, remainingMs: state.steps[stepIndex].seconds * 1000 };
}
function advanceClock(state: SessionState, now: number): SessionState {
  if (state.status !== 'running' || state.lastTickAt === null) return state;
  let remainingDelta = Math.max(0, now - state.lastTickAt);
  let next: SessionState = { ...state, lastTickAt: Math.max(now, state.lastTickAt) };
  while (remainingDelta > 0 && next.status === 'running') {
    const used = Math.min(remainingDelta, next.remainingMs);
    next = { ...next, remainingMs: next.remainingMs - used, activeMs: next.activeMs + used };
    remainingDelta -= used;
    if (next.remainingMs === 0) next = finishStep(next, now - remainingDelta);
  }
  return next;
}
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (!Number.isFinite(action.now) || state.status === 'completed' || state.status === 'abandoned') return state;
  if (action.type === 'start' && state.status === 'ready')
    return { ...state, status: 'running', startedAt: action.now, lastTickAt: action.now };
  if (action.type === 'resume' && state.status === 'paused')
    return { ...state, status: 'running', lastTickAt: action.now };
  if (action.type === 'abandon')
    return { ...advanceClock(state, action.now), status: 'abandoned', finishedAt: action.now, lastTickAt: null };
  if (state.status !== 'running' && state.status !== 'paused') return state;
  const next = advanceClock(state, action.now);
  if (next.status === 'completed') return next;
  if (action.type === 'tick') return next;
  if (action.type === 'pause') return { ...next, status: 'paused', lastTickAt: null };
  if (action.type === 'next') return finishStep(next, action.now);
  if (action.type === 'skip') {
    const index = next.steps[next.stepIndex].exerciseIndex;
    // Transition belongs to the exercise already completed; skip advances the transition only.
    if (next.steps[next.stepIndex].kind === 'transition') return finishStep(next, action.now);
    let stepIndex = next.stepIndex;
    while (stepIndex < next.steps.length && next.steps[stepIndex].exerciseIndex === index) stepIndex++;
    const skipped = next.skipped.includes(index) ? next.skipped : [...next.skipped, index];
    if (stepIndex === next.steps.length)
      return {
        ...next,
        skipped,
        stepIndex,
        remainingMs: 0,
        status: 'completed',
        finishedAt: action.now,
        lastTickAt: null,
      };
    return { ...next, skipped, stepIndex, remainingMs: next.steps[stepIndex].seconds * 1000 };
  }
  return next;
}
export function summarizeSession(state: SessionState): WorkoutSummary {
  if (state.status !== 'completed' || state.startedAt === null || state.finishedAt === null)
    throw new Error('Only completed sessions can be recorded.');
  return {
    id: `${state.plan.id}-session-${state.startedAt}`,
    planId: state.plan.id,
    title: state.plan.title,
    goal: state.plan.goal,
    fitnessLevel: state.plan.fitnessLevel,
    exerciseCount: state.plan.exercises.length,
    completedExercises: state.completed.length,
    skippedExercises: state.skipped.length,
    activeSeconds: Math.floor(state.activeMs / 1000),
    startedAt: new Date(state.startedAt).toISOString(),
    completedAt: new Date(state.finishedAt).toISOString(),
  };
}
