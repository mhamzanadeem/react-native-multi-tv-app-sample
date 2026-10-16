import { AsyncStorage } from '@amazon-devices/react-native-kepler';
import type { KeyValueStorage } from './storageTypes';
const storage: KeyValueStorage = {
  persistent: true,
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
export default storage;
