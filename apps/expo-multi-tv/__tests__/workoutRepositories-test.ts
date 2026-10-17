import { createRepositories, HISTORY_LIMIT } from '../../../packages/shared-ui/src/data/workoutRepositories';
import { memoryStorage, type KeyValueStorage } from '../../../packages/shared-ui/src/data/storageTypes';
import { DEFAULT_CONFIG } from '../../../packages/shared-ui/src/domain/workoutConfig';
import type { WorkoutSummary } from '../../../packages/shared-ui/src/domain/workoutSession';
import { progressTotals } from '../../../packages/shared-ui/src/domain/workoutProgress';
function durable() {
  const memory = memoryStorage();
  return { ...memory, persistent: true };
}
it('keeps generated plans across restarts without fabricating completed sessions', async () => {
  const { generatePlan } = require('../../../packages/shared-ui/src/utils/planGenerator');
  const storage = durable();
  const repo = createRepositories(storage);
  const plan = generatePlan({ ...DEFAULT_CONFIG, fitnessLevel: 'advanced', durationMinutes: 30 });
  await Promise.all([repo.plans.append(plan), repo.plans.append(plan)]);
  const reopened = createRepositories(storage);
  expect(await reopened.plans.list()).toEqual([plan]);
  expect(await reopened.history.list()).toEqual([]);
});
function summary(id = 'one'): WorkoutSummary {
  return {
    id,
    planId: 'plan',
    title: 'Test session',
    goal: 'strength',
    fitnessLevel: 'beginner',
    exerciseCount: 4,
    completedExercises: 3,
    skippedExercises: 1,
    activeSeconds: 150,
    startedAt: '2026-01-01T10:00:00.000Z',
    completedAt: '2026-01-01T10:03:00.000Z',
  };
}
it('starts with honest empty history and default preferences', async () => {
  const repo = createRepositories(durable());
  expect(await repo.history.list()).toEqual([]);
  expect(await repo.preferences.get()).toEqual(DEFAULT_CONFIG);
});
it('persists preferences and summaries across repository recreation', async () => {
  const storage = durable();
  const repo = createRepositories(storage);
  const config = { ...DEFAULT_CONFIG, durationMinutes: 30 as const, lowImpact: false };
  await repo.preferences.save(config);
  await repo.history.append(summary());
  const reopened = createRepositories(storage);
  expect(await reopened.preferences.get()).toEqual(config);
  expect(await reopened.history.list()).toEqual([summary()]);
});
it('serializes concurrent saves and deduplicates StrictMode/retry completions', async () => {
  const repo = createRepositories(durable());
  await Promise.all([
    repo.history.append(summary('one')),
    repo.history.append(summary('two')),
    repo.history.append(summary('one')),
  ]);
  expect((await repo.history.list()).map((row) => row.id)).toEqual(['two', 'one']);
});
it('limits stored history without fabricating totals', async () => {
  const repo = createRepositories(durable());
  for (let index = 0; index < HISTORY_LIMIT + 2; index++) await repo.history.append(summary(String(index)));
  const rows = await repo.history.list();
  expect(rows.length).toBe(HISTORY_LIMIT);
  expect(rows[0].id).toBe(String(HISTORY_LIMIT + 1));
  expect(progressTotals([summary()], new Date('2026-01-02T00:00:00Z'))).toEqual({
    sessions: 1,
    activeSeconds: 150,
    completedExercises: 3,
    thisWeek: 1,
  });
});
it('falls back to memory on storage failure without losing the current session', async () => {
  const warn = jest.fn();
  const broken: KeyValueStorage = {
    persistent: true,
    getItem: async () => {
      throw new Error('Unavailable');
    },
    setItem: async () => {
      throw new Error('Unavailable');
    },
  };
  const repo = createRepositories(broken, warn);
  expect(await repo.preferences.get()).toEqual(DEFAULT_CONFIG);
  await repo.history.append(summary());
  expect(await repo.history.list()).toEqual([summary()]);
  expect(repo.isPersistent()).toBe(false);
  expect(warn).toHaveBeenCalledTimes(1);
});
it('does not overwrite corrupt or unsupported data', async () => {
  const raw = '{broken';
  const setItem = jest.fn(async () => undefined);
  const repo = createRepositories({ persistent: true, getItem: async () => raw, setItem });
  expect(await repo.history.list()).toEqual([]);
  await repo.history.append(summary());
  expect(setItem).not.toHaveBeenCalled();
  expect(await repo.history.list()).toEqual([summary()]);
});
it('rejects fabricated or incomplete summaries and invalid preferences', async () => {
  const repo = createRepositories(durable());
  await expect(repo.history.append({ ...summary(), completedExercises: 99 })).rejects.toThrow('Invalid completed');
  await expect(repo.preferences.save({ ...DEFAULT_CONFIG, durationMinutes: 0 as never })).rejects.toThrow(
    'Invalid workout',
  );
});
it('retains already loaded history if storage becomes unavailable during a later save', async () => {
  const backing = durable();
  let failed = false;
  const storage: KeyValueStorage = {
    ...backing,
    getItem: async (key) => {
      if (failed) throw new Error('Storage permission changed');
      return backing.getItem(key);
    },
  };
  const repo = createRepositories(storage);
  await repo.history.append(summary('first'));
  failed = true;
  await repo.history.append(summary('second'));
  expect((await repo.history.list()).map((row) => row.id)).toEqual(['second', 'first']);
  expect(repo.isPersistent()).toBe(false);
});
