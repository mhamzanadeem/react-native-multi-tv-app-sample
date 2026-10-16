const FileSystem = require('expo-file-system/legacy');
const nativeStorage = require('../../../packages/shared-ui/src/data/storage.expo').default;
const webStorage = require('../../../packages/shared-ui/src/data/storage.ts').default;
const { createRepositories } = require('../../../packages/shared-ui/src/data/workoutRepositories');
const { DEFAULT_CONFIG } = require('../../../packages/shared-ui/src/domain/workoutConfig');
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  documentDirectory: 'file:///documents/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
});
it('uses app document files for native persistence and handles missing files', async () => {
  FileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false });
  expect(await nativeStorage.getItem('formfit-preferences-v1')).toBeNull();
  FileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true });
  FileSystem.readAsStringAsync.mockResolvedValueOnce('saved-json');
  expect(await nativeStorage.getItem('formfit-history-v1')).toBe('saved-json');
  await nativeStorage.setItem('formfit-history-v1', 'new-json');
  expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file:///documents/formfit-history-v1.json', 'new-json');
  await expect(nativeStorage.setItem('../outside', 'bad')).rejects.toThrow('unavailable');
  expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
});
it('uses a visible in-memory fallback when native file writes fail', async () => {
  FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
  FileSystem.writeAsStringAsync.mockRejectedValue(new Error('Disk unavailable'));
  const warn = jest.fn();
  const repo = createRepositories(nativeStorage, warn);
  await repo.preferences.save({ ...DEFAULT_CONFIG, durationMinutes: 30 });
  expect(repo.isPersistent()).toBe(false);
  expect((await repo.preferences.get()).durationMinutes).toBe(30);
  expect(warn).toHaveBeenCalledTimes(1);
});
it('catches a blocked browser localStorage getter without crashing module import', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(global, 'window');
  const fakeWindow = {};
  Object.defineProperty(fakeWindow, 'localStorage', {
    get() {
      throw new Error('Storage denied');
    },
  });
  Object.defineProperty(global, 'window', { value: fakeWindow, configurable: true });
  try {
    const warn = jest.fn();
    const repo = createRepositories(webStorage, warn);
    expect(await repo.preferences.get()).toEqual(DEFAULT_CONFIG);
    await repo.preferences.save({ ...DEFAULT_CONFIG, durationMinutes: 20 });
    expect((await repo.preferences.get()).durationMinutes).toBe(20);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    if (descriptor) Object.defineProperty(global, 'window', descriptor);
    else delete global.window;
  }
});
