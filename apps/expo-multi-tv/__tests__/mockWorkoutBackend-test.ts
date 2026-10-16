import { MockWorkoutBackend } from '../../../packages/shared-ui/src/services/backend/MockWorkoutBackend';
import { AwsWorkoutBackend } from '../../../packages/shared-ui/src/services/backend/AwsWorkoutBackend';
import { createBackend } from '../../../packages/shared-ui/src/services/backend/createBackend';
import { backendConfig } from '../../../packages/shared-ui/src/services/backend/config';
import { localFixtures, fixtures } from '../../../packages/shared-ui/src/services/backend/fixtures';
import { scenarios } from '../../../packages/shared-ui/src/services/backend/scenarios';
import { validRequest, validResponse } from '../../../packages/shared-ui/src/services/backend/validation';
import { routes, type Requests } from '../../../packages/shared-ui/src/services/backend/contracts';
const config: Requests['generate'] = {
  requestId: 'test-001',
  goal: 'general-fitness',
  fitnessLevel: 'beginner',
  durationMinutes: 20,
  equipment: [],
  lowImpact: true,
};
const makeMock = () => new MockWorkoutBackend(localFixtures, 0);

describe('offline mock backend and contract', () => {
  test('JSON object field ordering is irrelevant to valid plans and saved summaries', async () => {
    const result = await makeMock().request('generate', config);
    if ('status' in result.body) {
      const reorder = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(reorder);
        if (value && typeof value === 'object')
          return Object.fromEntries(
            Object.entries(value)
              .reverse()
              .map(([key, item]) => [key, reorder(item)]),
          );
        return value;
      };
      expect(validResponse('generate', reorder(result.body), config)).toBe(true);
      const mock = makeMock();
      const input = scenarios.find((s) => s.id === 'save')!.input as Requests['saveSession'];
      await mock.request('saveSession', input);
      expect((await mock.request('saveSession', reorder(input))).httpStatus).toBe(200);
    } else throw new Error('Expected a valid generated plan');
  });
  test.each(scenarios.map((s) => [s.id, s] as const))('%s fixture scenario', async (_id, scenario) => {
    const result = await makeMock().request(scenario.operation, scenario.input, scenario.id);
    expect(result.mode).toBe('mock');
    expect(result.fixture).toBe(scenario.fixture);
    const error = ['invalid', 'unsupported', 'no-match', 'save-failure', 'server', 'network', 'timeout'].includes(
      scenario.id,
    );
    expect('error' in result.body).toBe(error);
  });
  test.each([0, -10, 12, 90, NaN])('reject duration %s', async (durationMinutes) => {
    const result = await makeMock().request('generate', { ...config, durationMinutes });
    expect(result.httpStatus).toBe(400);
    expect(result.body).toHaveProperty('error.code', 'INVALID_WORKOUT_CONFIGURATION');
  });
  test.each([
    null,
    {},
    { ...config, equipment: ['treadmill'] },
    { ...config, equipment: ['dumbbells', 'dumbbells'] },
    { ...config, requestId: '../bad' },
    { ...config, lowImpact: 'yes' },
  ])('validate malformed input %#', (input) => expect(validRequest('generate', input)).toBe(false));
  test('fixture notes are used, plans respond to changed input, no HTTP', async () => {
    const load = jest.fn(localFixtures.load);
    const http = jest.spyOn(global, 'fetch').mockImplementation(() => {
      throw new Error('must not call network');
    });
    try {
      const mock = new MockWorkoutBackend({ load }, 0);
      const a = await mock.request('generate', config, 'beginner');
      const b = await mock.request(
        'generate',
        { ...config, goal: 'strength', fitnessLevel: 'intermediate', durationMinutes: 30, equipment: ['dumbbells'] },
        'beginner',
      );
      expect(load).toHaveBeenCalledWith('generate-workout-success.json');
      expect(a.body).toHaveProperty('notes', fixtures['generate-workout-success.json'].notes);
      expect(a.body).toHaveProperty('plan.targetDurationMinutes', 20);
      expect(b.body).toHaveProperty('plan.goal', 'strength');
      expect(b.body).toHaveProperty('plan.targetDurationMinutes', 30);
      expect(b.body).toHaveProperty('plan.config.equipment', ['dumbbells']);
      expect(http).not.toHaveBeenCalled();
    } finally {
      http.mockRestore();
    }
  });
  test('save is idempotent, appears in history, reset isolates personal storage', async () => {
    const mock = makeMock();
    const input = scenarios.find((s) => s.id === 'save')!.input as Requests['saveSession'];
    expect((await mock.request('saveSession', input)).httpStatus).toBe(201);
    expect((await mock.request('saveSession', input)).httpStatus).toBe(200);
    expect((await mock.request('history', { requestId: 'history' }, 'empty')).body).toHaveProperty('sessions', [
      input.summary,
    ]);
    const conflict = await mock.request('saveSession', { ...input, summary: { ...input.summary, title: 'changed' } });
    expect(conflict.httpStatus).toBe(409);
    mock.reset();
    expect((await mock.request('history', { requestId: 'history' }, 'empty')).body).toHaveProperty('sessions', []);
  });
  test('update/read preferences roundtrip', async () => {
    const mock = makeMock();
    const { requestId, ...preferences } = config;
    await mock.request('updatePreferences', { requestId, preferences });
    expect((await mock.request('getPreferences', { requestId })).body).toHaveProperty('preferences', preferences);
  });
  test('fixture modification changes visible response', async () => {
    const mock = new MockWorkoutBackend(
      {
        load: (name) =>
          name === 'generate-workout-success.json'
            ? { ...(localFixtures.load(name) as object), notes: ['Unique fixture marker'] }
            : localFixtures.load(name),
      },
      0,
    );
    expect((await mock.request('generate', config)).body).toHaveProperty('notes', ['Unique fixture marker']);
  });
  test.each([
    null,
    {},
    { status: 'success', planId: 'derived', plan: null, notes: [7] },
    { error: { code: 'MADE_UP', message: 'bad' } },
  ])('reject corrupt fixtures %#', async (fixture) => {
    const mock = new MockWorkoutBackend({ load: () => fixture }, 0);
    expect((await mock.request('generate', config)).body).toHaveProperty('error.code', 'INVALID_RESPONSE');
  });
  test('all success responses satisfy validator; altered plan rejected', async () => {
    const result = await makeMock().request('generate', config);
    expect(validResponse('generate', result.body, config)).toBe(true);
    if ('status' in result.body) {
      result.body.plan.exercises[0].restSeconds = 999;
      expect(validResponse('generate', result.body, config)).toBe(false);
    }
  });
  test.each(scenarios.map((s) => [s.id, s] as const))(
    'documented %s capture matches the runtime contract',
    (_id, scenario) => {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const capture = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../docs/api-examples', `${scenario.id}.json`), 'utf8'),
      );
      expect(validResponse(scenario.operation, capture.response, capture.request)).toBe(true);
    },
  );
});
describe('future AWS adapter without live requests', () => {
  const aws = { mode: 'aws' as const, baseUrl: 'https://example.invalid/demo', timeoutMs: 100 };
  test('default mock configuration cannot invoke injected HTTP', async () => {
    const http = jest.fn();
    const backend = createBackend(backendConfig, http);
    expect(backend.mode).toBe('mock');
    await backend.request('generate', config);
    expect(http).not.toHaveBeenCalled();
  });
  test.each([
    '',
    'http://example.com',
    'not-url',
    'https://user:password@example.com',
    'https://example.com?secret=a',
    'https://example.com/#key',
  ])('reject endpoint %s', (baseUrl) => expect(() => createBackend({ ...aws, baseUrl })).toThrow());
  test('real HTTP results have no fixture metadata', async () => {
    const response = await makeMock().request('generate', config);
    const http = jest.fn(async () => ({ status: 200, text: async () => JSON.stringify(response.body) }) as Response);
    const result = await createBackend(aws, http).request('generate', config);
    expect(result.mode).toBe('aws');
    expect(result.fixture).toBeNull();
    expect(result.httpStatus).toBe(200);
    expect(http).toHaveBeenCalledWith(
      'https://example.invalid/demo/v1/workouts/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(config),
        headers: expect.objectContaining({ 'X-Request-Id': config.requestId }),
      }),
    );
  });
  test.each([400, 401, 403, 404, 409, 422, 429, 500, 503])('map HTTP %s without fixture fallback', async (status) => {
    const http = jest.fn(async () => ({ status, text: async () => '<secret server debug>' }) as Response);
    const result = await new AwsWorkoutBackend(aws, http).request('generate', config);
    expect(result.mode).toBe('aws');
    expect(result.fixture).toBeNull();
    expect(result.httpStatus).toBe(status);
    expect(result.body).toHaveProperty('error');
    expect(JSON.stringify(result)).not.toContain('secret server debug');
  });
  test('GET is bodyless and correlated', async () => {
    const http = jest.fn(
      async () =>
        ({
          status: 200,
          text: async () =>
            JSON.stringify({ requestId: 'get-001', status: 'success', sessions: [], sampleData: false }),
        }) as Response,
    );
    await new AwsWorkoutBackend(aws, http).request('history', { requestId: 'get-001' });
    expect(http).toHaveBeenCalledWith(expect.any(String), expect.not.objectContaining({ body: expect.anything() }));
  });
  test('all endpoint methods and paths are wired', async () => {
    const http = jest.fn(async () => ({ status: 500, text: async () => '{}' }) as Response);
    const backend = new AwsWorkoutBackend(aws, http);
    for (const scenario of scenarios.filter((s) =>
      ['beginner', 'empty', 'save', 'preferences', 'update'].includes(s.id),
    )) {
      await backend.request(scenario.operation, scenario.input);
      expect(http).toHaveBeenLastCalledWith(
        `${aws.baseUrl}${routes[scenario.operation].path}`,
        expect.objectContaining({ method: routes[scenario.operation].method }),
      );
    }
  });
  test('network and timeout remain AWS failures', async () => {
    const network = await new AwsWorkoutBackend(aws, async () => {
      throw new Error('private');
    }).request('generate', config);
    expect(network.body).toHaveProperty('error.code', 'NETWORK_ERROR');
    expect(network.fixture).toBeNull();
    const timeout = await new AwsWorkoutBackend(aws, () => new Promise(() => undefined)).request('generate', config);
    expect(timeout.body).toHaveProperty('error.code', 'TIMEOUT');
    expect(timeout.mode).toBe('aws');
  });
  test.each(['{}', 'not json', JSON.stringify({ requestId: 'wrong', status: 'success' })])(
    'reject malformed HTTP success %#',
    async (raw) => {
      const result = await new AwsWorkoutBackend(
        aws,
        async () => ({ status: 200, text: async () => raw }) as Response,
      ).request('generate', config);
      expect(result.body).toHaveProperty('error.code', 'INVALID_RESPONSE');
      expect(result.fixture).toBeNull();
    },
  );
  test('invalid AWS input never invokes HTTP', async () => {
    const http = jest.fn();
    const result = await new AwsWorkoutBackend(aws, http).request('generate', {});
    expect(result.body).toHaveProperty('error.code', 'INVALID_REQUEST');
    expect(http).not.toHaveBeenCalled();
  });
});
