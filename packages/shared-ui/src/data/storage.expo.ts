import * as FileSystem from 'expo-file-system/legacy';
import type { KeyValueStorage } from './storageTypes';
function uri(key: string): string {
  if (!FileSystem.documentDirectory || !/^[a-z0-9-]+$/.test(key))
    throw new Error('Local document storage is unavailable.');
  return `${FileSystem.documentDirectory}${key}.json`;
}
const storage: KeyValueStorage = {
  persistent: true,
  getItem: async (key) => {
    const file = uri(key);
    return (await FileSystem.getInfoAsync(file)).exists ? FileSystem.readAsStringAsync(file) : null;
  },
  setItem: async (key, value) => {
    await FileSystem.writeAsStringAsync(uri(key), value);
  },
};
export default storage;
