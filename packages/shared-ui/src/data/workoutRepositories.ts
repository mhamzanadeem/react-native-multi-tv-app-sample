import type { WorkoutSummary } from '../domain/workoutSession';
import { DEFAULT_CONFIG, GOAL_LABELS, LEVEL_RANK, isWorkoutConfig } from '../domain/workoutConfig';
import type { WorkoutConfig, WorkoutPlan } from '../types/workout';
import { validatePlan } from '../services/workoutPlanner';
import type { KeyValueStorage } from './storageTypes';

export interface PreferencesRepository {
  get(): Promise<WorkoutConfig>;
  save(config: WorkoutConfig): Promise<void>;
}
export interface WorkoutHistoryRepository {
  list(): Promise<WorkoutSummary[]>;
  append(summary: WorkoutSummary): Promise<WorkoutSummary[]>;
}
const PREFERENCES_KEY = 'formfit-preferences-v1';
const HISTORY_KEY = 'formfit-history-v1';
export const HISTORY_LIMIT = 200;
export function isWorkoutSummary(value: unknown): value is WorkoutSummary {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const counts = ['exerciseCount', 'completedExercises', 'skippedExercises', 'activeSeconds'];
  return (
    ['id', 'planId', 'title', 'startedAt', 'completedAt'].every(
      (key) => typeof row[key] === 'string' && String(row[key]).length > 0,
    ) &&
    typeof row.goal === 'string' &&
    Object.prototype.hasOwnProperty.call(GOAL_LABELS, row.goal) &&
    typeof row.fitnessLevel === 'string' &&
    Object.prototype.hasOwnProperty.call(LEVEL_RANK, row.fitnessLevel) &&
    counts.every((key) => typeof row[key] === 'number' && Number.isInteger(row[key]) && Number(row[key]) >= 0) &&
    Number(row.exerciseCount) > 0 &&
    Number(row.completedExercises) + Number(row.skippedExercises) === row.exerciseCount &&
    Number.isFinite(Date.parse(String(row.startedAt))) &&
    Number.isFinite(Date.parse(String(row.completedAt))) &&
    Date.parse(String(row.completedAt)) >= Date.parse(String(row.startedAt))
  );
}
export function createRepositories(storage: KeyValueStorage, onFallback: (message: string) => void = () => undefined) {
  const cache = new Map<string, string>();
  let memoryOnly = !storage.persistent;
  let warned = false;
  let queue: Promise<unknown> = Promise.resolve();
  function fallback() {
    memoryOnly = true;
    if (!warned) {
      warned = true;
      onFallback(
        'Local storage is unavailable or unreadable. Preferences and progress will remain in memory for this app session. Existing stored data was not reset.',
      );
    }
  }
  async function read<T>(key: string, valid: (value: unknown) => value is T, defaultValue: T): Promise<T> {
    try {
      if (memoryOnly) fallback();
      const raw = memoryOnly ? (cache.get(key) ?? null) : await storage.getItem(key);
      if (raw === null) return defaultValue;
      const envelope: unknown = JSON.parse(raw);
      if (
        !envelope ||
        typeof envelope !== 'object' ||
        !('version' in envelope) ||
        envelope.version !== 1 ||
        !('value' in envelope) ||
        !valid(envelope.value)
      ) {
        throw new Error('Unsupported or invalid local data.');
      }
      cache.set(key, raw);
      return envelope.value;
    } catch {
      fallback();
      // A newly unavailable disk/browser must not erase already loaded progress in memory.
      const lastGood = cache.get(key);
      if (lastGood) {
        const cached: unknown = JSON.parse(lastGood);
        if (cached && typeof cached === 'object' && 'value' in cached && valid(cached.value)) return cached.value;
      }
      return defaultValue;
    }
  }
  async function write(key: string, value: unknown) {
    const raw = JSON.stringify({ version: 1, value });
    cache.set(key, raw);
    if (memoryOnly) {
      fallback();
      return;
    }
    try {
      await storage.setItem(key, raw);
    } catch {
      fallback();
    }
  }
  const preferences: PreferencesRepository = {
    get: () => read(PREFERENCES_KEY, isWorkoutConfig, { ...DEFAULT_CONFIG, equipment: [] }),
    save: async (config) => {
      if (!isWorkoutConfig(config)) throw new Error('Invalid workout preferences.');
      await write(PREFERENCES_KEY, { ...config, equipment: [...config.equipment] });
    },
  };
  const validHistory = (value: unknown): value is WorkoutSummary[] =>
    Array.isArray(value) && value.every(isWorkoutSummary);
  const validPlans = (value: unknown): value is WorkoutPlan[] => {
    if (!Array.isArray(value)) return false;
    try {
      value.forEach((plan) => validatePlan(plan));
      return true;
    } catch {
      return false;
    }
  };
  const plans = {
    list: () => read('formfit-plans-v1', validPlans, []),
    append: (plan: WorkoutPlan): Promise<WorkoutPlan[]> => {
      const operation = queue.then(async () => {
        validatePlan(plan);
        const rows = await plans.list();
        const kept = [plan, ...rows.filter((row) => row.id !== plan.id)].slice(0, HISTORY_LIMIT);
        await write('formfit-plans-v1', kept);
        return kept;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
  const history: WorkoutHistoryRepository = {
    list: async () => {
      const rows = await read(HISTORY_KEY, validHistory, []);
      return [...new Map(rows.map((row) => [row.id, row])).values()].slice(-HISTORY_LIMIT).reverse();
    },
    append: (summary) => {
      const operation = queue.then(async () => {
        if (!isWorkoutSummary(summary)) throw new Error('Invalid completed workout summary.');
        const rows = await history.list();
        if (!rows.some((row) => row.id === summary.id)) rows.unshift(summary);
        const kept = rows.slice(0, HISTORY_LIMIT);
        await write(HISTORY_KEY, [...kept].reverse());
        return kept;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
  return { preferences, history, plans, isPersistent: () => !memoryOnly };
}
