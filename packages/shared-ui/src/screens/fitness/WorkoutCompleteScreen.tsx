import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import { useFormFit } from '../../hooks/FormFitContext';
import type { RootStackParamList } from '../../navigation/types';
import { formatTime, GOAL_LABELS } from '../../domain/workoutConfig';
import WorkoutHero from '../../components/fitness/WorkoutHero';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, Stat, ui } from '../../components/fitness/FitnessPrimitives';
export default function WorkoutCompleteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutComplete'>>();
  const { history, lastSummary, storageWarning } = useFormFit();
  const summary =
    history.find((row) => row.id === route.params.summaryId) ??
    (lastSummary?.id === route.params.summaryId ? lastSummary : null);
  const home = () => navigation.reset({ index: 0, routes: [{ name: 'DrawerNavigator', params: { screen: 'Home' } }] });
  return (
    <FitnessScreen title={summary ? 'You showed up. That matters.' : 'Your session summary'} eyebrow="04 / COMPLETION">
      {summary ? (
        <View style={ui.card}>
          <Text style={ui.kicker}>{GOAL_LABELS[summary.goal].toUpperCase()} / SESSION FINISHED</Text>
          <WorkoutHero>
            <Text style={ui.kicker}>WORKOUT COMPLETE</Text>
            <Text style={ui.hero}>{summary.title}</Text>
            <Text style={ui.body}>Take a breath. Every session counts.</Text>
          </WorkoutHero>
          <Text style={ui.body}>
            {summary.completedExercises === summary.exerciseCount
              ? 'Workout completed. Enjoy a moment to recover.'
              : 'Session finished. You chose your own pace; skipped entries are recorded separately.'}
          </Text>
          <View style={ui.stats}>
            <Stat value={`${summary.completedExercises}/${summary.exerciseCount}`} label="Exercises completed" />
            <Stat value={formatTime(summary.activeSeconds)} label="Actual active time (m:ss)" />
            <Stat value={String(summary.skippedExercises)} label="Exercises skipped" />
          </View>
          <Text style={ui.body}>{new Date(summary.completedAt).toLocaleString()}</Text>
          <Text style={ui.caption}>
            Active time includes exercise, rest and transitions; paused time is excluded.{' '}
            {storageWarning ? 'Available in memory for this app session.' : 'Saved locally on this device.'}
          </Text>
        </View>
      ) : (
        <Text style={ui.body}>No saved summary was found. Your other progress is still available.</Text>
      )}
      <Actions>
        <DefaultFocus>
          <FitnessButton text="Return Home" onSelect={home} style={ui.primary} />
        </DefaultFocus>
        <FitnessButton text="Start another workout" onSelect={() => navigation.replace('WorkoutSetup')} />
        <FitnessButton
          text="View progress"
          onSelect={() =>
            navigation.reset({ index: 0, routes: [{ name: 'DrawerNavigator', params: { screen: 'Progress' } }] })
          }
        />
      </Actions>
    </FitnessScreen>
  );
}
