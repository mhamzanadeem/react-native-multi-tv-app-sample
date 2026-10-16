import type { KeyValueStorage } from './storageTypes';
function browserStorage(): Storage {
  if (typeof window === 'undefined') throw new Error('Browser storage is unavailable.');
  return window.localStorage;
}
const storage: KeyValueStorage = {
  persistent: true,
  getItem: async (key) => browserStorage().getItem(key),
  setItem: async (key, value) => browserStorage().setItem(key, value),
};
export default storage;
