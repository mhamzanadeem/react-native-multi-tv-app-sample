import storage from './storage';
import type { KeyValueStorage } from './storageTypes';

export const INSTALLATION_KEY = 'formfit-guest-installation-v1';
export const isInstallationId = (id: unknown): id is string => typeof id === 'string' && /^tv-[a-f0-9]{32}$/.test(id);

function newId(): string {
  // This is a grouping identifier, not an authentication token or hardware ID.
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `tv-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function createInstallationStore(target: KeyValueStorage, generate = newId) {
  let pending: Promise<string> | null = null;
  return () => {
    if (pending) return pending;
    pending = (async () => {
      if (!target.persistent) throw new Error('Persistent storage is required for your guest TV identity.');
      const existing = await target.getItem(INSTALLATION_KEY);
      if (existing !== null) {
        if (!isInstallationId(existing))
          throw new Error('Stored TV ID is unreadable. Existing workouts were not reset.');
        return existing;
      }
      const id = generate();
      if (!isInstallationId(id)) throw new Error('Could not create a valid TV installation ID.');
      await target.setItem(INSTALLATION_KEY, id);
      if ((await target.getItem(INSTALLATION_KEY)) !== id)
        throw new Error('Could not persist your TV installation ID.');
      return id;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}
export const getInstallationId = createInstallationStore(storage);
