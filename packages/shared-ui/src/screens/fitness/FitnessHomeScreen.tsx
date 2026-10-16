import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutGoal } from '../../types/workout';
import { useFormFit } from '../../hooks/FormFitContext';
import { progressTotals } from '../../domain/workoutProgress';
import { GOAL_LABELS, formatTime } from '../../domain/workoutConfig';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import FocusablePressable from '../../components/FocusablePressable';
import WorkoutHero from '../../components/fitness/WorkoutHero';
import { scaledPixels as px } from '../../hooks/useScale';
import { FitnessButton, Actions, Stat, ui } from '../../components/fitness/FitnessPrimitives';

const GOALS: WorkoutGoal[] = ['general-fitness', 'strength', 'cardio', 'mobility', 'flexibility'];
export default function FitnessHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { history, plan, createPlan } = useFormFit();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totals = progressTotals(history);
  async function recommended() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await createPlan({
        goal: 'cardio',
        fitnessLevel: 'beginner',
        durationMinutes: 10,
        equipment: [],
        lowImpact: true,
      });
      navigation.navigate('WorkoutPlan', { planId: next.id });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create your workout. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <FitnessScreen title="Home" eyebrow="YOUR PERSONAL FITNESS SPACE" drawer>
      <WorkoutHero>
        <Text style={ui.hero}>Your Fitness{'\n'}Journey Starts Here</Text>
        <Text style={ui.body}>Personalized workouts. Better movement. A stronger you.</Text>
        <Actions>
          <DefaultFocus>
            <FitnessButton
              text="Start Workout"
              variant="compact"
              onSelect={() => navigation.navigate('WorkoutSetup')}
              style={ui.primary}
              testID="start-workout"
            />
          </DefaultFocus>
        </Actions>
      </WorkoutHero>
      <Text style={ui.heading}>Quick Start</Text>
      <Actions>
        <FocusablePressable
          text="Build Your Plan"
          backgroundImage={require('../../assets/fitness/workout-hero.png')}
          icon={'\u2723'}
          description="Create a personalized workout plan"
          accessibilityLabel="Build Your Plan"
          style={[styles.quickCard, styles.blue]}
          onSelect={() => navigation.navigate('WorkoutSetup')}
        />
        <FocusablePressable
          text="Continue Workout"
          icon={'\u25F7'}
          description={plan ? 'Review your current workout plan' : 'Build a plan to get started'}
          accessibilityLabel="Continue Workout"
          disabled={!plan}
          style={[styles.quickCard, styles.green]}
          onSelect={() => {
            if (plan) navigation.navigate('WorkoutPlan', { planId: plan.id });
          }}
        />
        <FocusablePressable
          text="View Progress"
          icon={'\u25A5'}
          description="Track your achievements"
          accessibilityLabel="View Progress"
          style={[styles.quickCard, styles.orange]}
          onSelect={() => navigation.navigate('DrawerNavigator', { screen: 'Progress' })}
        />
        <FocusablePressable
          text="Settings"
          icon={'\u2699'}
          description="Manage your preferences"
          accessibilityLabel="Settings"
          style={styles.quickCard}
          onSelect={() => navigation.navigate('DrawerNavigator', { screen: 'Settings' })}
        />
      </Actions>
      <View style={ui.card}>
        <Text style={ui.kicker}>RECOMMENDED FOR YOU</Text>
        <Text style={ui.heading}>Low-impact energy</Text>
        <Text style={ui.body}>10 minutes / Beginner / No equipment</Text>
        <Actions>
          <FitnessButton
            text={busy ? 'Creating plan...' : 'View 10-minute plan'}
            disabled={busy}
            onSelect={() => {
              void recommended();
            }}
          />
        </Actions>
        {error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
      </View>
      <Text style={ui.heading}>Choose your direction</Text>
      <Actions>
        {GOALS.map((goal) => (
          <FitnessButton
            key={goal}
            text={GOAL_LABELS[goal]}
            onSelect={() => navigation.navigate('WorkoutSetup', { goal })}
          />
        ))}
      </Actions>
      <Text style={ui.heading}>Your activity</Text>
      <View style={ui.stats}>
        <Stat value={String(totals.sessions)} label="Sessions finished" />
        <Stat value={formatTime(totals.activeSeconds)} label="Active time (m:ss)" />
        <Stat value={String(totals.thisWeek)} label="Sessions in the last 7 days" />
      </View>
      <Text style={ui.body}>
        {history.length
          ? `Last session: ${history[0].title} / ${history[0].completedExercises} exercises completed`
          : 'Your first workout starts here. Complete a session to see your own progress.'}
      </Text>
      <Actions>
        <FitnessButton
          text="View progress"
          onSelect={() => navigation.navigate('DrawerNavigator', { screen: 'Progress' })}
        />
      </Actions>
    </FitnessScreen>
  );
}

const styles = StyleSheet.create({
  quickCard: {
    width: px(310),
    minWidth: px(240),
    minHeight: px(280),
    padding: px(24),
    borderRadius: px(20),
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: '#1A2748',
  },
  blue: { backgroundColor: '#172B63' },
  green: { backgroundColor: '#153659' },
  orange: { backgroundColor: '#32245D' },
});
