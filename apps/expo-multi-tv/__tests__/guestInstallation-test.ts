import { createInstallationStore, INSTALLATION_KEY } from '../../../packages/shared-ui/src/data/guestInstallation';
import { memoryStorage } from '../../../packages/shared-ui/src/data/storageTypes';
import { createGuestHandler } from '../../../infrastructure/lambda/guestHandler';
import type { DemoStore } from '../../../infrastructure/lambda/handler';
import { DEFAULT_CONFIG } from '../../../packages/shared-ui/src/domain/workoutConfig';
import { AwsWorkoutBackend } from '../../../packages/shared-ui/src/services/backend/AwsWorkoutBackend';

const a = `tv-${'a'.repeat(32)}`;
const b = `tv-${'b'.repeat(32)}`;
test('guest ID is persisted once, stable across restarts and different on another installation', async () => {
  const disk = { ...memoryStorage(), persistent: true };
  const generate = jest.fn(() => a);
  const get = createInstallationStore(disk, generate);
  expect(await Promise.all([get(), get(), get()])).toEqual([a, a, a]);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(await createInstallationStore(disk, () => b)()).toBe(a);
  expect(await createInstallationStore({ ...memoryStorage(), persistent: true }, () => b)()).toBe(b);
});
test('unreadable identity and failed writes never silently create a replacement/shared ID', async () => {
  const disk = { ...memoryStorage(), persistent: true };
  await disk.setItem(INSTALLATION_KEY, 'broken');
  const generate = jest.fn(() => a);
  await expect(createInstallationStore(disk, generate)()).rejects.toThrow('unreadable');
  expect(generate).not.toHaveBeenCalled();
  await expect(
    createInstallationStore(
      {
        ...disk,
        getItem: async () => null,
        setItem: async () => {
          throw new Error('disk full');
        },
      },
      () => a,
    )(),
  ).rejects.toThrow('disk full');
});
test('guest API partitions plans, idempotency, preferences and history by TV', async () => {
  const partitions = new Map<string, Map<string, unknown>>();
  const factory = jest.fn((partition: string): DemoStore => {
    if (!partitions.has(partition)) partitions.set(partition, new Map());
    const rows = partitions.get(partition)!;
    return {
      get: async (key) => rows.get(key) ?? null,
      put: async (key, value) => {
        rows.set(key, value);
      },
      putIfAbsent: async (key, value) => {
        if (rows.has(key)) return false;
        rows.set(key, value);
        return true;
      },
      list: async (prefix, limit) =>
        [...rows.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .slice(0, limit)
          .map(([, value]) => value),
    };
  });
  let id = 0;
  const handler = createGuestHandler(factory, () => `plan-${++id}`, () => Date.parse('2026-10-17T10:00:00Z'));
  const call = async (tv: string | undefined, path: string, method = 'GET', payload = {}) => {
    const result = await handler({
      rawPath: path,
      headers: { 'X-Request-Id': 'test-read', ...(tv ? { 'X-TV-Installation-Id': tv } : {}) },
      requestContext: { http: { method } },
      body: JSON.stringify(payload),
    });
    return { status: result.statusCode, body: JSON.parse(result.body) };
  };
  expect((await call(undefined, '/v1/workouts/history')).status).toBe(400);
  expect(factory).not.toHaveBeenCalled();
  const [pa, pb] = await Promise.all([
    call(a, '/v1/workouts/generate', 'POST', { ...DEFAULT_CONFIG, requestId: 'same-id' }),
    call(b, '/v1/workouts/generate', 'POST', {
      ...DEFAULT_CONFIG,
      fitnessLevel: 'advanced',
      durationMinutes: 30,
      requestId: 'same-id',
    }),
  ]);
  expect(pa.status).toBe(200);
  expect(pb.status).toBe(200);
  expect(pa.body.installationId).toBe(a);
  expect(pb.body.installationId).toBe(b);
  expect((await call(a, '/v1/workouts/history')).body.plans).toEqual([pa.body.plan]);
  expect((await call(b, '/v1/workouts/history')).body.plans).toEqual([pb.body.plan]);
  await call(a, '/v1/users/preferences', 'PUT', {
    requestId: 'pref',
    preferences: { ...DEFAULT_CONFIG, fitnessLevel: 'advanced' },
  });
  expect((await call(b, '/v1/users/preferences')).body.preferences.fitnessLevel).toBe('beginner');
  const summary = {
    id: 'attempt',
    planId: pa.body.plan.id,
    title: pa.body.plan.title,
    goal: pa.body.plan.goal,
    fitnessLevel: pa.body.plan.fitnessLevel,
    exerciseCount: pa.body.plan.exercises.length,
    completedExercises: pa.body.plan.exercises.length,
    skippedExercises: 0,
    activeSeconds: 1,
    startedAt: '2026-10-17T10:00:00Z',
    completedAt: '2026-10-17T10:00:01Z',
  };
  expect(
    (await call(b, '/v1/workouts/sessions', 'POST', { requestId: 'save', completionState: 'completed', summary }))
      .status,
  ).toBe(404);
  expect(
    (await call(a, '/v1/workouts/sessions', 'POST', { requestId: 'save', completionState: 'completed', summary }))
      .status,
  ).toBe(201);
  expect((await call(b, '/v1/workouts/history')).body.sessions).toEqual([]);
  expect((await call(a, '/v1/workouts/history')).body.sessions).toHaveLength(1);
  expect(partitions.has('DEMO#shared')).toBe(false);
});
test.each([undefined, b])('client refuses shared or wrong-TV success responses (%s)', async (returnedId) => {
  const transport = jest.fn(async () => ({
    status: 200,
    text: async () =>
      JSON.stringify({
        requestId: 'read',
        status: 'success',
        sessions: [],
        plans: [],
        sampleData: false,
        ...(returnedId ? { installationId: returnedId } : {}),
      }),
  }));
  const backend = new AwsWorkoutBackend(
    { mode: 'aws', baseUrl: 'https://example.com', timeoutMs: 1000 },
    transport as unknown as typeof fetch,
    async () => a,
  );
  const result = await backend.request('history', { requestId: 'read' });
  expect(result.body).toMatchObject({ error: { code: 'INVALID_RESPONSE' } });
  expect(transport.mock.calls[0]).toBeDefined();
});
