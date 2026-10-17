import { AwsWorkoutBackend } from './backend/AwsWorkoutBackend';
import type { WorkoutConfig, WorkoutPlan } from '../types/workout';
import type { WorkoutSummary } from '../domain/workoutSession';
import { getInstallationId } from '../data/guestInstallation';

// Public API origin supplied during console setup. This contains no credentials.
export const CLOUD_DEMO_URL = 'https://hqlgs1kwjf.execute-api.us-east-1.amazonaws.com';
const backend = new AwsWorkoutBackend(
  { mode: 'aws', baseUrl: CLOUD_DEMO_URL, timeoutMs: 10000 },
  undefined,
  getInstallationId,
);
function requestId() {
  return `tv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
export async function generateCloudPlan(config: WorkoutConfig): Promise<WorkoutPlan> {
  const input = { ...config, requestId: requestId() };
  // Development diagnostics correlate the TV's exact choices with one API call.
  // Never log tokens, headers, session history, or arbitrary response bodies.
  if (__DEV__) console.info('[FormFit planner] request', JSON.stringify(input));
  const result = await backend.request('generate', input);
  if ('error' in result.body) {
    if (__DEV__)
      console.info(
        '[FormFit planner] rejected',
        JSON.stringify({ requestId: input.requestId, code: result.body.error.code, httpStatus: result.httpStatus }),
      );
    throw Object.assign(new Error(`AWS planner: ${result.body.error.message}`), { code: result.body.error.code });
  }
  if (__DEV__)
    console.info(
      '[FormFit planner] accepted',
      JSON.stringify({
        requestId: input.requestId,
        planId: result.body.plan.id,
        fitnessLevel: result.body.plan.fitnessLevel,
        targetDurationMinutes: result.body.plan.targetDurationMinutes,
        estimatedDurationSeconds: result.body.plan.estimatedDurationSeconds,
        exercises: result.body.plan.exercises.length,
      }),
    );
  return result.body.plan;
}
export async function saveCloudSession(summary: WorkoutSummary): Promise<void> {
  const result = await backend.request('saveSession', {
    requestId: requestId(),
    completionState: 'completed',
    summary,
  });
  if ('error' in result.body)
    throw new Error(
      `Saved on this TV, but the AWS demo save failed: ${result.body.error.message} Retry saving while this screen is open.`,
    );
}
export async function listCloudSessions(): Promise<WorkoutSummary[]> {
  return (await listCloudActivity()).sessions;
}
export async function listCloudActivity(): Promise<{
  sessions: WorkoutSummary[];
  plans: WorkoutPlan[];
  plansSupported: boolean;
}> {
  const result = await backend.request('history', { requestId: requestId() });
  if ('error' in result.body) throw new Error(`AWS demo history: ${result.body.error.message}`);
  return {
    sessions: result.body.sessions,
    plans: result.body.plans ?? [],
    plansSupported: result.body.plans !== undefined,
  };
}
