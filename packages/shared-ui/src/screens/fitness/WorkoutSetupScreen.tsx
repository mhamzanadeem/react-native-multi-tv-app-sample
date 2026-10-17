import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, usePreventRemove, useIsFocused, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import WorkoutOptionGrid from '../../components/fitness/WorkoutOptionGrid';
import WorkoutStepper from '../../components/fitness/WorkoutStepper';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { FitnessButton, Actions, ui } from '../../components/fitness/FitnessPrimitives';
const goals: WorkoutGoal[] = ['general-fitness', 'strength', 'cardio', 'mobility', 'flexibility'];
const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];
const durations: WorkoutDuration[] = [5, 10, 15, 20, 30, 45, 60];
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
  const isFocused = useIsFocused();
  // Each new setup starts with the first option in every group. Saved preferences
  // must not preselect a different option or overwrite changes in this draft.
  const [config, setConfig] = useState<WorkoutConfig>(() => ({ ...DEFAULT_CONFIG, equipment: [] }));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  usePreventRemove(isFocused && (step > 0 || busy), () => {
    if (!busy) setStep((current) => Math.max(0, current - 1));
  });
  const steps = [
    'Goal',
    'Experience',
    'Duration',
    'Equipment',
    'Workout style',
    'Body focus',
    'Position',
    'Recovery',
    'Avoid exercises',
    'Review',
  ];
  const questions = [
    'What would you like to work on?',
    'How familiar are you with exercise?',
    'How much time do you have?',
    'What equipment can you use?',
    'Choose your workout style',
    'Which body region should the plan focus on?',
    'Which movement positions suit you?',
    'Choose rest and exercise variety',
    'Any exercises you want to leave out?',
    'Review your workout choices',
  ];
  const goalDescriptions: Partial<Record<WorkoutGoal, string>> = {
    'general-fitness': 'A mix of movement types. More variety, with less emphasis on one training goal.',
    strength: 'Emphasizes strength-oriented sets. Expect repetitions and rest rather than continuous movement.',
    cardio: 'Emphasizes timed movement blocks. Less emphasis on strength-oriented sets.',
    mobility: 'Focuses on controlled movement through a comfortable range. Less emphasis on fast-paced work.',
    flexibility: 'Focuses on stretching-oriented movements. Choose another goal for a strength or cardio emphasis.',
  };
  const levelDescriptions: Record<FitnessLevel, string> = {
    beginner:
      'Limits the plan to beginner-tagged exercises. A useful choice when learning or returning; fewer exercise choices.',
    intermediate: 'Allows beginner and intermediate exercises. More variety, assuming you know the basic movements.',
    advanced: 'Allows all catalogue levels. More complex options may appear; this does not prescribe heavier weights.',
  };
  const equipmentDescriptions: Record<WorkoutEquipment, string> = {
    dumbbells: 'Allows exercises that need dumbbells. Pick your own manageable weight; other constraints still apply.',
    'resistance-band': 'Allows band exercises. You need an intact band and suitable space for the movement.',
    'exercise-mat': 'Allows mat-based exercises. Some involve getting down to the floor and standing up again.',
    chair:
      'Allows chair-supported exercises. Requires a stable chair; selecting it does not make every exercise seated.',
    kettlebell: 'Allows suitable kettlebell exercises. Availability depends on experience and workout style.',
    'stationary-bike':
      'Allows cycling styles when compatible. Requires a stationary bike; the app cannot control its resistance.',
    'rowing-machine':
      'Allows rowing styles when compatible. Requires a rowing machine and familiarity with its technique.',
  };

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
      key={step}
      title={questions[step]}
      eyebrow={`BUILD YOUR WORKOUT / STEP ${step + 1} OF ${steps.length}`}
      drawer={String(route.name) === 'Workouts'}
      backAction={() => {
        if (busy) return;
        if (step > 0) setStep(step - 1);
        else navigation.goBack();
      }}
      progress={<WorkoutStepper steps={steps} current={step} />}>
      <Text style={ui.caption}>
        {step === 9
          ? 'Check all your choices, then generate your workout. Previous step keeps your selections.'
          : step === 8
            ? 'Optional: select any exercises to exclude, or keep No exclusions and continue.'
            : step === 3
              ? 'Choose all equipment you have. Selecting equipment allows it; it does not guarantee the plan will use it.'
              : 'Choose one option. Press OK to select; Next keeps your choice.'}
      </Text>
      <Text style={ui.caption}>{'\u2713 means selected. The glow shows remote focus.'}</Text>
      {step === 0 && (
        <WorkoutOptionGrid
          disabled={busy}
          options={goals.map((goal) => ({
            id: goal,
            label: GOAL_LABELS[goal],
            description: goalDescriptions[goal] ?? '',
            selected: config.goal === goal,
            onSelect: () => choose('goal', goal),
          }))}
        />
      )}
      {step === 1 && (
        <WorkoutOptionGrid
          disabled={busy}
          options={levels.map((level) => ({
            id: level,
            label: level[0].toUpperCase() + level.slice(1),
            description: levelDescriptions[level],
            selected: config.fitnessLevel === level,
            onSelect: () => choose('fitnessLevel', level),
          }))}
        />
      )}
      {step === 2 && (
        <WorkoutOptionGrid
          disabled={busy}
          options={durations.map((duration) => ({
            id: String(duration),
            label: `${duration} minutes`,
            description:
              duration <= 15
                ? 'A shorter time commitment. Fewer exercises or rounds fit; the duration is an estimate.'
                : duration <= 30
                  ? 'More room for exercises, sets and rest. Needs a longer time commitment; duration is estimated.'
                  : 'More time for repeated circuits and rest. Requires a longer commitment, not necessarily harder movements.',
            selected: config.durationMinutes === duration,
            onSelect: () => choose('durationMinutes', duration),
          }))}
        />
      )}
      {step === 3 && (
        <WorkoutOptionGrid
          multiSelect
          disabled={busy}
          options={[
            {
              id: 'none',
              actionLabel: 'Clear equipment',
              label: 'No equipment',
              description:
                'Uses exercises with no listed equipment requirements. Easy to start, but equipment-based options are excluded.',
              selected: config.equipment.length === 0,
              onSelect: () => choose('equipment', []),
            },
            ...equipment.map((item) => ({
              id: item,
              label: EQUIPMENT_LABELS[item],
              description: equipmentDescriptions[item],
              selected: config.equipment.includes(item),
              onSelect: () => toggleEquipment(item),
            })),
          ]}
        />
      )}
      {step === 4 && (
        <WorkoutOptionGrid
          disabled={busy}
          options={WORKOUT_STYLES.filter((style) => style.goals.includes(config.goal)).map((style) => ({
            id: style.id,
            label: style.label,
            description: style.description,
            selected: (config.style ?? 'balanced') === style.id,
            onSelect: () => choose('style', style.id),
          }))}
        />
      )}
      {step === 5 && (
        <WorkoutOptionGrid
          disabled={busy}
          options={(Object.keys(BODY_FOCUS) as BodyFocus[]).map((focus) => ({
            id: focus,
            label: BODY_FOCUS[focus],
            description:
              focus === 'full-body'
                ? 'Keeps all body regions available for variety.'
                : 'Limits the exercise pool to this region. Compound exercises may also involve other areas.',
            selected: (config.bodyFocus ?? 'full-body') === focus,
            onSelect: () => choose('bodyFocus', focus),
          }))}
        />
      )}
      {step === 6 && (
        <>
          <WorkoutOptionGrid
            disabled={busy}
            options={(Object.keys(POSITIONS) as MovementPosition[]).map((position) => ({
              id: position,
              label: POSITIONS[position],
              description:
                position === 'any'
                  ? 'Allows floor, standing and seated options when compatible.'
                  : 'Restricts exercises to this position. Fewer matching options may be available.',
              selected: (config.position ?? 'any') === position,
              onSelect: () => choose('position', position),
            }))}
          />
          <Text style={ui.heading}>Movement preference</Text>
          <WorkoutOptionGrid
            disabled={busy}
            options={[
              {
                id: 'low',
                label: 'Low impact',
                description:
                  'Excludes exercises not tagged low impact. This is a preference, not an injury-safety assessment.',
                selected: config.lowImpact === true,
                onSelect: () => choose('lowImpact', true),
              },
              {
                id: 'impact',
                label: 'Impact allowed',
                description:
                  'Allows impact-tagged movements when compatible. Jumping may appear but is not guaranteed.',
                selected: !config.lowImpact,
                onSelect: () => choose('lowImpact', false),
              },
            ]}
          />
        </>
      )}
      {step === 7 && (
        <>
          <WorkoutOptionGrid
            disabled={busy}
            options={[
              {
                id: 'standard',
                label: 'Standard rest',
                description:
                  'Uses the catalogue rest periods, leaving more of the target time for exercise than Extra rest.',
                selected: config.restPreference !== 'extra',
                onSelect: () => choose('restPreference', 'standard'),
              },
              {
                id: 'extra',
                label: 'Extra rest',
                description:
                  'Adds 15 seconds between sets. More recovery leaves less room for exercise in the target duration.',
                selected: config.restPreference === 'extra',
                onSelect: () => choose('restPreference', 'extra'),
              },
              {
                id: 'variety',
                label: 'Change exercise order',
                description: 'Requests another valid sequence. A small matching catalogue may produce repeated orders.',
                selected: false,
                onSelect: () => choose('variation', ((config.variation ?? 0) + 1) % 10000),
              },
            ]}
          />
          <Text style={ui.caption}>
            Exercise order variation: {config.variation ?? 0}. Changing order does not change your other preferences.
          </Text>
        </>
      )}
      {step === 8 && (
        <>
          <Text style={ui.body}>
            {config.excludedExerciseIds?.length ?? 0} exercises excluded. Choose more than one if needed.
          </Text>
          <WorkoutOptionGrid
            multiSelect
            disabled={busy}
            options={[
              {
                id: 'none',
                actionLabel: 'Clear exclusions',
                label: 'No exclusions',
                description: 'Keeps all compatible exercises available. Select this to clear the exclusion list.',
                selected: !config.excludedExerciseIds?.length,
                onSelect: () => choose('excludedExerciseIds', []),
              },
              ...EXERCISES.map((exercise) => ({
                id: exercise.id,
                label: exercise.name,
                description: config.excludedExerciseIds?.includes(exercise.id)
                  ? 'Excluded from your plan. Deselect to allow this exercise again.'
                  : 'Select to exclude this exercise. Excluding too many options may leave no matching workout.',
                selected: config.excludedExerciseIds?.includes(exercise.id) ?? false,
                onSelect: () =>
                  choose(
                    'excludedExerciseIds',
                    config.excludedExerciseIds?.includes(exercise.id)
                      ? config.excludedExerciseIds.filter((id) => id !== exercise.id)
                      : [...(config.excludedExerciseIds ?? []), exercise.id],
                  ),
              })),
            ]}
          />
        </>
      )}
      {step === 9 && (
        <View style={ui.card}>
          <Text style={ui.heading}>Your plan preferences</Text>
          <Text style={ui.body}>Goal: {GOAL_LABELS[config.goal]}</Text>
          <Text style={ui.body}>Experience: {config.fitnessLevel}</Text>
          <Text style={ui.body}>Time: {config.durationMinutes} minutes (estimated)</Text>
          <Text style={ui.body}>
            Equipment:{' '}
            {config.equipment.length
              ? config.equipment.map((item) => EQUIPMENT_LABELS[item]).join(', ')
              : 'No equipment'}
          </Text>
          <Text style={ui.body}>
            Style: {WORKOUT_STYLES.find((style) => style.id === (config.style ?? 'balanced'))?.label}
          </Text>
          <Text style={ui.body}>Body focus: {BODY_FOCUS[config.bodyFocus ?? 'full-body']}</Text>
          <Text style={ui.body}>
            Position: {POSITIONS[config.position ?? 'any']} / {config.lowImpact ? 'Low impact' : 'Impact allowed'}
          </Text>
          <Text style={ui.body}>
            Rest: {config.restPreference === 'extra' ? 'Extra rest' : 'Standard rest'} / Variation{' '}
            {config.variation ?? 0}
          </Text>
          <Text style={ui.body}>
            Excluded exercises:{' '}
            {config.excludedExerciseIds?.length
              ? EXERCISES.filter((exercise) => config.excludedExerciseIds?.includes(exercise.id))
                  .map((exercise) => exercise.name)
                  .join(', ')
              : 'None'}
          </Text>
          <Text style={ui.caption}>
            Use Previous step or Back to revise a choice. Plans use catalogue rules, not AI or medical screening.
          </Text>
        </View>
      )}
      {step >= 4 && customizationConflict(config) && (
        <Text accessibilityRole="alert" style={ui.error}>
          {customizationConflict(config)}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      <Actions singleRow>
        {step > 0 && <FitnessButton text="Previous step" disabled={busy} onSelect={() => setStep(step - 1)} />}
        {step < steps.length - 1 ? (
          <FitnessButton text="Next" onSelect={() => setStep(step + 1)} />
        ) : (
          <FitnessButton
            text={busy ? 'Generating your plan...' : 'Generate workout plan'}
            onSelect={() => {
              void generate();
            }}
            disabled={busy}
            testID="generate-plan"
          />
        )}
      </Actions>
    </FitnessScreen>
  );
}
