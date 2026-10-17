import { createHandler, type DemoStore } from '../../../infrastructure/lambda/handler';
import { DEFAULT_CONFIG } from '../../../packages/shared-ui/src/domain/workoutConfig';
import { validResponse } from '../../../packages/shared-ui/src/services/backend/validation';

const now = Date.parse('2026-10-16T12:00:00Z');
function setup() {
  const rows = new Map<string, unknown>();
  const copy = (value: unknown) => JSON.parse(JSON.stringify(value));
  const store: DemoStore = {
    get: jest.fn(async (key) => (rows.has(key) ? copy(rows.get(key)) : null)),
    put: jest.fn(async (key, value) => {
      rows.set(key, copy(value));
    }),
    putIfAbsent: jest.fn(async (key, value) => {
      if (rows.has(key)) return false;
      rows.set(key, copy(value));
      return true;
    }),
    list: jest.fn(async (prefix, limit) =>
      [...rows.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, limit)
        .map(([, value]) => copy(value)),
    ),
  };
  let ids = 0;
  const handler = createHandler(
    store,
    () => `test-${++ids}`,
    () => now,
  );
  async function call(path: string, method: string, input: object) {
    const result = await handler({
      rawPath: path,
      requestContext: { http: { method } },
      headers: { 'x-request-id': 'read-test' },
      body: method === 'GET' ? undefined : JSON.stringify(input),
    });
    return { status: result.statusCode, body: JSON.parse(result.body) };
  }
  return { handler, call, store, rows };
}
test('real handler generates, persists, deduplicates, saves and reads history using the app contract', async () => {
  const { call } = setup();
  const input = {
    ...DEFAULT_CONFIG,
    requestId: 'plan-test',
    style: 'indoor-walking' as const,
    position: 'standing-only' as const,
    variation: 1,
  };
  const first = await call('/v1/workouts/generate', 'POST', input);
  expect(first.status).toBe(200);
  expect(validResponse('generate', first.body, input)).toBe(true);
  expect((await call('/v1/workouts/generate', 'POST', input)).body.planId).toBe(first.body.planId);
  expect((await call('/v1/workouts/generate', 'POST', { ...input, durationMinutes: 30 })).status).toBe(409);
  const plan = first.body.plan;
  const summary = {
    id: 'completion-1',
    planId: plan.id,
    title: plan.title,
    goal: plan.goal,
    fitnessLevel: plan.fitnessLevel,
    exerciseCount: plan.exercises.length,
    completedExercises: plan.exercises.length,
    skippedExercises: 0,
    activeSeconds: 60,
    startedAt: new Date(now - 60000).toISOString(),
    completedAt: new Date(now).toISOString(),
  };
  const save = { requestId: 'save-test', completionState: 'completed', summary };
  expect((await call('/v1/workouts/sessions', 'POST', save)).status).toBe(201);
  expect((await call('/v1/workouts/sessions', 'POST', save)).status).toBe(200);
  expect(
    (await call('/v1/workouts/sessions', 'POST', { ...save, summary: { ...summary, activeSeconds: 59 } })).status,
  ).toBe(409);
  const history = await call('/v1/workouts/history', 'GET', {});
  expect(history.body.sessions).toEqual([summary]);
  expect(history.body.plans).toEqual([plan]);
  expect(validResponse('history', history.body, { requestId: 'read-test' })).toBe(true);
});

test('history recovers previously generated plans without requiring a completion', async () => {
  const { call, rows } = setup();
  const generated = await call('/v1/workouts/generate', 'POST', { ...DEFAULT_CONFIG, fitnessLevel: 'advanced', durationMinutes: 30, requestId: 'old-plan' });
  rows.delete('REQUEST#old-plan');
  const history = await call('/v1/workouts/history', 'GET', {});
  expect(history.body.sessions).toEqual([]);
  expect(history.body.plans).toEqual([generated.body.plan]);
});
test('handler rejects unsupported free text, malformed data and impossible plans before writing', async () => {
  const { call, handler, store } = setup();
  expect(
    (
      await call('/v1/workouts/generate', 'POST', {
        ...DEFAULT_CONFIG,
        requestId: 'x',
        prompt: 'rehabilitate my injury',
      })
    ).status,
  ).toBe(400);
  expect(
    (await call('/v1/workouts/generate', 'POST', { ...DEFAULT_CONFIG, requestId: 'x', style: 'cycling' })).status,
  ).toBe(422);
  const malformed = await handler({
    rawPath: '/v1/workouts/generate',
    requestContext: { http: { method: 'POST' } },
    body: '{bad',
  });
  expect(malformed.statusCode).toBe(400);
  expect(store.putIfAbsent).not.toHaveBeenCalled();
  expect((await call('/wrong', 'POST', {})).status).toBe(404);
});
test('database failures return sanitized retryable errors', async () => {
  const { call, store } = setup();
  (store.get as jest.Mock).mockRejectedValueOnce(new Error('secret database details'));
  const result = await call('/v1/workouts/generate', 'POST', { ...DEFAULT_CONFIG, requestId: 'x' });
  expect(result.status).toBe(503);
  expect(JSON.stringify(result.body)).not.toContain('secret');
});
test('rejects oversized, encoded, uncorrelated and unsupported completion requests', async () => {
  const { handler, call, store } = setup();
  const event = { rawPath: '/v1/workouts/generate', requestContext: { http: { method: 'POST' } } };
  expect((await handler({ ...event, body: 'x'.repeat(100001) })).statusCode).toBe(400);
  expect((await handler({ ...event, body: '{}', isBase64Encoded: true })).statusCode).toBe(400);
  expect((await call('/v1/workouts/generate', 'POST', DEFAULT_CONFIG)).status).toBe(400);
  expect((await call('/v1/workouts/generate', 'POST', { ...DEFAULT_CONFIG, requestId: '../bad' })).status).toBe(400);
  expect(
    (await call('/v1/workouts/sessions', 'POST', { requestId: 's', completionState: 'completed', summary: {} })).status,
  ).toBe(400);
  expect(store.putIfAbsent).not.toHaveBeenCalled();
});
test('concurrent plan retries agree and preference updates preserve customization', async () => {
  const { call } = setup();
  const input = { ...DEFAULT_CONFIG, requestId: 'concurrent' };
  const [a, b] = await Promise.all([
    call('/v1/workouts/generate', 'POST', input),
    call('/v1/workouts/generate', 'POST', input),
  ]);
  expect(a.body.planId).toBe(b.body.planId);
  const preferences = {
    ...DEFAULT_CONFIG,
    style: 'bodyweight',
    bodyFocus: 'upper-body',
    excludedExerciseIds: ['bodyweight-squat'],
  };
  expect((await call('/v1/users/preferences', 'PUT', { requestId: 'prefs', preferences })).status).toBe(200);
  expect((await call('/v1/users/preferences', 'GET', {})).body.preferences).toEqual(preferences);
});
