import { DEFAULT_CONFIG } from '../../domain/workoutConfig';
import type { Operation } from './contracts';
import type { FixtureName } from './fixtures';
import history from '../../data/mock-api/workout-history-success.json';
export interface MockScenario {
  id: string;
  label: string;
  operation: Operation;
  fixture: FixtureName;
  input: unknown;
}
const base = { ...DEFAULT_CONFIG, durationMinutes: 20, requestId: 'demo-001' };
export const scenarios: MockScenario[] = [
  {
    id: 'beginner',
    label: 'Beginner / 20 min',
    operation: 'generate',
    fixture: 'generate-workout-success.json',
    input: base,
  },
  {
    id: 'strength',
    label: 'Strength / dumbbells',
    operation: 'generate',
    fixture: 'generate-workout-success.json',
    input: { ...base, goal: 'strength', fitnessLevel: 'intermediate', durationMinutes: 30, equipment: ['dumbbells'] },
  },
  {
    id: 'cardio',
    label: 'Low-impact cardio',
    operation: 'generate',
    fixture: 'generate-workout-success.json',
    input: { ...base, goal: 'cardio', durationMinutes: 10 },
  },
  {
    id: 'invalid',
    label: 'Invalid duration',
    operation: 'generate',
    fixture: 'generate-workout-invalid-input.json',
    input: { ...base, durationMinutes: 0 },
  },
  {
    id: 'unsupported',
    label: 'Unsupported equipment',
    operation: 'generate',
    fixture: 'generate-workout-invalid-input.json',
    input: { ...base, equipment: ['treadmill'] },
  },
  {
    id: 'no-match',
    label: 'Simulated unavailable plan',
    operation: 'generate',
    fixture: 'generate-workout-no-matching-plan.json',
    input: base,
  },
  {
    id: 'empty',
    label: 'Empty history',
    operation: 'history',
    fixture: 'workout-history-empty.json',
    input: { requestId: 'demo-001' },
  },
  {
    id: 'history',
    label: 'Sample history',
    operation: 'history',
    fixture: 'workout-history-success.json',
    input: { requestId: 'demo-001' },
  },
  {
    id: 'save',
    label: 'Save sample completion',
    operation: 'saveSession',
    fixture: 'save-session-success.json',
    input: { requestId: 'demo-001', completionState: 'completed', summary: history.sessions[0] },
  },
  {
    id: 'save-failure',
    label: 'Simulated save failure',
    operation: 'saveSession',
    fixture: 'save-session-failure.json',
    input: { requestId: 'demo-001', completionState: 'completed', summary: history.sessions[0] },
  },
  {
    id: 'preferences',
    label: 'Read preferences',
    operation: 'getPreferences',
    fixture: 'preferences-success.json',
    input: { requestId: 'demo-001' },
  },
  {
    id: 'update',
    label: 'Update preferences',
    operation: 'updatePreferences',
    fixture: 'preferences-update-success.json',
    input: { requestId: 'demo-001', preferences: DEFAULT_CONFIG },
  },
  { id: 'server', label: 'Simulated server error', operation: 'generate', fixture: 'server-error.json', input: base },
  {
    id: 'network',
    label: 'Simulated network failure',
    operation: 'generate',
    fixture: 'network-error.json',
    input: base,
  },
  { id: 'timeout', label: 'Simulated timeout', operation: 'generate', fixture: 'timeout.json', input: base },
];
