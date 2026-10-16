import { generatePlan } from '../../utils/planGenerator';
import { sameJson } from '../../utils/sameJson';
import type { WorkoutConfig } from '../../types/workout';
import type { WorkoutSummary } from '../../domain/workoutSession';
import { failure, type Operation, type Requests, type WorkoutBackend, type ApiResult } from './contracts';
import { correlation, record, validRequest, validResponse } from './validation';
import { localFixtures, type FixtureRepository, type FixtureName } from './fixtures';
import { scenarios } from './scenarios';

export class MockWorkoutBackend implements WorkoutBackend {
  readonly mode = 'mock' as const;
  private preferences: WorkoutConfig | null = null;
  private sessions = new Map<string, WorkoutSummary>();
  constructor(
    private repository: FixtureRepository = localFixtures,
    private delayMs = 450,
  ) {}
  reset() {
    this.preferences = null;
    this.sessions.clear();
  }
  async request<K extends Operation>(operation: K, input: unknown, scenarioId?: string): Promise<ApiResult<K>> {
    await new Promise<void>((resolve) => setTimeout(resolve, this.delayMs));
    const requestId = correlation(input);
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (scenarioId && (!scenario || scenario.operation !== operation))
      return failure('mock', requestId, 'INVALID_REQUEST', 'Scenario does not match the operation.', 400);
    const defaults: Record<Operation, FixtureName> = {
      generate: 'generate-workout-success.json',
      history: 'workout-history-empty.json',
      saveSession: 'save-session-success.json',
      getPreferences: 'preferences-success.json',
      updatePreferences: 'preferences-update-success.json',
    };
    const valid = validRequest(operation, input);
    const name: FixtureName = !valid
      ? 'generate-workout-invalid-input.json'
      : (scenario?.fixture ?? defaults[operation]);
    try {
      const template = this.repository.load(name);
      if (!record(template)) throw new Error('Invalid fixture');
      let body: Record<string, unknown> = { ...template, requestId };
      let httpStatus: number | null = 200;
      if ('error' in body) {
        if (!record(body.error)) throw new Error('Invalid error fixture');
        const statuses: Record<string, number | null> = {
          INVALID_WORKOUT_CONFIGURATION: 400,
          NO_MATCHING_PLAN: 422,
          SERVER_ERROR: 500,
          NETWORK_ERROR: null,
          TIMEOUT: null,
        };
        httpStatus = statuses[String(body.error.code)] ?? 500;
      } else if (valid) {
        if (template.status !== 'success') throw new Error('Invalid success fixture');
        if (operation === 'generate') {
          if (!Array.isArray(template.notes) || template.plan !== null || template.planId !== 'derived')
            throw new Error('Invalid plan template');
          const submitted = input as Requests['generate'];
          const config: WorkoutConfig = {
            goal: submitted.goal,
            fitnessLevel: submitted.fitnessLevel,
            durationMinutes: submitted.durationMinutes,
            equipment: submitted.equipment,
            lowImpact: submitted.lowImpact,
            style: submitted.style,
            bodyFocus: submitted.bodyFocus,
            position: submitted.position,
            restPreference: submitted.restPreference,
            excludedExerciseIds: submitted.excludedExerciseIds,
            variation: submitted.variation,
          };
          const plan = generatePlan(config);
          plan.id = `mock-${requestId}`;
          body = { ...body, planId: plan.id, plan };
        } else if (operation === 'history') {
          if (!Array.isArray(template.sessions) || typeof template.sampleData !== 'boolean')
            throw new Error('Invalid history template');
          const all = new Map<string, unknown>(template.sessions.map((s) => [record(s) ? String(s.id) : '', s]));
          this.sessions.forEach((s, id) => all.set(id, s));
          body = { ...body, sessions: [...all.values()].slice(-200) };
        } else if (operation === 'saveSession') {
          if (template.summary !== null || template.sessionId !== 'derived') throw new Error('Invalid save template');
          const summary = (input as Requests['saveSession']).summary;
          const previous = this.sessions.get(summary.id);
          if (previous && !sameJson(previous, summary))
            return failure('mock', requestId, 'CONFLICT', 'Session ID already has a different summary.', 409, name);
          body = { ...body, sessionId: summary.id, summary };
          httpStatus = previous ? 200 : 201;
        } else if (operation === 'getPreferences')
          body = { ...body, preferences: this.preferences ?? template.preferences };
        else {
          if (template.preferences !== null) throw new Error('Invalid preference template');
          body = { ...body, preferences: (input as Requests['updatePreferences']).preferences };
        }
      }
      // Invalid requests still get a validated error envelope, without weakening request checks.
      const checkInput = { requestId } as Requests[K];
      if (!validResponse(operation, body, valid ? input : checkInput))
        throw new Error('Fixture response violates contract');
      if (!('error' in body) && valid) {
        if (operation === 'saveSession') {
          const s = (input as Requests['saveSession']).summary;
          this.sessions.set(s.id, JSON.parse(JSON.stringify(s)));
        }
        if (operation === 'updatePreferences')
          this.preferences = JSON.parse(JSON.stringify((input as Requests['updatePreferences']).preferences));
      }
      return { mode: 'mock', fixture: name, httpStatus, body } as ApiResult<K>;
    } catch (error) {
      return failure(
        'mock',
        requestId,
        'INVALID_RESPONSE',
        error instanceof Error ? error.message : 'Fixture is invalid.',
        null,
        name,
      );
    }
  }
}
