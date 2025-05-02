// Mock for @react-native-async-storage/async-storage
const storage: Record<string, string> = {};

export default {
  getItem: jest.fn((key: string) => {
    return Promise.resolve(storage[key] || null);
  }),
  setItem: jest.fn((key: string, value: string) => {
    storage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete storage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach(key => {
      delete storage[key];
    });
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(storage));
  }),
  multiGet: jest.fn((keys: string[]) => {
    const result = keys.map(key => [key, storage[key] || null]);
    return Promise.resolve(result);
  }),
  multiSet: jest.fn((keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => {
      storage[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(key => {
      delete storage[key];
    });
    return Promise.resolve();
  }),
  flushGetRequests: jest.fn(),
  useAsyncStorage: jest.fn(key => ({
    getItem: jest.fn(() => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn(() => {
      delete storage[key];
      return Promise.resolve();
    }),
  })),
};