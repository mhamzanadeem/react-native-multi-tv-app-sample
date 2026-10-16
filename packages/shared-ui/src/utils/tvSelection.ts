import { Platform } from 'react-native';
export function usesRemoteSelectionOnly(): boolean {
  return Platform.isTV;
}
