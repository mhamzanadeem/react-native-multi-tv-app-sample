import { isWorkoutConfig } from '../../domain/workoutConfig';
import { isWorkoutSummary } from '../../data/workoutRepositories';
import { validatePlan } from '../workoutPlanner';
import { sameJson } from '../../utils/sameJson';
import type { WorkoutPlan } from '../../types/workout';
import type { Operation, Requests, ApiBody } from './contracts';

export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function correlation(value: unknown): string {
  return record(value) && typeof value.requestId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.requestId)
    ? value.requestId
    : 'invalid-request';
}
export function validRequest<K extends Operation>(operation: K, value: unknown): value is Requests[K] {
  if (!record(value) || typeof value.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.requestId))
    return false;
  if (operation === 'generate')
    return isWorkoutConfig(value) && new Set(value.equipment).size === value.equipment.length;
  if (operation === 'updatePreferences')
    return (
      isWorkoutConfig(value.preferences) &&
      new Set(value.preferences.equipment).size === value.preferences.equipment.length
    );
  if (operation === 'saveSession')
    return (
      value.completionState === 'completed' &&
      isWorkoutSummary(value.summary) &&
      value.summary.activeSeconds <=
        (Date.parse(value.summary.completedAt) - Date.parse(value.summary.startedAt)) / 1000
    );
  return true;
}
const codes = [
  'INVALID_WORKOUT_CONFIGURATION',
  'INVALID_REQUEST',
  'NO_MATCHING_PLAN',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
  'INVALID_RESPONSE',
  'CONFIGURATION_ERROR',
  'CONFLICT',
];
export function validResponse<K extends Operation>(
  operation: K,
  value: unknown,
  input: Requests[K],
): value is ApiBody<K> {
  if (!record(value) || value.requestId !== input.requestId) return false;
  if ('error' in value)
    return (
      record(value.error) &&
      typeof value.error.code === 'string' &&
      codes.includes(value.error.code) &&
      typeof value.error.message === 'string' &&
      value.error.message.length > 0
    );
  if (value.status !== 'success') return false;
  if (operation === 'generate') {
    if (
      !record(value.plan) ||
      value.planId !== value.plan.id ||
      typeof value.plan.id !== 'string' ||
      !value.plan.id ||
      typeof value.plan.title !== 'string' ||
      !value.plan.title ||
      typeof value.plan.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(value.plan.createdAt)) ||
      !Array.isArray(value.notes) ||
      !value.notes.every((n) => typeof n === 'string')
    )
      return false;
    try {
      const plan = value.plan as unknown as WorkoutPlan;
      const requested = input as Requests['generate'];
      if (
        !isWorkoutConfig(plan.config) ||
        plan.config.goal !== requested.goal ||
        plan.config.fitnessLevel !== requested.fitnessLevel ||
        plan.config.durationMinutes !== requested.durationMinutes ||
        !!plan.config.lowImpact !== !!requested.lowImpact ||
        JSON.stringify([...plan.config.equipment].sort()) !== JSON.stringify([...requested.equipment].sort())
      )
        return false;
      const options: (keyof typeof plan.config)[] = [
        'style',
        'bodyFocus',
        'position',
        'restPreference',
        'variation',
        'excludedExerciseIds',
      ];
      if (options.some((key) => !sameJson(plan.config[key], requested[key]))) return false;
      validatePlan(plan, requested);
      return true;
    } catch {
      return false;
    }
  }
  if (operation === 'history')
    return (
      Array.isArray(value.sessions) &&
      value.sessions.length <= 200 &&
      value.sessions.every(isWorkoutSummary) &&
      new Set(value.sessions.map((s) => s.id)).size === value.sessions.length &&
      typeof value.sampleData === 'boolean'
    );
  if (operation === 'saveSession')
    return (
      isWorkoutSummary(value.summary) &&
      value.sessionId === value.summary.id &&
      sameJson(value.summary, (input as Requests['saveSession']).summary)
    );
  if (!isWorkoutConfig(value.preferences)) return false;
  return (
    operation !== 'updatePreferences' ||
    sameJson(value.preferences, (input as Requests['updatePreferences']).preferences)
  );
}
