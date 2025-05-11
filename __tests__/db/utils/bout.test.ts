// __tests__/db/utils/bout.test.ts
import { db } from '../../../src/db/DrizzleClient';
import { dbUpdateBoutScore } from '../../../src/db/utils/bout';
import * as schema from '../../../src/db/schema';

// Mock the dependencies
jest.mock('../../../src/db/DrizzleClient', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis()
  },
}));

describe('Bout Utils', () => {
  // Mock console methods
  const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
  };

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console methods after all tests
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('dbUpdateBoutScore', () => {
    it('updates a bout score successfully', async () => {
      // Setup
      const mockWhere = jest.fn().mockResolvedValue({});
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
      db.update = mockUpdate;

      // Execute
      await dbUpdateBoutScore(42, 10, 5);

      // Verify
      expect(mockUpdate).toHaveBeenCalledWith(schema.fencerBouts);
      expect(mockSet).toHaveBeenCalledWith({ score: 5 });
      expect(mockWhere).toHaveBeenCalled();
    });

    it('throws error if database update fails', async () => {
      // Setup
      const dbError = new Error('Database error');
      const mockWhere = jest.fn().mockRejectedValue(dbError);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
      db.update = mockUpdate;

      // Execute & Verify
      await expect(dbUpdateBoutScore(42, 10, 5)).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error updating bout score:', dbError);
    });
  });
});