import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageBackground, View, Text, StyleSheet } from 'react-native';
import { useIsFocused, useNavigation, useRoute, type NavigationAction, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus } from 'react-tv-space-navigation';
import { usePreventRemove } from '../../navigation/useWorkoutExit';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutPlan } from '../../types/workout';
import { useFormFit } from '../../hooks/FormFitContext';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { summarizeSession } from '../../domain/workoutSession';
import { formatTime } from '../../domain/workoutConfig';
import { validatePlan } from '../../services/workoutPlanner';
import RemoteControlManager from '../../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../app/remote-control/SupportedKeys';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import ConfirmEnd from '../../components/fitness/ConfirmEnd';
import { FitnessButton, Actions, ui } from '../../components/fitness/FitnessPrimitives';
import { fitnessColors as c } from '../../theme/fitness';
import { scaledPixels as px } from '../../hooks/useScale';

export default function WorkoutSessionScreen() {
  const { plan } = useFormFit();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutSession'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  let error: string | null = null;
  try {
    if (!plan || plan.id !== route.params.planId) throw new Error('Your plan is no longer available.');
    validatePlan(plan);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : 'This plan is unavailable.';
  }
  if (error || !plan)
    return (
      <FitnessScreen title="Make a fresh workout" eyebrow="03 / WORKOUT">
        <Text style={ui.body}>{error}</Text>
        <DefaultFocus>
          <FitnessButton text="Workout setup" onSelect={() => navigation.replace('WorkoutSetup')} />
        </DefaultFocus>
      </FitnessScreen>
    );
  return <SessionExperience plan={plan} />;
}
function SessionExperience({ plan }: { plan: WorkoutPlan }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { recordSession } = useFormFit();
  const { state, dispatch } = useWorkoutSession(plan, isFocused);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingAction = useRef<NavigationAction | null>(null);
  const wasRunning = useRef(false);
  const saving = useRef(false);
  const requestEnd = useCallback(() => {
    if (confirmVisible) return;
    wasRunning.current = state.status === 'running';
    dispatch({ type: 'pause', now: Date.now() });
    setConfirmVisible(true);
  }, [dispatch, state.status, confirmVisible]);
  usePreventRemove(
    !exitRequested && isFocused && (state.status === 'running' || state.status === 'paused'),
    ({ data }) => {
      pendingAction.current = data.action;
      requestEnd();
    },
  );
  const cancel = () => {
    setConfirmVisible(false);
    pendingAction.current = null;
    if (wasRunning.current) dispatch({ type: 'resume', now: Date.now() });
  };
  useEffect(() => {
    if (!exitRequested) return;
    // Native-stack reads prevent-remove state from its provider. Let the guard's
    // disabled state commit before resetting; dispatching in the same effect
    // flush as abandonment can still encounter the previous native guard.
    const frame = requestAnimationFrame(() => {
      const action = pendingAction.current;
      pendingAction.current = null;
      if (action) navigation.dispatch(action);
      else navigation.reset({ index: 0, routes: [{ name: 'DrawerNavigator', params: { screen: 'Home' } }] });
    });
    return () => cancelAnimationFrame(frame);
  }, [exitRequested, navigation]);
  const saveSummary = useCallback(async () => {
    if (saving.current || state.status !== 'completed') return;
    saving.current = true;
    setSaveError(null);
    try {
      const summary = summarizeSession(state);
      await recordSession(summary);
      navigation.replace('WorkoutComplete', { summaryId: summary.id });
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : 'Could not record this session.');
      saving.current = false;
    }
  }, [state, navigation, recordSession]);
  useEffect(() => {
    if (state.status === 'completed') {
      void saveSummary();
    }
  }, [state.status, saveSummary]);
  useEffect(() => {
    if (!isFocused) return;
    const listener = RemoteControlManager.addKeydownListener((key) => {
      if (key !== SupportedKeys.PlayPause || confirmVisible) return;
      dispatch({
        type: state.status === 'ready' ? 'start' : state.status === 'running' ? 'pause' : 'resume',
        now: Date.now(),
      });
    });
    return () => RemoteControlManager.removeKeydownListener(listener);
  }, [state.status, isFocused, confirmVisible, dispatch]);
  const step = state.steps[Math.min(state.stepIndex, state.steps.length - 1)];
  const exercise = plan.exercises[step.exerciseIndex];
  const next = plan.exercises[step.exerciseIndex + 1];
  const running = state.status === 'running';
  const done = state.status === 'completed';
  const phase =
    step.kind === 'exercise'
      ? 'Move at your own pace'
      : step.kind === 'rest'
        ? 'Recover between sets'
        : 'Get ready for the next exercise';
  const totalSeconds = state.steps.reduce((sum, item) => sum + item.seconds, 0);
  const passed =
    state.steps.slice(0, state.stepIndex).reduce((sum, item) => sum + item.seconds, 0) +
    (done ? 0 : step.seconds - state.remainingMs / 1000);
  const progress = Math.min(100, Math.round((passed / totalSeconds) * 100));
  const mainLabel = state.status === 'ready' ? 'Begin session' : running ? 'Pause workout' : 'Resume workout';
  return (
    <>
      <FitnessScreen
        title={state.status === 'paused' ? 'Paused / take your time' : done ? 'Session finished' : phase}
        eyebrow="03 / GUIDED WORKOUT"
        active={!confirmVisible && !exitRequested}>
        <View style={ui.row}>
          <ImageBackground
            source={require('../../assets/fitness/workout-hero.png')}
            imageStyle={{ opacity: 0.18, borderRadius: px(20) }}
            style={[ui.card, styles.main]}>
            <Text style={ui.kicker}>
              EXERCISE {step.exerciseIndex + 1} OF {plan.exercises.length} / SET {step.set} OF {exercise.sets}
            </Text>
            <Text accessibilityRole="header" style={ui.hero}>
              {exercise.exercise.name}
            </Text>
            <Text accessibilityLabel={`${Math.ceil(state.remainingMs / 1000)} seconds remaining`} style={styles.timer}>
              {formatTime(state.remainingMs / 1000)}
            </Text>
            <Text style={ui.body}>
              {step.kind === 'exercise'
                ? exercise.exercise.description
                : step.kind === 'rest'
                  ? 'Breathe steadily and recover. The next set starts automatically.'
                  : 'Set up safely. Your next exercise starts automatically.'}
            </Text>
            <Text style={ui.caption}>
              {exercise.reps
                ? `${exercise.reps} reps / estimated 4 seconds per rep`
                : `${exercise.durationSeconds} seconds per set`}{' '}
              / finish a set when ready
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <Text style={ui.caption}>
              {progress}% through the planned sequence / {formatTime(state.activeMs / 1000)} active time
            </Text>
          </ImageBackground>
          <View style={[ui.card, styles.aside]}>
            <Text style={ui.kicker}>TECHNIQUE CHECK</Text>
            {exercise.exercise.techniqueCues.map((cue) => (
              <Text style={ui.body} key={cue}>
                {cue}
              </Text>
            ))}
            <Text style={ui.caption}>{exercise.exercise.modification}</Text>
            <Text style={[ui.heading, styles.nextTitle]}>Up next</Text>
            <Text style={ui.body}>{next ? next.exercise.name : 'Your completion summary'}</Text>
            <Text style={ui.caption}>
              {next ? `${next.sets} sets / ${formatTime(next.estimatedSeconds)}` : 'You are on the final exercise.'}
            </Text>
            <Text style={ui.small}>
              Remote Play/Pause also controls the timer. Backgrounding the app pauses your workout.
            </Text>
          </View>
        </View>
        {!done ? (
          <Actions singleRow>
            <DefaultFocus>
              <FitnessButton
                text={mainLabel}
                description="Control your workout timer"
                onSelect={() =>
                  dispatch({ type: state.status === 'ready' ? 'start' : running ? 'pause' : 'resume', now: Date.now() })
                }
                style={styles.actionCard}
                testID="session-main"
              />
            </DefaultFocus>
            <FitnessButton
              text={step.kind === 'exercise' ? 'Finish set' : step.kind === 'rest' ? 'Finish rest' : 'Next exercise'}
              description="Move to the next workout phase"
              style={styles.actionCard}
              disabled={state.status === 'ready'}
              onSelect={() => dispatch({ type: 'next', now: Date.now() })}
            />
            <FitnessButton
              text="Skip exercise"
              description="Move past the current exercise"
              style={styles.actionCard}
              disabled={state.status === 'ready' || step.kind === 'transition'}
              onSelect={() => dispatch({ type: 'skip', now: Date.now() })}
            />
            <FitnessButton
              text="End session"
              description="Review before leaving this workout"
              style={styles.actionCard}
              onSelect={requestEnd}
            />
          </Actions>
        ) : (
          <Text style={ui.body}>Recording your completion...</Text>
        )}
        {saveError && (
          <>
            <Text accessibilityRole="alert" style={ui.error}>
              {saveError}
            </Text>
            <Actions>
              <FitnessButton
                text="Retry saving summary"
                onSelect={() => {
                  void saveSummary();
                }}
              />
            </Actions>
          </>
        )}
      </FitnessScreen>
      <ConfirmEnd
        visible={confirmVisible}
        cancel={cancel}
        confirm={() => {
          if (exitRequested) return;
          setConfirmVisible(false);
          setExitRequested(true);
          dispatch({ type: 'abandon', now: Date.now() });
        }}
      />
    </>
  );
}
const styles = StyleSheet.create({
  actionCard: { width: '100%', minWidth: 0, minHeight: px(230), padding: px(20) },
  main: { flex: 7, minWidth: px(520) },
  aside: { flex: 4, minWidth: px(360) },
  timer: {
    color: c.primary,
    fontSize: px(136),
    fontWeight: '700',
    marginVertical: px(8),
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: px(12),
    backgroundColor: c.border,
    borderRadius: px(6),
    marginTop: px(20),
    marginBottom: px(12),
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: c.primary },
  nextTitle: { marginTop: px(28) },
});
