import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRepositories } from '../data/workoutRepositories';
import storage from '../data/storage';
import { DEFAULT_CONFIG } from '../domain/workoutConfig';
import type { WorkoutSummary } from '../domain/workoutSession';
import type { WorkoutConfig, WorkoutPlan } from '../types/workout';
import { localPlanGenerator, validatePlan } from '../services/workoutPlanner';
import { generateCloudPlan, saveCloudSession } from '../services/cloudWorkouts';

interface FormFitState {
  ready: boolean;
  preferences: WorkoutConfig;
  plan: WorkoutPlan | null;
  history: WorkoutSummary[];
  lastSummary: WorkoutSummary | null;
  storageWarning: string | null;
  plannerWarning: string | null;
  createPlan(config: WorkoutConfig, source?: 'local' | 'aws'): Promise<WorkoutPlan>;
  recordSession(summary: WorkoutSummary): Promise<void>;
}
const Context = createContext<FormFitState | null>(null);
export function FormFitProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<WorkoutConfig>({ ...DEFAULT_CONFIG, equipment: [] });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [history, setHistory] = useState<WorkoutSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [plannerWarning, setPlannerWarning] = useState<string | null>(null);
  const cloudPlanIds = useRef(new Set<string>());
  const repositories = useMemo(() => createRepositories(storage, setStorageWarning), []);
  useEffect(() => {
    let mounted = true;
    Promise.all([repositories.preferences.get(), repositories.history.list()])
      .then(([config, rows]) => {
        if (mounted) {
          setPreferences(config);
          setHistory(rows);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageWarning('Could not load local data. You can still exercise without saving.');
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [repositories]);
  const createPlan = useCallback(
    async (config: WorkoutConfig, source: 'local' | 'aws' = 'aws') => {
      setPlannerWarning(null);
      let next: WorkoutPlan;
      if (source === 'local') {
        next = await localPlanGenerator.generate(config);
      } else {
        try {
          next = await generateCloudPlan(config);
          validatePlan(next, config);
          cloudPlanIds.current.add(next.id);
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code && ['INVALID_REQUEST', 'NO_MATCHING_PLAN', 'UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT'].includes(code))
            throw error;
          setPlannerWarning(
            'AWS could not be reached or did not return a usable plan within 10 seconds. Your workout was built on this TV using the offline exercise catalogue.',
          );
          next = await localPlanGenerator.generate(config);
        }
      }
      validatePlan(next, config);
      await repositories.preferences.save(config);
      setPreferences({ ...config, equipment: [...config.equipment] });
      setPlan(next);
      return next;
    },
    [repositories],
  );
  const recordSession = useCallback(
    async (summary: WorkoutSummary) => {
      setLastSummary(summary);
      const rows = await repositories.history.append(summary);
      setHistory(rows);
      if (cloudPlanIds.current.has(summary.planId)) await saveCloudSession(summary);
    },
    [repositories],
  );
  return (
    <Context.Provider
      value={{
        ready,
        preferences,
        plan,
        history,
        lastSummary,
        storageWarning,
        plannerWarning,
        createPlan,
        recordSession,
      }}>
      {children}
    </Context.Provider>
  );
}
export function useFormFit(): FormFitState {
  const state = useContext(Context);
  if (!state) throw new Error('FormFitProvider is required.');
  return state;
}
