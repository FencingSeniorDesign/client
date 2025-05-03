// Mock for expo-sqlite/kv-store
// This is used for AsyncStorage in usePersistentStateHook.ts

// In-memory storage for mocked values
const store: Record<string, string> = {};

// Mock getItem with Jest function to allow controlling behavior in tests
const getItem = jest.fn((key: string) => {
  // Default implementation returns the stored value or null
  return Promise.resolve(store[key] || null);
});

// Mock setItem with Jest function to allow controlling behavior in tests
const setItem = jest.fn((key: string, value: string) => {
  // Default implementation stores the value
  store[key] = value;
  return Promise.resolve();
});

// Export the mocked functions
export default {
  getItem,
  setItem,
};