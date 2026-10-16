export interface BackendConfig {
  mode: 'mock' | 'aws';
  baseUrl?: string;
  timeoutMs: number;
}
// Public configuration only. Change deliberately and rebuild for a real endpoint demo.
export const backendConfig: BackendConfig = { mode: 'mock', baseUrl: '', timeoutMs: 8000 };
export function validateBackendConfig(config: BackendConfig): BackendConfig {
  if (
    !['mock', 'aws'].includes(config.mode) ||
    !Number.isInteger(config.timeoutMs) ||
    config.timeoutMs < 100 ||
    config.timeoutMs > 30000
  )
    throw new Error('Invalid backend mode or timeout (100–30000 ms).');
  if (config.mode === 'aws') {
    try {
      const url = new URL(config.baseUrl ?? '');
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash)
        throw new Error();
      return { ...config, baseUrl: url.toString().replace(/\/$/, '') };
    } catch {
      throw new Error(
        'AWS mode requires an HTTPS base URL without credentials, query or fragment. No mock fallback is used.',
      );
    }
  }
  return { ...config };
}
