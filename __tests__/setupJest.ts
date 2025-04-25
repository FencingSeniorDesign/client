jest.mock('expo-sqlite', () => ({
    openDatabaseSync: jest.fn(() => ({
      // whatever minimal interface Drizzle needs; often just transaction()/exec()
      transaction: () => ({ executeSql: () => {} }),
    })),
  }));