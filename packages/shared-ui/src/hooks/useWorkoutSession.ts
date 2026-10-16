import { useEffect, useReducer } from 'react';
import { AppState } from 'react-native';
import type { WorkoutPlan } from '../types/workout';
import { createSession, sessionReducer } from '../domain/workoutSession';

export function useWorkoutSession(plan: WorkoutPlan, isFocused: boolean) {
  const [state, dispatch] = useReducer(sessionReducer, plan, createSession);
  useEffect(() => {
    if (state.status !== 'running' || !isFocused) return;
    const timer = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 250);
    return () => clearInterval(timer);
  }, [state.status, isFocused]);
  useEffect(() => {
    if (!isFocused) dispatch({ type: 'pause', now: Date.now() });
    const listener = AppState.addEventListener('change', (next) => {
      if (next !== 'active') dispatch({ type: 'pause', now: Date.now() });
    });
    return () => listener.remove();
  }, [isFocused]);
  return { state, dispatch };
}
