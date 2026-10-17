import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRepositories } from '../data/workoutRepositories';
import storage from '../data/storage';
import { getInstallationId } from '../data/guestInstallation';
import { DEFAULT_CONFIG } from '../domain/workoutConfig';
import type { WorkoutSummary } from '../domain/workoutSession';
import type { WorkoutConfig, WorkoutPlan } from '../types/workout';
import { localPlanGenerator, validatePlan } from '../services/workoutPlanner';
import { generateCloudPlan, saveCloudSession } from '../services/cloudWorkouts';

interface FormFitState {
  ready: boolean;
  installationId: string | null;
  preferences: WorkoutConfig;
  plan: WorkoutPlan | null;
  plans: WorkoutPlan[];
  openPlan(plan: WorkoutPlan): void;
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
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<WorkoutConfig>({ ...DEFAULT_CONFIG, equipment: [] });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [history, setHistory] = useState<WorkoutSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [plannerWarning, setPlannerWarning] = useState<string | null>(null);
  const cloudPlanIds = useRef(new Set<string>());
  const repositories = useMemo(() => createRepositories(storage, setStorageWarning), []);
  useEffect(() => {
    let mounted = true;
    getInstallationId()
      .then((id) => {
        if (mounted) setInstallationId(id);
      })
      .catch(() => {
        if (mounted)
          setStorageWarning(
            'Your guest TV ID could not be loaded. Cloud sync is unavailable; local workouts remain available.',
          );
      });
    Promise.all([repositories.preferences.get(), repositories.history.list(), repositories.plans.list()])
      .then(([config, rows, savedPlans]) => {
        if (mounted) {
          setPreferences(config);
          setHistory(rows);
          setPlans(savedPlans);
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
      setPlans(await repositories.plans.append(next));
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
        installationId,
        preferences,
        plan,
        plans,
        openPlan: (savedPlan) => {
          validatePlan(savedPlan);
          if (savedPlan.source === 'aws') cloudPlanIds.current.add(savedPlan.id);
          setPlan(savedPlan);
        },
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
