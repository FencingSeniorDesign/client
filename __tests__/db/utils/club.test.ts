// __tests__/db/utils/club.test.ts
import { db } from '../../../src/db/DrizzleClient';
import { dbCreateClub, dbSearchClubs, generateClubAbbreviation } from '../../../src/db/utils/club';
import * as schema from '../../../src/db/schema';

// Mock the DrizzleClient
jest.mock('../../../src/db/DrizzleClient', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

describe('Club Utils', () => {
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

  describe('generateClubAbbreviation', () => {
    it('returns empty string for empty input', () => {
      expect(generateClubAbbreviation('')).toBe('');
      expect(generateClubAbbreviation(undefined as unknown as string)).toBe('');
    });

    it('returns first letters of each word for multi-word names', () => {
      expect(generateClubAbbreviation('Fencing Academy')).toBe('FA');
      expect(generateClubAbbreviation('New York Athletic Club')).toBe('NYAC');
      expect(generateClubAbbreviation('Silicon Valley Fencers Club')).toBe('SVFC');
    });

    it('handles single word names', () => {
      expect(generateClubAbbreviation('Salle')).toBe('SA'); // First two letters
      expect(generateClubAbbreviation('A')).toBe('A'); // Single letter (less than 2)
    });

    it('truncates long abbreviations to 5 characters', () => {
      expect(generateClubAbbreviation('Northern California Southern Oregon Fencers Association')).toBe('NCSOF');
    });

    it('handles special characters and whitespace correctly', () => {
      expect(generateClubAbbreviation('St. Paul\'s Fencing')).toBe('SPF');
      expect(generateClubAbbreviation('   Multiple    Spaces   Club  ')).toBe('MSC');
    });
  });

  describe('dbCreateClub', () => {
    it('creates a club with valid data', async () => {
      // Setup
      const mockClub = { name: 'Test Fencing Club', abbreviation: 'TFC' };
      (db.insert(schema.clubs).values().returning as jest.Mock).mockResolvedValue([{ id: 42 }]);

      // Execute
      const result = await dbCreateClub(mockClub);

      // Verify
      expect(result).toBe(42);
      expect(db.insert).toHaveBeenCalledWith(schema.clubs);
      expect(db.insert().values).toHaveBeenCalledWith({
        name: 'Test Fencing Club',
        abbreviation: 'TFC',
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('created with id 42'));
    });

    it('generates abbreviation if not provided', async () => {
      // Setup
      const mockClub = { name: 'Test Fencing Club' };
      (db.insert(schema.clubs).values().returning as jest.Mock).mockResolvedValue([{ id: 43 }]);

      // Execute
      const result = await dbCreateClub(mockClub);

      // Verify
      expect(result).toBe(43);
      expect(db.insert().values).toHaveBeenCalledWith({
        name: 'Test Fencing Club',
        abbreviation: 'TFC', // Auto-generated
      });
    });

    it('handles database errors', async () => {
      // Setup
      const mockClub = { name: 'Test Fencing Club' };
      const dbError = new Error('Database error');
      (db.insert(schema.clubs).values().returning as jest.Mock).mockRejectedValue(dbError);

      // Execute & Verify
      await expect(dbCreateClub(mockClub)).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error creating club:', dbError);
    });

    it('returns -1 if no id is returned from the database', async () => {
      // Setup
      const mockClub = { name: 'Test Fencing Club' };
      (db.insert(schema.clubs).values().returning as jest.Mock).mockResolvedValue([]);

      // Execute
      const result = await dbCreateClub(mockClub);

      // Verify
      expect(result).toBe(-1);
    });
  });

  describe('dbSearchClubs', () => {
    it('returns matching clubs for valid search query', async () => {
      // Setup
      const mockClubs = [
        { id: 1, name: 'New York Athletic Club', abbreviation: 'NYAC' },
        { id: 2, name: 'New York Fencers Club', abbreviation: 'NYFC' },
      ];
      (db.select().from().where as jest.Mock).mockResolvedValue(mockClubs);

      // Execute
      const result = await dbSearchClubs('New York');

      // Verify
      expect(result).toEqual(mockClubs);
      expect(db.select).toHaveBeenCalled();
      expect(db.select().from).toHaveBeenCalledWith(schema.clubs);
      expect(consoleSpy.log).toHaveBeenCalledWith('Search returned 2 clubs');
    });

    it('returns empty array when no matches are found', async () => {
      // Setup
      (db.select().from().where as jest.Mock).mockResolvedValue([]);

      // Execute
      const result = await dbSearchClubs('NonExistent');

      // Verify
      expect(result).toEqual([]);
      expect(consoleSpy.log).toHaveBeenCalledWith('Search returned 0 clubs');
    });

    it('handles database errors by returning empty array', async () => {
      // Setup
      const dbError = new Error('Search error');
      (db.select().from().where as jest.Mock).mockRejectedValue(dbError);

      // Execute
      const result = await dbSearchClubs('Test');

      // Verify
      expect(result).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error searching clubs:', dbError);
    });
  });
});