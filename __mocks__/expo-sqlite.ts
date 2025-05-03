// Mock for expo-sqlite
const mockDB = {
  transaction: jest.fn(callback => {
    const mockTx = {
      executeSql: jest.fn((query, params, success) => {
        if (success) {
          success(mockTx, { rows: { length: 0, _array: [] }, insertId: 1, rowsAffected: 1 });
        }
        return true;
      })
    };
    callback(mockTx);
    return Promise.resolve();
  }),
  closeAsync: jest.fn().mockResolvedValue(true),
  execAsync: jest.fn().mockResolvedValue({ rows: [] }),
  getValidTableNamesAsync: jest.fn().mockResolvedValue([]),
  // Mock the run method used in DrizzleClient.ts
  run: jest.fn().mockResolvedValue({ rowsAffected: 1 })
};

export function openDatabaseSync() {
  return mockDB;
}

export function openDatabase() {
  return mockDB;
}

export default {
  openDatabase,
  openDatabaseSync
};