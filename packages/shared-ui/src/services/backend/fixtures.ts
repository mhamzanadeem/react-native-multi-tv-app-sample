import generate from '../../data/mock-api/generate-workout-success.json';
import invalid from '../../data/mock-api/generate-workout-invalid-input.json';
import noMatch from '../../data/mock-api/generate-workout-no-matching-plan.json';
import history from '../../data/mock-api/workout-history-success.json';
import empty from '../../data/mock-api/workout-history-empty.json';
import save from '../../data/mock-api/save-session-success.json';
import saveFailure from '../../data/mock-api/save-session-failure.json';
import preferences from '../../data/mock-api/preferences-success.json';
import update from '../../data/mock-api/preferences-update-success.json';
import network from '../../data/mock-api/network-error.json';
import timeout from '../../data/mock-api/timeout.json';
import server from '../../data/mock-api/server-error.json';
export const fixtures = {
  'generate-workout-success.json': generate,
  'generate-workout-invalid-input.json': invalid,
  'generate-workout-no-matching-plan.json': noMatch,
  'workout-history-success.json': history,
  'workout-history-empty.json': empty,
  'save-session-success.json': save,
  'save-session-failure.json': saveFailure,
  'preferences-success.json': preferences,
  'preferences-update-success.json': update,
  'network-error.json': network,
  'timeout.json': timeout,
  'server-error.json': server,
};
export type FixtureName = keyof typeof fixtures;
export interface FixtureRepository {
  load(name: FixtureName): unknown;
}
export const localFixtures: FixtureRepository = { load: (name) => JSON.parse(JSON.stringify(fixtures[name])) };
