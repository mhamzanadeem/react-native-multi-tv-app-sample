import { failure, routes, type Operation, type ApiResult, type WorkoutBackend } from './contracts';
import { correlation, validRequest, validResponse } from './validation';
import { validateBackendConfig, type BackendConfig } from './config';
export type HttpTransport = typeof fetch;
export class AwsWorkoutBackend implements WorkoutBackend {
  readonly mode = 'aws' as const;
  private config: BackendConfig;
  constructor(
    config: BackendConfig,
    private transport: HttpTransport = (...args) => fetch(...args),
  ) {
    this.config = validateBackendConfig({ ...config, mode: 'aws' });
  }
  async request<K extends Operation>(operation: K, input: unknown): Promise<ApiResult<K>> {
    const requestId = correlation(input);
    if (!validRequest(operation, input))
      return failure(
        'aws',
        requestId,
        'INVALID_REQUEST',
        'Request failed local validation; no HTTP request was sent.',
        400,
      );
    const route = routes[operation];
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<ApiResult<K>>((resolve) => {
      timer = setTimeout(() => {
        resolve(failure('aws', requestId, 'TIMEOUT', 'Backend request timed out. No mock fallback was used.', null));
        controller?.abort();
      }, this.config.timeoutMs);
    });
    const request = async (): Promise<ApiResult<K>> => {
      try {
        const response = await this.transport(`${this.config.baseUrl}${route.path}`, {
          method: route.method,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Request-Id': requestId },
          ...(route.method === 'GET' ? {} : { body: JSON.stringify(input) }),
          ...(controller ? { signal: controller.signal } : {}),
          redirect: 'error',
        });
        let body: unknown;
        try {
          const text = await response.text();
          if (text.length > 1000000) throw new Error();
          body = JSON.parse(text);
        } catch {
          body = null;
        }
        if (response.status >= 200 && response.status < 300) {
          if (!validResponse(operation, body, input) || 'error' in body)
            return failure(
              'aws',
              requestId,
              'INVALID_RESPONSE',
              'Backend returned a malformed or incompatible success response.',
              response.status,
            );
          return { mode: 'aws', fixture: null, httpStatus: response.status, body };
        }
        const code =
          response.status === 400
            ? 'INVALID_REQUEST'
            : response.status === 401
              ? 'UNAUTHORIZED'
              : response.status === 403
                ? 'FORBIDDEN'
                : response.status === 404
                  ? 'NOT_FOUND'
                  : response.status === 409
                    ? 'CONFLICT'
                    : response.status === 422
                      ? 'NO_MATCHING_PLAN'
                      : response.status === 429
                        ? 'RATE_LIMITED'
                        : 'SERVER_ERROR';
        // Do not render arbitrary server error bodies, HTML, headers or credentials.
        return failure(
          'aws',
          requestId,
          code,
          `Backend returned HTTP ${response.status}. No mock fallback was used.`,
          response.status,
        );
      } catch {
        return failure(
          'aws',
          requestId,
          'NETWORK_ERROR',
          'Could not reach the backend. No mock fallback was used.',
          null,
        );
      }
    };
    try {
      return await Promise.race([request(), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
