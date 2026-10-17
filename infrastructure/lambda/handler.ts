import {
  DEFAULT_CONFIG,
  isWorkoutConfig,
  WorkoutPlanningError,
} from '../../packages/shared-ui/src/domain/workoutConfig';
import { generatePlan } from '../../packages/shared-ui/src/utils/planGenerator';
import { validatePlan } from '../../packages/shared-ui/src/services/workoutPlanner';
import { sameJson } from '../../packages/shared-ui/src/utils/sameJson';
import { correlation, record, validRequest } from '../../packages/shared-ui/src/services/backend/validation';
import { routes, type Operation } from '../../packages/shared-ui/src/services/backend/contracts';
import type { WorkoutConfig, WorkoutPlan } from '../../packages/shared-ui/src/types/workout';
import type { WorkoutSummary } from '../../packages/shared-ui/src/domain/workoutSession';

/** A single synthetic, account-free workspace. Never treat this as user isolation. */
export interface DemoStore {
  get(key: string): Promise<unknown | null>;
  put(key: string, value: unknown): Promise<void>;
  putIfAbsent(key: string, value: unknown): Promise<boolean>;
  list(prefix: string, limit: number): Promise<unknown[]>;
}
export interface HttpEvent {
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string } };
  body?: string | null;
  isBase64Encoded?: boolean;
}
const configKeys = [
  'goal',
  'fitnessLevel',
  'durationMinutes',
  'equipment',
  'lowImpact',
  'style',
  'bodyFocus',
  'position',
  'restPreference',
  'excludedExerciseIds',
  'variation',
];
export function createHandler(store: DemoStore, newId: () => string, now = () => Date.now(), region = 'unknown') {
  return async (event: HttpEvent) => {
    let requestId = 'invalid-request';
    const reply = (statusCode: number, data: object) => ({
      statusCode,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ requestId, ...data }),
    });
    const fail = (status: number, code: string, message: string) => reply(status, { error: { code, message } });
    try {
      const method = event.requestContext?.http?.method;
      const path = event.rawPath;
      if (method === 'GET' && path === '/health') {
        const probe = { application: 'FormFit TV', checkedAt: new Date(now()).toISOString() };
        await store.put('HEALTH', probe);
        const saved = await store.get('HEALTH');
        if (!record(saved) || saved.application !== probe.application)
          return fail(503, 'SERVER_ERROR', 'Database verification failed.');
        return reply(200, {
          status: 'ok',
          application: 'FormFit TV',
          databaseVerified: true,
          checkedAt: probe.checkedAt,
          region,
          plannerVersion: 'rules-v2',
        });
      }
      const operation = (Object.keys(routes) as Operation[]).find(
        (key) => routes[key].method === method && routes[key].path === path,
      );
      if (!operation) return fail(404, 'NOT_FOUND', 'This endpoint is not available.');
      let input: unknown;
      if (method === 'GET') input = { requestId: event.headers?.['x-request-id'] ?? event.headers?.['X-Request-Id'] };
      else {
        if (event.isBase64Encoded || !event.body || event.body.length > 100000)
          return fail(400, 'INVALID_REQUEST', 'Send a JSON request smaller than 100 KB.');
        try {
          input = JSON.parse(event.body);
        } catch {
          return fail(400, 'INVALID_REQUEST', 'Request body must be valid JSON.');
        }
      }
      requestId = correlation(input);
      if (!record(input) || requestId === 'invalid-request' || !validRequest(operation, input))
        return fail(400, 'INVALID_REQUEST', 'Choose supported workout options and provide a valid requestId.');
      const payload = input as unknown as Record<string, unknown>;
      const allowed =
        operation === 'generate'
          ? [...configKeys, 'requestId']
          : operation === 'saveSession'
            ? ['requestId', 'summary', 'completionState']
            : operation === 'updatePreferences'
              ? ['requestId', 'preferences']
              : ['requestId'];
      if (Object.keys(input).some((key) => !allowed.includes(key)))
        return fail(
          400,
          'INVALID_REQUEST',
          'Unknown request fields. Use the documented structured choices; unrestricted text requests are not supported.',
        );
      if (operation === 'generate') {
        const config = Object.fromEntries(
          configKeys.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]),
        ) as unknown as WorkoutConfig;
        const requestKey = `REQUEST#${requestId}`;
        let plan: WorkoutPlan;
        const previous = await store.get(requestKey);
        if (record(previous)) {
          if (!sameJson(previous.config, config))
            return fail(
              409,
              'CONFLICT',
              'This requestId already belongs to different preferences. Use a new requestId.',
            );
          plan = previous.plan as WorkoutPlan;
        } else {
          plan = generatePlan(config);
          plan.id = `plan-${newId()}`;
          plan.source = 'aws';
          plan.createdAt = new Date(now()).toISOString();
          validatePlan(plan, config);
          if (!(await store.putIfAbsent(requestKey, { config, plan }))) {
            const winner = await store.get(requestKey);
            if (!record(winner) || !sameJson(winner.config, config))
              return fail(409, 'CONFLICT', 'Concurrent requestId conflict. Retry with a new requestId.');
            plan = winner.plan as WorkoutPlan;
          }
        }
        // Retrying repairs a plan projection if a previous write was interrupted.
        await store.putIfAbsent(`PLAN#${plan.id}`, plan);
        return reply(200, { status: 'success', planId: plan.id, plan, notes: plan.notes ?? [] });
      }
      if (operation === 'history') {
        const sessions = await store.list('HISTORY#', 200);
        const plans = await store.list('PLAN#', 200);
        return reply(200, { status: 'success', sessions, plans, sampleData: false });
      }
      if (operation === 'saveSession') {
        const summary = payload.summary as WorkoutSummary;
        const plan = (await store.get(`PLAN#${summary.planId}`)) as WorkoutPlan | null;
        if (!plan)
          return fail(404, 'NOT_FOUND', 'Generate this plan in this demo workspace before uploading its completion.');
        if (
          summary.exerciseCount !== plan.exercises.length ||
          summary.goal !== plan.goal ||
          summary.fitnessLevel !== plan.fitnessLevel ||
          summary.title !== plan.title ||
          Date.parse(summary.completedAt) > now() + 300000 ||
          Date.parse(summary.startedAt) < Date.parse(plan.createdAt) - 300000
        )
          return fail(
            400,
            'INVALID_REQUEST',
            'Completion facts do not match this plan or contain inconsistent timestamps.',
          );
        const created = await store.putIfAbsent(`SESSION#${summary.id}`, summary);
        if (!created && !sameJson(await store.get(`SESSION#${summary.id}`), summary))
          return fail(409, 'CONFLICT', 'This session ID already has different completion facts.');
        // A separate date-ordered projection supports latest-200 queries without scans.
        const timestamp = new Date(summary.completedAt).toISOString();
        await store.putIfAbsent(`HISTORY#${timestamp}#${summary.id}`, summary);
        return reply(created ? 201 : 200, { status: 'success', sessionId: summary.id, summary });
      }
      if (operation === 'getPreferences')
        return reply(200, { status: 'success', preferences: (await store.get('PREFERENCES')) ?? DEFAULT_CONFIG });
      const preferences = payload.preferences;
      if (!isWorkoutConfig(preferences) || Object.keys(preferences).some((key) => !configKeys.includes(key)))
        return fail(400, 'INVALID_REQUEST', 'Unsupported preference fields.');
      await store.put('PREFERENCES', preferences);
      return reply(200, { status: 'success', preferences });
    } catch (error) {
      if (error instanceof WorkoutPlanningError)
        return fail(
          error.code === 'NO_EXERCISES' ? 422 : 400,
          error.code === 'NO_EXERCISES' ? 'NO_MATCHING_PLAN' : 'INVALID_WORKOUT_CONFIGURATION',
          error.message,
        );
      console.error('FormFit request failed', {
        requestId,
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      // Never return database errors, stack traces or AWS credentials to the client.
      return fail(
        503,
        'SERVER_ERROR',
        'The cloud planner is temporarily unavailable. Retry or choose an offline plan.',
      );
    }
  };
}
