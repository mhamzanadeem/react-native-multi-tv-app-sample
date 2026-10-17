import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import { useFormFit } from '../../hooks/FormFitContext';
import { HISTORY_LIMIT } from '../../data/workoutRepositories';
import { progressTotals } from '../../domain/workoutProgress';
import { GOAL_LABELS, formatTime } from '../../domain/workoutConfig';
import type { RootStackParamList } from '../../navigation/types';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, Stat, ui } from '../../components/fitness/FitnessPrimitives';
import { listCloudActivity } from '../../services/cloudWorkouts';
import type { WorkoutPlan } from '../../types/workout';
import type { WorkoutSummary } from '../../domain/workoutSession';
export default function WorkoutProgressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { history, plans, openPlan } = useFormFit();
  const [cloudHistory, setCloudHistory] = useState<{
    sessions: WorkoutSummary[];
    plans: WorkoutPlan[];
    plansSupported: boolean;
  } | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const refreshing = useRef(false);
  const focused = useIsFocused();
  const refreshCloud = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setCloudBusy(true);
    setCloudError(null);
    try {
      setCloudHistory(await listCloudActivity());
    } catch (failure) {
      setCloudError(failure instanceof Error ? failure.message : 'Could not load cloud history. Retry.');
    } finally {
      refreshing.current = false;
      setCloudBusy(false);
    }
  }, []);
  useEffect(() => {
    if (focused) void refreshCloud();
  }, [focused, refreshCloud]);
  const allPlans = [...new Map([...(cloudHistory?.plans ?? []), ...plans].map((plan) => [plan.id, plan])).values()];
  const allSessions = [
    ...new Map([...(cloudHistory?.sessions ?? []), ...history].map((summary) => [summary.id, summary])).values(),
  ];
  const entries: { id: string; date: string; plan?: WorkoutPlan; summary?: WorkoutSummary }[] = allSessions.map(
    (summary) => ({
      id: summary.id,
      date: summary.completedAt,
      summary,
      plan: allPlans.find((plan) => plan.id === summary.planId),
    }),
  );
  for (const plan of allPlans) {
    if (!allSessions.some((summary) => summary.planId === plan.id))
      entries.push({ id: plan.id, date: plan.createdAt, plan });
  }
  entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const totals = progressTotals(allSessions);
  return (
    <FitnessScreen title="Progress" eyebrow="YOUR PROGRESS / YOUR OWN PACE" drawer>
      <View style={ui.stats}>
        <Stat value={String(totals.sessions)} label="Sessions finished" />
        <Stat value={formatTime(totals.activeSeconds)} label="Actual active time (m:ss)" />
        <Stat value={String(totals.completedExercises)} label="Exercises completed" />
        <Stat value={String(totals.thisWeek)} label="Last 7 days" />
      </View>
      <Actions>
        <DefaultFocus>
          <FitnessButton
            text="Start a new workout"
            onSelect={() => navigation.navigate('WorkoutSetup')}
            style={ui.primary}
          />
        </DefaultFocus>
      </Actions>
      <Text style={ui.heading}>Your recent sessions</Text>
      <Text style={ui.caption}>
        Every generated workout appears here. Generated plans do not count as completed exercise.
      </Text>
      <Actions>
        <FitnessButton
          text={cloudBusy ? 'Refreshing sessions...' : 'Refresh recent sessions'}
          disabled={cloudBusy}
          onSelect={() => {
            void refreshCloud();
          }}
        />
      </Actions>
      {cloudError && (
        <Text accessibilityRole="alert" style={ui.error}>
          {cloudError}
        </Text>
      )}
      {cloudHistory && !cloudHistory.plansSupported && (
        <Text accessibilityRole="alert" style={ui.error}>
          The server needs the updated history endpoint to restore older generated workouts. New workouts are saved on
          this TV.
        </Text>
      )}
      {!entries.length && <Text style={ui.body}>No workouts yet. Generate a workout to add it here.</Text>}
      {entries.slice(0, HISTORY_LIMIT).map(({ id, date, plan, summary }) => (
        <View key={id} style={ui.card}>
          <Text style={ui.kicker}>
            {GOAL_LABELS[(summary ?? plan)!.goal].toUpperCase()} / {(summary ?? plan)!.fitnessLevel.toUpperCase()}
          </Text>
          <Text style={ui.heading}>{(summary ?? plan)!.title}</Text>
          <Text style={ui.body}>{summary ? 'Completed' : 'Generated / ready to start'}</Text>
          {summary ? (
            <Text style={ui.body}>
              {summary.completedExercises}/{summary.exerciseCount} completed / {summary.skippedExercises} skipped /{' '}
              {formatTime(summary.activeSeconds)} active time
            </Text>
          ) : (
            plan && (
              <Text style={ui.body}>
                {plan.targetDurationMinutes} minute target / {formatTime(plan.estimatedDurationSeconds)} estimated /{' '}
                {plan.exercises.length} exercises
              </Text>
            )
          )}
          <Text style={ui.caption}>{new Date(date).toLocaleString()}</Text>
          <Actions>
            {plan && (
              <FitnessButton
                text="View workout"
                onSelect={() => {
                  openPlan(plan);
                  navigation.navigate('WorkoutPlan', { planId: plan.id });
                }}
              />
            )}
            {summary && history.some((row) => row.id === summary.id) && (
              <FitnessButton
                text="View session summary"
                onSelect={() => navigation.navigate('WorkoutComplete', { summaryId: summary.id })}
              />
            )}
          </Actions>
        </View>
      ))}
      <Text style={ui.small}>
        Up to {HISTORY_LIMIT} recent entries are shown for this guest TV installation. Statistics count completed
        sessions only.
      </Text>
    </FitnessScreen>
  );
}
