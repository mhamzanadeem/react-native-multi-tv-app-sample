import { createHandler, type DemoStore, type HttpEvent } from './handler';

export function createGuestHandler(
  storeForPartition: (partition: string) => DemoStore,
  newId: () => string,
  now = Date.now,
  region = 'unknown',
) {
  return async (event: HttpEvent) => {
    if (event.rawPath === '/health') {
      const result = await createHandler(storeForPartition('SYSTEM#health'), newId, now, region)(event);
      return { ...result, body: JSON.stringify({ ...JSON.parse(result.body), installationIsolation: 'guest-tv-v1' }) };
    }
    const installationId = Object.entries(event.headers ?? {}).find(
      ([key]) => key.toLowerCase() === 'x-tv-installation-id',
    )?.[1];
    if (!installationId || !/^tv-[a-f0-9]{32}$/.test(installationId)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        body: JSON.stringify({
          requestId: 'invalid-request',
          error: { code: 'INVALID_REQUEST', message: 'A valid X-TV-Installation-Id header is required.' },
        }),
      };
    }
    // Per-request immutable partition: concurrent TVs must never share mutable state.
    const result = await createHandler(storeForPartition(`TV#${installationId}`), newId, now, region)(event);
    return { ...result, body: JSON.stringify({ ...JSON.parse(result.body), installationId }) };
  };
}
