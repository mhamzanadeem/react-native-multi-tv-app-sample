import { AwsWorkoutBackend, type HttpTransport } from './AwsWorkoutBackend';
import { MockWorkoutBackend } from './MockWorkoutBackend';
import { validateBackendConfig, type BackendConfig } from './config';
import type { WorkoutBackend } from './contracts';
export function createBackend(config: BackendConfig, transport?: HttpTransport): WorkoutBackend {
  const valid = validateBackendConfig(config);
  return valid.mode === 'mock' ? new MockWorkoutBackend() : new AwsWorkoutBackend(valid, transport);
}
