export interface KeyValueStorage {
  readonly persistent: boolean;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    persistent: false,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}
