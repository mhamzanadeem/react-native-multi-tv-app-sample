import { AwsWorkoutBackend } from './backend/AwsWorkoutBackend';
import type { WorkoutConfig, WorkoutPlan } from '../types/workout';
import type { WorkoutSummary } from '../domain/workoutSession';

// Public API origin supplied during console setup. This contains no credentials.
export const CLOUD_DEMO_URL = 'https://hqlgs1kwjf.execute-api.us-east-1.amazonaws.com';
const backend = new AwsWorkoutBackend({ mode: 'aws', baseUrl: CLOUD_DEMO_URL, timeoutMs: 10000 });
function requestId() {
  return `tv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
export async function generateCloudPlan(config: WorkoutConfig): Promise<WorkoutPlan> {
  const result = await backend.request('generate', { ...config, requestId: requestId() });
  if ('error' in result.body)
    throw Object.assign(new Error(`AWS planner: ${result.body.error.message}`), { code: result.body.error.code });
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
  const result = await backend.request('history', { requestId: requestId() });
  if ('error' in result.body) throw new Error(`AWS demo history: ${result.body.error.message}`);
  return result.body.sessions;
}
