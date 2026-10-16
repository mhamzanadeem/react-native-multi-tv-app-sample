import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { DefaultFocus } from 'react-tv-space-navigation';
import FitnessScreen from '../../components/fitness/FitnessScreen';
import { Actions, FitnessButton, ReadingCard, ui } from '../../components/fitness/FitnessPrimitives';
import { backendConfig } from '../../services/backend/config';
import { createBackend } from '../../services/backend/createBackend';
import { MockWorkoutBackend } from '../../services/backend/MockWorkoutBackend';
import { scenarios } from '../../services/backend/scenarios';
import { routes, type ApiResult, type Operation, type WorkoutBackend } from '../../services/backend/contracts';
import { record } from '../../services/backend/validation';
import { GOAL_LABELS, EQUIPMENT_LABELS } from '../../domain/workoutConfig';
import type { WorkoutConfig, WorkoutEquipment, WorkoutGoal } from '../../types/workout';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function jsonPages(value: unknown): string[] {
  const lines = JSON.stringify(value, null, 2).split('\n');
  const pages: string[] = [];
  for (let index = 0; index < lines.length; index += 10) pages.push(lines.slice(index, index + 10).join('\n'));
  return pages;
}
export default function MockAwsScreen() {
  const [scenario, setScenario] = useState(scenarios[0]);
  const [input, setInput] = useState<unknown>(() => clone(scenarios[0].input));
  const [result, setResult] = useState<ApiResult<Operation> | null>(null);
  const [busy, setBusy] = useState(false);
  const [configurationError, setConfigurationError] = useState('');
  const backend = useRef<WorkoutBackend | null>(null);
  const mounted = useRef(true);
  const lock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    try {
      backend.current = createBackend(backendConfig);
    } catch (error) {
      setConfigurationError(error instanceof Error ? error.message : 'Invalid backend configuration.');
    }
    return () => {
      mounted.current = false;
    };
  }, []);
  const request = record(input) ? input : {};
  const config =
    scenario.operation === 'updatePreferences' && record(request.preferences) ? request.preferences : request;
  const hasInputs = scenario.operation === 'generate' || scenario.operation === 'updatePreferences';
  function change(key: keyof WorkoutConfig, value: unknown) {
    if (lock.current) return;
    setInput(
      scenario.operation === 'updatePreferences'
        ? { ...request, preferences: { ...config, [key]: value } }
        : { ...request, [key]: value },
    );
    setResult(null);
  }
  function select(id: string) {
    if (lock.current) return;
    const next = scenarios.find((s) => s.id === id);
    if (next) {
      setScenario(next);
      setInput(clone(next.input));
      setResult(null);
    }
  }
  async function send() {
    if (lock.current || !backend.current) return;
    lock.current = true;
    setBusy(true);
    setResult(null);
    const submitted = clone(input);
    try {
      const response = await backend.current.request(
        scenario.operation,
        submitted,
        backend.current.mode === 'mock' ? scenario.id : undefined,
      );
      if (mounted.current) setResult(response);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const route = routes[scenario.operation];
  const responsePages = result ? jsonPages(result.body) : [];
  return (
    <FitnessScreen title="AWS Integration Demo" eyebrow="DEVELOPER / API LAB" drawer>
      <Text style={ui.kicker}>
        {backendConfig.mode === 'mock'
          ? 'MOCK MODE — NO AWS REQUESTS'
          : configurationError
            ? 'AWS MODE — CONFIGURATION BLOCKED'
            : 'AWS MODE — REAL HTTPS REQUESTS ON SEND'}
      </Text>
      <Text style={ui.body}>
        Personal on-device progress stays separate from lab data. Sample sessions are labelled. AWS mode sends real
        requests only when you select Send.
      </Text>
      {configurationError ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {configurationError}
        </Text>
      ) : null}
      <Text style={ui.heading}>Scenario</Text>
      {scenarios.map((item, index) => (
        <Actions key={item.id}>
          {index === 0 ? (
            <DefaultFocus>
              <FitnessButton
                text={item.label}
                selected={scenario.id === item.id}
                disabled={busy}
                onSelect={() => select(item.id)}
              />
            </DefaultFocus>
          ) : (
            <FitnessButton
              text={item.label}
              selected={scenario.id === item.id}
              disabled={busy}
              onSelect={() => select(item.id)}
            />
          )}
        </Actions>
      ))}
      {hasInputs ? (
        <>
          <Text style={ui.heading}>Request inputs</Text>
          <Text style={ui.caption}>Goal</Text>
          <Actions>
            {(['general-fitness', 'strength', 'cardio', 'mobility', 'flexibility'] as WorkoutGoal[]).map((goal) => (
              <FitnessButton
                key={goal}
                text={GOAL_LABELS[goal]}
                selected={config.goal === goal}
                disabled={busy}
                onSelect={() => change('goal', goal)}
              />
            ))}
          </Actions>
          <Text style={ui.caption}>Fitness level</Text>
          <Actions>
            {['beginner', 'intermediate', 'advanced'].map((level) => (
              <FitnessButton
                key={level}
                text={level}
                selected={config.fitnessLevel === level}
                disabled={busy}
                onSelect={() => change('fitnessLevel', level)}
              />
            ))}
          </Actions>
          <Text style={ui.caption}>Duration</Text>
          <Actions>
            {[10, 20, 30, 45, 0].map((duration) => (
              <FitnessButton
                key={duration}
                text={duration ? `${duration} minutes` : 'Invalid: 0 minutes'}
                selected={config.durationMinutes === duration}
                disabled={busy}
                onSelect={() => change('durationMinutes', duration)}
              />
            ))}
          </Actions>
          <Text style={ui.caption}>Equipment</Text>
          <Actions>
            <FitnessButton
              text="No equipment"
              selected={Array.isArray(config.equipment) && config.equipment.length === 0}
              disabled={busy}
              onSelect={() => change('equipment', [])}
            />
            {(Object.keys(EQUIPMENT_LABELS) as WorkoutEquipment[]).map((item) => (
              <FitnessButton
                key={item}
                text={EQUIPMENT_LABELS[item]}
                selected={Array.isArray(config.equipment) && config.equipment.includes(item)}
                disabled={busy}
                onSelect={() => {
                  const values = Array.isArray(config.equipment) ? config.equipment : [];
                  change('equipment', values.includes(item) ? values.filter((v) => v !== item) : [...values, item]);
                }}
              />
            ))}
            <FitnessButton
              text="Invalid: treadmill"
              disabled={busy}
              onSelect={() => change('equipment', ['treadmill'])}
            />
          </Actions>
          <Actions>
            <FitnessButton
              text="Low impact"
              selected={config.lowImpact === true}
              disabled={busy}
              onSelect={() => change('lowImpact', !config.lowImpact)}
            />
          </Actions>
        </>
      ) : null}
      <ReadingCard label="Outgoing request">
        <Text style={ui.heading}>
          {route.method} {route.path}
        </Text>
        <Text style={ui.small}>
          {route.method === 'GET'
            ? 'GET has no JSON body; requestId is sent in X-Request-Id.'
            : 'This JSON is the exact serialized request body.'}
        </Text>
      </ReadingCard>
      {jsonPages(input).map((chunk, index) => (
        <ReadingCard key={index} label={`Outgoing JSON part ${index + 1}`}>
          <Text selectable style={ui.caption}>
            {chunk}
          </Text>
        </ReadingCard>
      ))}
      <Actions>
        <FitnessButton
          text={busy ? 'Sending…' : backendConfig.mode === 'mock' ? 'Send Mock Request' : 'Send Real AWS Request'}
          disabled={busy || !!configurationError}
          onSelect={() => void send()}
        />
        <FitnessButton
          text="Reset demo"
          disabled={busy}
          onSelect={() => {
            if (backend.current instanceof MockWorkoutBackend) backend.current.reset();
            select('beginner');
          }}
        />
        <FitnessButton
          text="Malformed request"
          disabled={busy}
          onSelect={() => {
            setInput({ requestId: 'invalid request ID' });
            setResult(null);
          }}
        />
      </Actions>
      {busy ? <ActivityIndicator accessibilityLabel="Request loading" /> : null}
      {result ? (
        <>
          <Text accessibilityRole="alert" style={'error' in result.body ? ui.error : ui.kicker}>
            {'error' in result.body ? `ERROR / ${result.body.error.code}` : 'SUCCESS'} /{' '}
            {result.httpStatus === null ? 'No HTTP response' : `HTTP ${result.httpStatus}`} /{' '}
            {result.mode.toUpperCase()}
          </Text>
          <Text style={ui.caption}>
            Fixture:{' '}
            {result.fixture ? `packages/shared-ui/src/data/mock-api/${result.fixture}` : 'None — real HTTP adapter'}
          </Text>
          {'status' in result.body && 'plan' in result.body ? (
            <Text style={ui.body}>
              {result.body.plan.title} / {result.body.plan.exercises.length} exercises /{' '}
              {Math.round(result.body.plan.estimatedDurationSeconds / 60)} estimated minutes
            </Text>
          ) : null}
          {'status' in result.body && 'sessions' in result.body ? (
            <Text style={ui.body}>
              {result.body.sessions.length} sessions /{' '}
              {result.body.sampleData
                ? 'Includes explicitly labelled sample data'
                : result.mode === 'mock'
                  ? 'Demo memory only'
                  : 'Backend history'}
            </Text>
          ) : null}
          <Text style={ui.heading}>Response JSON</Text>
          {responsePages.map((chunk, index) => (
            <ReadingCard key={index} label={`Response JSON part ${index + 1}`}>
              <Text selectable style={ui.caption}>
                {chunk}
              </Text>
            </ReadingCard>
          ))}
        </>
      ) : null}
      <Text style={ui.body}>
        Future AWS: HTTPS API Gateway → Lambda validation and authorization → DynamoDB preferences and completed
        sessions. Optional Bedrock stays server-side. No cloud deployment or authentication exists in this demo.
      </Text>
    </FitnessScreen>
  );
}
