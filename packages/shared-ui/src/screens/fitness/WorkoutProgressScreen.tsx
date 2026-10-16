import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import { useFormFit } from '../../hooks/FormFitContext';
import { HISTORY_LIMIT } from '../../data/workoutRepositories';
import { progressTotals } from '../../domain/workoutProgress';
import { GOAL_LABELS, formatTime } from '../../domain/workoutConfig';
import type { RootStackParamList } from '../../navigation/types';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, Stat, ui } from '../../components/fitness/FitnessPrimitives';
import { listCloudSessions } from '../../services/cloudWorkouts';
import type { WorkoutSummary } from '../../domain/workoutSession';
export default function WorkoutProgressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { history } = useFormFit();
  const [cloudHistory, setCloudHistory] = useState<WorkoutSummary[] | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  async function refreshCloud() {
    if (cloudBusy) return;
    setCloudBusy(true);
    setCloudError(null);
    try {
      setCloudHistory(await listCloudSessions());
    } catch (failure) {
      setCloudError(failure instanceof Error ? failure.message : 'Could not load cloud history. Retry.');
    } finally {
      setCloudBusy(false);
    }
  }
  const totals = progressTotals(history);
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
      <Text style={ui.heading}>{history.length ? 'Your recent sessions' : 'A fresh start'}</Text>
      {!history.length && (
        <View style={ui.card}>
          <Text style={ui.body}>No completed workouts yet. Finish a session to build your history.</Text>
          <Text style={ui.caption}>
            There is no sample activity here. These numbers come from workouts you actually finish.
          </Text>
        </View>
      )}
      {history.map((summary) => (
        <View key={summary.id} style={ui.card}>
          <Text style={ui.kicker}>
            {GOAL_LABELS[summary.goal].toUpperCase()} / {summary.fitnessLevel.toUpperCase()}
          </Text>
          <Text style={ui.heading}>{summary.title}</Text>
          <Text style={ui.body}>
            {summary.completedExercises}/{summary.exerciseCount} completed / {summary.skippedExercises} skipped /{' '}
            {formatTime(summary.activeSeconds)} active time
          </Text>
          <Text style={ui.caption}>{new Date(summary.completedAt).toLocaleString()}</Text>
          <Actions>
            <FitnessButton
              text="View session summary"
              onSelect={() => navigation.navigate('WorkoutComplete', { summaryId: summary.id })}
            />
          </Actions>
        </View>
      ))}
      <Text style={ui.small}>
        History keeps up to {HISTORY_LIMIT} sessions on this device. Active time excludes pauses. No calories, health
        scores or camera analysis are estimated.
      </Text>
      <View style={ui.card}>
        <Text style={ui.heading}>AWS shared demo history</Text>
        <Text style={ui.caption}>
          Separate from your local history. This account-free workspace is shared; use synthetic data.
        </Text>
        <Actions>
          <FitnessButton
            text={cloudBusy ? 'Loading AWS history...' : 'Refresh AWS demo history'}
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
        {cloudHistory?.length === 0 && (
          <Text style={ui.body}>No cloud completions yet. Generate a plan with AWS Lambda demo and finish it.</Text>
        )}
        {cloudHistory?.map((summary) => (
          <View key={summary.id} style={ui.card}>
            <Text style={ui.heading}>{summary.title}</Text>
            <Text style={ui.body}>
              {summary.completedExercises}/{summary.exerciseCount} exercises / {formatTime(summary.activeSeconds)}{' '}
              active
            </Text>
            <Text style={ui.caption}>{new Date(summary.completedAt).toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </FitnessScreen>
  );
}
