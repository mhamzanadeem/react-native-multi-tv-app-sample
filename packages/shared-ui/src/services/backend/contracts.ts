import type { WorkoutConfig, WorkoutPlan } from '../../types/workout';
import type { WorkoutSummary } from '../../domain/workoutSession';

export type Operation = 'generate' | 'history' | 'saveSession' | 'getPreferences' | 'updatePreferences';
export const routes: Record<Operation, { method: string; path: string }> = {
  generate: { method: 'POST', path: '/v1/workouts/generate' },
  history: { method: 'GET', path: '/v1/workouts/history' },
  saveSession: { method: 'POST', path: '/v1/workouts/sessions' },
  getPreferences: { method: 'GET', path: '/v1/users/preferences' },
  updatePreferences: { method: 'PUT', path: '/v1/users/preferences' },
};
export interface Requests {
  generate: WorkoutConfig & { requestId: string };
  history: { requestId: string };
  saveSession: { requestId: string; completionState: 'completed'; summary: WorkoutSummary };
  getPreferences: { requestId: string };
  updatePreferences: { requestId: string; preferences: WorkoutConfig };
}
export interface Responses {
  generate: { planId: string; plan: WorkoutPlan; notes: string[] };
  history: { sessions: WorkoutSummary[]; plans?: WorkoutPlan[]; sampleData: boolean };
  saveSession: { sessionId: string; summary: WorkoutSummary };
  getPreferences: { preferences: WorkoutConfig };
  updatePreferences: { preferences: WorkoutConfig };
}
export type ErrorCode =
  | 'INVALID_WORKOUT_CONFIGURATION'
  | 'INVALID_REQUEST'
  | 'NO_MATCHING_PLAN'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT';
export interface ApiError {
  code: ErrorCode;
  message: string;
}
export type ApiBody<K extends Operation> =
  | ({ requestId: string; status: 'success' } & Responses[K])
  | { requestId: string; error: ApiError };
export interface ApiResult<K extends Operation> {
  mode: 'mock' | 'aws';
  httpStatus: number | null;
  fixture: string | null;
  body: ApiBody<K>;
}
export interface WorkoutBackend {
  readonly mode: 'mock' | 'aws';
  request<K extends Operation>(operation: K, input: unknown, scenario?: string): Promise<ApiResult<K>>;
}
export function failure<K extends Operation>(
  mode: 'mock' | 'aws',
  requestId: string,
  code: ErrorCode,
  message: string,
  httpStatus: number | null,
  fixture: string | null = null,
): ApiResult<K> {
  return { mode, httpStatus, fixture, body: { requestId, error: { code, message } } };
}
