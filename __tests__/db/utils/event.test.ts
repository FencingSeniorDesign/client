// __tests__/db/utils/event.test.ts
import { db } from '../../../src/db/DrizzleClient';
import {
  dbListEvents,
  dbCreateEvent,
  dbDeleteEvent,
  dbGetEventById,
  dbGetEventNameForRound
} from '../../../src/db/utils/event';
import * as schema from '../../../src/db/schema';
import type { Event } from '../../../src/navigation/navigation/types';

// Mock the DrizzleClient and sql
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  sql: jest.fn(),
  count: jest.fn(),
}));

jest.mock('../../../src/db/DrizzleClient', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  },
}));

describe('Event Utils', () => {
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

  describe('dbListEvents', () => {
    it('returns events for a tournament', async () => {
      // Setup
      const mockEvents = [
        { id: 1, weapon: 'Foil', gender: 'Mixed', age: 'Senior', class: 'Open', seeding: 'N/A', tname: 'Test Tournament', startedCount: 0 },
        { id: 2, weapon: 'Epee', gender: 'Mixed', age: 'Senior', class: 'Open', seeding: 'N/A', tname: 'Test Tournament', startedCount: 1 }
      ];
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockResolvedValue(mockEvents);

      // Execute
      const result = await dbListEvents('Test Tournament');

      // Verify
      expect(result).toEqual(mockEvents);
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(schema.events);
      expect(db.where).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      // Setup
      const dbError = new Error('Database error');
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockRejectedValue(dbError);

      // Execute & Verify
      await expect(dbListEvents('Test Tournament')).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error listing events:', dbError);
    });
  });

  describe('dbCreateEvent', () => {
    it('creates an event with valid data', async () => {
      // Setup
      const mockEvent: Event = {
        id: 1,
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior',
        class: 'Open',
        seeding: 'N/A'
      };

      (db.insert as jest.Mock).mockReturnThis();
      (db.values as jest.Mock).mockResolvedValue({ success: true });

      // Execute
      await dbCreateEvent('Test Tournament', mockEvent);

      // Verify
      expect(db.insert).toHaveBeenCalledWith(schema.events);
      expect(db.values).toHaveBeenCalledWith({
        id: 1,
        tname: 'Test Tournament',
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior',
        class: 'Open',
        seeding: 'N/A'
      });
      expect(consoleSpy.log).toHaveBeenCalledWith('Event created successfully.');
    });

    it('sets default values for optional fields', async () => {
      // Setup
      const mockEvent: Event = {
        id: 1,
        weapon: 'Foil',
        gender: 'Mixed',
        // No age, class or seeding provided
      } as Event; // Type casting to make TS happy with missing required fields

      (db.insert as jest.Mock).mockReturnThis();
      (db.values as jest.Mock).mockResolvedValue({ success: true });

      // Execute
      await dbCreateEvent('Test Tournament', mockEvent);

      // Verify
      expect(db.insert).toHaveBeenCalledWith(schema.events);
      expect(db.values).toHaveBeenCalledWith({
        id: 1,
        tname: 'Test Tournament',
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'senior',
        class: 'N/A',
        seeding: 'N/A'
      });
    });

    it('handles database errors', async () => {
      // Setup
      const mockEvent: Event = {
        id: 1,
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior',
        class: 'Open',
        seeding: 'N/A'
      };
      const dbError = new Error('Database error');
      (db.insert as jest.Mock).mockReturnThis();
      (db.values as jest.Mock).mockRejectedValue(dbError);

      // Execute & Verify
      await expect(dbCreateEvent('Test Tournament', mockEvent)).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error creating event:', dbError);
    });
  });

  describe('dbDeleteEvent', () => {
    it('deletes an event by ID', async () => {
      // Setup
      (db.delete as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockResolvedValue({ success: true });

      // Execute
      await dbDeleteEvent(1);

      // Verify
      expect(db.delete).toHaveBeenCalledWith(schema.events);
      expect(db.where).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Event deleted successfully.');
    });

    it('handles database errors', async () => {
      // Setup
      const dbError = new Error('Database error');
      (db.delete as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockRejectedValue(dbError);

      // Execute & Verify
      await expect(dbDeleteEvent(1)).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error deleting event:', dbError);
    });
  });

  describe('dbGetEventById', () => {
    it('returns an event when found by ID', async () => {
      // Setup
      const mockEvent = {
        id: 1,
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior',
        class: 'Open',
        seeding: 'N/A',
        tname: 'Test Tournament'
      };
      const mockResult = [mockEvent];
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      const result = await dbGetEventById(1);

      // Verify
      expect(result).toEqual(mockEvent);
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(schema.events);
      expect(db.where).toHaveBeenCalled();
      expect(db.limit).toHaveBeenCalledWith(1);
    });

    it('throws an error when event is not found', async () => {
      // Setup
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockResolvedValue([]);

      // Execute & Verify
      await expect(dbGetEventById(999)).rejects.toThrow('Event with ID 999 not found');
    });

    it('handles database errors', async () => {
      // Setup
      const dbError = new Error('Database error');
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockRejectedValue(dbError);

      // Execute & Verify
      await expect(dbGetEventById(1)).rejects.toThrow(dbError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching event by ID:', dbError);
    });
  });

  describe('dbGetEventNameForRound', () => {
    it('returns formatted event name when round is found', async () => {
      // Setup
      const mockResult = [{
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior'
      }];
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.innerJoin as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      const result = await dbGetEventNameForRound(1);

      // Verify
      expect(result).toBe('Mixed Senior Foil');
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(schema.events);
      expect(db.innerJoin).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.limit).toHaveBeenCalledWith(1);
    });

    it('returns "Unknown Event" when round is not found', async () => {
      // Setup
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.innerJoin as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockResolvedValue([]);

      // Execute
      const result = await dbGetEventNameForRound(999);

      // Verify
      expect(result).toBe('Unknown Event');
    });

    it('returns "Unknown Event" on database error', async () => {
      // Setup
      const dbError = new Error('Database error');
      (db.select as jest.Mock).mockReturnThis();
      (db.from as jest.Mock).mockReturnThis();
      (db.innerJoin as jest.Mock).mockReturnThis();
      (db.where as jest.Mock).mockReturnThis();
      (db.limit as jest.Mock).mockRejectedValue(dbError);

      // Execute
      const result = await dbGetEventNameForRound(1);

      // Verify
      expect(result).toBe('Unknown Event');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error getting event name:', dbError);
    });
  });
});