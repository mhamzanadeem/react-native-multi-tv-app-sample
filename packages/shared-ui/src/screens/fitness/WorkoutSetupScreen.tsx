import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import type { RootStackParamList } from '../../navigation/types';
import type {
  BodyFocus,
  MovementPosition,
  FitnessLevel,
  WorkoutConfig,
  WorkoutDuration,
  WorkoutEquipment,
  WorkoutGoal,
} from '../../types/workout';
import { useFormFit } from '../../hooks/FormFitContext';
import { DEFAULT_CONFIG, EQUIPMENT_LABELS, GOAL_LABELS } from '../../domain/workoutConfig';
import { BODY_FOCUS, POSITIONS, WORKOUT_STYLES, customizationConflict } from '../../domain/workoutCustomization';
import { EXERCISES } from '../../data/exercises';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, ui } from '../../components/fitness/FitnessPrimitives';
const goals: WorkoutGoal[] = ['general-fitness', 'strength', 'cardio', 'mobility', 'flexibility'];
const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];
const durations: WorkoutDuration[] = [10, 15, 20, 30, 45, 5, 60];
const equipment: WorkoutEquipment[] = [
  'dumbbells',
  'resistance-band',
  'exercise-mat',
  'chair',
  'kettlebell',
  'stationary-bike',
  'rowing-machine',
];
export default function WorkoutSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutSetup'>>();
  const { createPlan } = useFormFit();
  // Each new setup starts with the first option in every group. Saved preferences
  // must not preselect a different option or overwrite changes in this draft.
  const [config, setConfig] = useState<WorkoutConfig>(() => ({ ...DEFAULT_CONFIG, equipment: [] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customize, setCustomize] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);
  const lock = useRef(false);
  function choose<K extends keyof WorkoutConfig>(key: K, value: WorkoutConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value, ...(key === 'goal' ? { style: undefined } : {}) }));
    setError(null);
  }
  function toggleEquipment(item: WorkoutEquipment) {
    choose(
      'equipment',
      config.equipment.includes(item)
        ? config.equipment.filter((value) => value !== item)
        : [...config.equipment, item],
    );
  }
  async function generate() {
    if (lock.current) return;
    const conflict = customizationConflict(config);
    if (conflict) {
      setError(conflict);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan(config);
      navigation.navigate('WorkoutPlan', { planId: plan.id });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'This combination is unavailable. Choose different preferences.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FitnessScreen
      title="Build your workout"
      eyebrow="01 / PERSONALIZE"
      drawer={String(route.name) === 'Workouts'}
      backAction={route.name === 'WorkoutSetup' ? () => navigation.goBack() : undefined}>
      <Text style={ui.body}>Choose what works for you today. Use the D-pad to move and Select to choose.</Text>
      <Text style={ui.caption}>{'\u2713 means selected. Press OK to select an option.'}</Text>
      <View style={ui.card}>
        <Text style={ui.heading}>Your goal</Text>
        <Actions columns={5}>
          {goals.map((goal, index) =>
            index === 0 ? (
              <DefaultFocus key={goal}>
                <FitnessButton
                  text={GOAL_LABELS[goal]}
                  selected={config.goal === goal}
                  disabled={busy}
                  onSelect={() => choose('goal', goal)}
                />
              </DefaultFocus>
            ) : (
              <FitnessButton
                key={goal}
                text={GOAL_LABELS[goal]}
                selected={config.goal === goal}
                disabled={busy}
                onSelect={() => choose('goal', goal)}
              />
            ),
          )}
        </Actions>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Experience</Text>
        <Actions>
          {levels.map((level) => (
            <FitnessButton
              key={level}
              text={level[0].toUpperCase() + level.slice(1)}
              selected={config.fitnessLevel === level}
              disabled={busy}
              onSelect={() => choose('fitnessLevel', level)}
            />
          ))}
        </Actions>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Time available</Text>
        <Actions>
          {durations.map((duration) => (
            <FitnessButton
              key={duration}
              text={`${duration} minutes`}
              selected={config.durationMinutes === duration}
              disabled={busy}
              onSelect={() => choose('durationMinutes', duration)}
            />
          ))}
        </Actions>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Equipment you have</Text>
        <Actions>
          <FitnessButton
            text="No equipment"
            selected={config.equipment.length === 0}
            disabled={busy}
            onSelect={() => choose('equipment', [])}
          />
          {equipment.map((item) => (
            <FitnessButton
              key={item}
              text={EQUIPMENT_LABELS[item]}
              selected={config.equipment.includes(item)}
              disabled={busy}
              onSelect={() => toggleEquipment(item)}
            />
          ))}
        </Actions>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Movement preference</Text>
        <Actions>
          <FitnessButton
            text="Low impact"
            selected={config.lowImpact === true}
            disabled={busy}
            onSelect={() => choose('lowImpact', true)}
          />
          <FitnessButton
            text="Impact allowed"
            selected={!config.lowImpact}
            disabled={busy}
            onSelect={() => choose('lowImpact', false)}
          />
        </Actions>
      </View>
      <Actions>
        <FitnessButton
          text={customize ? 'Hide customization' : 'Customize workout style'}
          disabled={busy}
          onSelect={() => setCustomize(!customize)}
        />
      </Actions>
      <SpatialNavigationView direction="vertical">
        {customize && (
          <>
            <View style={ui.card}>
              <Text style={ui.heading}>Workout style</Text>
              <Text style={ui.caption}>
                Styles match your goal. Changing your goal resets the style; equipment and movement limits are always
                respected.
              </Text>
              <Actions>
                {WORKOUT_STYLES.filter((style) => style.goals.includes(config.goal)).map((style) => (
                  <FitnessButton
                    key={style.id}
                    text={style.label}
                    selected={(config.style ?? 'balanced') === style.id}
                    disabled={busy}
                    onSelect={() => choose('style', style.id)}
                  />
                ))}
              </Actions>
              <Text style={ui.body}>
                {WORKOUT_STYLES.find((style) => style.id === (config.style ?? 'balanced'))?.description}
              </Text>
            </View>
            <View style={ui.card}>
              <Text style={ui.heading}>Body focus</Text>
              <Text style={ui.caption}>
                Exercises involve the selected region. Compound movements may also involve other regions.
              </Text>
              <Actions>
                {(Object.keys(BODY_FOCUS) as BodyFocus[]).map((focus) => (
                  <FitnessButton
                    key={focus}
                    text={BODY_FOCUS[focus]}
                    selected={(config.bodyFocus ?? 'full-body') === focus}
                    disabled={busy}
                    onSelect={() => choose('bodyFocus', focus)}
                  />
                ))}
              </Actions>
            </View>
            <View style={ui.card}>
              <Text style={ui.heading}>Movement position</Text>
              <Actions>
                {(Object.keys(POSITIONS) as MovementPosition[]).map((position) => (
                  <FitnessButton
                    key={position}
                    text={POSITIONS[position]}
                    selected={(config.position ?? 'any') === position}
                    disabled={busy}
                    onSelect={() => choose('position', position)}
                  />
                ))}
              </Actions>
            </View>
            <View style={ui.card}>
              <Text style={ui.heading}>Recovery and variety</Text>
              <Actions>
                <FitnessButton
                  text="Standard rest"
                  selected={config.restPreference !== 'extra'}
                  disabled={busy}
                  onSelect={() => choose('restPreference', 'standard')}
                />
                <FitnessButton
                  text="Extra rest"
                  selected={config.restPreference === 'extra'}
                  disabled={busy}
                  onSelect={() => choose('restPreference', 'extra')}
                />
                <FitnessButton
                  text="Change exercise order"
                  disabled={busy}
                  onSelect={() => choose('variation', ((config.variation ?? 0) + 1) % 10000)}
                />
              </Actions>
              <Text style={ui.caption}>
                Variation {config.variation ?? 0}. Extra rest adds 15 seconds between sets. Different orders may repeat
                when the matching pool is small.
              </Text>
            </View>
            <View style={ui.card}>
              <Text style={ui.heading}>Exercises to avoid</Text>
              <Text style={ui.caption}>
                {config.excludedExerciseIds?.length ?? 0} excluded. These are preferences, not medical screening.
              </Text>
              <Actions>
                <FitnessButton
                  text={showExclusions ? 'Hide exercise list' : 'Choose exclusions'}
                  disabled={busy}
                  onSelect={() => setShowExclusions(!showExclusions)}
                />
                <FitnessButton
                  text="Clear exclusions"
                  disabled={busy || !config.excludedExerciseIds?.length}
                  onSelect={() => choose('excludedExerciseIds', [])}
                />
              </Actions>
              <SpatialNavigationView direction="vertical">
                {showExclusions && (
                  <Actions>
                    {EXERCISES.map((exercise) => (
                      <FitnessButton
                        key={exercise.id}
                        text={`Avoid ${exercise.name}`}
                        selected={config.excludedExerciseIds?.includes(exercise.id)}
                        disabled={busy}
                        onSelect={() =>
                          choose(
                            'excludedExerciseIds',
                            config.excludedExerciseIds?.includes(exercise.id)
                              ? config.excludedExerciseIds.filter((id) => id !== exercise.id)
                              : [...(config.excludedExerciseIds ?? []), exercise.id],
                          )
                        }
                      />
                    ))}
                  </Actions>
                )}
              </SpatialNavigationView>
            </View>
            {customizationConflict(config) && (
              <Text accessibilityRole="alert" style={ui.error}>
                {customizationConflict(config)}
              </Text>
            )}
          </>
        )}
      </SpatialNavigationView>
      <Text style={ui.caption}>
        Plans use validated catalogue rules, not AI or medical advice. No injury rehabilitation, pregnancy-specific,
        maximal lifting or unrestricted text requests are supported. Choose comfortable movements and pause if you need
        a break.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Actions>
        <FitnessButton
          text={busy ? 'Generating your plan...' : 'Generate workout plan'}
          onSelect={() => {
            void generate();
          }}
          disabled={busy}
          style={ui.primary}
          testID="generate-plan"
        />
      </Actions>
    </FitnessScreen>
  );
}
