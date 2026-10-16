import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import { useFormFit } from '../../hooks/FormFitContext';
import type { RootStackParamList } from '../../navigation/types';
import { GOAL_LABELS, equipmentLabel, formatTime } from '../../domain/workoutConfig';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, ReadingCard, ui } from '../../components/fitness/FitnessPrimitives';
export default function WorkoutPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutPlan'>>();
  const { plan } = useFormFit();
  if (!plan || plan.id !== route.params.planId)
    return (
      <FitnessScreen title="Let's make a fresh plan" eyebrow="02 / REVIEW">
        <Text style={ui.body}>This plan is no longer available. Your saved progress is safe.</Text>
        <DefaultFocus>
          <FitnessButton text="Workout setup" onSelect={() => navigation.replace('WorkoutSetup')} />
        </DefaultFocus>
      </FitnessScreen>
    );
  const start = () => navigation.navigate('WorkoutSession', { planId: plan.id });
  return (
    <FitnessScreen title={plan.title} eyebrow="02 / YOUR PERSONAL PLAN" backAction={() => navigation.goBack()}>
      <View style={ui.card}>
        <Text style={ui.kicker}>
          {GOAL_LABELS[plan.goal]} / {plan.fitnessLevel.toUpperCase()}
        </Text>
        <Text style={ui.body}>
          {formatTime(plan.estimatedDurationSeconds)} estimated ? {plan.exercises.length} exercises
        </Text>
        <Text style={ui.body}>
          {equipmentLabel(plan.config.equipment)} ? {plan.config.lowImpact ? 'Low impact' : 'Impact allowed'}
        </Text>
        <Text style={ui.caption}>Follow the exercises in order. You can pause or skip during your workout.</Text>
      </View>
      <Actions>
        <DefaultFocus>
          <FitnessButton
            text="Start Workout"
            variant="compact"
            onSelect={start}
            style={ui.primary}
            testID="start-session"
          />
        </DefaultFocus>
        <FitnessButton
          text="Change preferences"
          variant="compact"
          onSelect={() => navigation.navigate('WorkoutSetup')}
        />
      </Actions>
      <Text style={ui.heading}>Your exercises</Text>
      {plan.notes?.map((note) => (
        <Text key={note} style={ui.caption}>
          {note}
        </Text>
      ))}
      {plan.exercises.map((item, index) => (
        <ReadingCard key={`${index}-${item.exercise.id}`} label={`Exercise ${index + 1}: ${item.exercise.name}`}>
          <Text style={ui.kicker}>
            {String(index + 1).padStart(2, '0')} / {item.exercise.category.toUpperCase()} /{' '}
            {formatTime(item.estimatedSeconds)}
          </Text>
          <Text style={ui.heading}>{item.exercise.name}</Text>
          <Text style={ui.body}>
            {item.sets} sets /{' '}
            {item.durationSeconds ? `${item.durationSeconds} seconds per set` : `${item.reps} reps per set`} /{' '}
            {item.restSeconds}s rest between sets
          </Text>
          <Text style={ui.caption}>
            {equipmentLabel(item.exercise.equipment)} / {item.exercise.muscles.join(', ')}
          </Text>
          <Text style={ui.body}>{item.exercise.techniqueCues.join(' ')}</Text>
          {item.exercise.modification && <Text style={ui.caption}>Easier option: {item.exercise.modification}</Text>}
        </ReadingCard>
      ))}
    </FitnessScreen>
  );
}
