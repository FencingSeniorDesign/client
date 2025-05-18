// __tests__/db/utils/fencer.test.ts
import { db } from '../../../src/db/DrizzleClient';
import {
    dbCreateFencerByName,
    dbSearchFencers,
    dbGetFencersInEventById,
    dbAddFencerToEventById,
    dbDeleteFencerFromEventById,
} from '../../../src/db/utils/fencer';
import * as schema from '../../../src/db/schema';
import * as clubUtils from '../../../src/db/utils/club';

// Mock the dependencies
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
    },
}));

jest.mock('../../../src/db/utils/club', () => ({
    dbSearchClubs: jest.fn(),
    dbCreateClub: jest.fn(),
}));

describe('Fencer Utils', () => {
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

    describe('dbCreateFencerByName', () => {
        it('creates a fencer with valid data', async () => {
            // Setup
            const mockFencer = {
                fname: 'John',
                lname: 'Smith',
                erating: 'A',
                eyear: 2020,
            };
            (db.insert(schema.fencers).values().returning as jest.Mock).mockResolvedValue([{ id: 42 }]);

            // Execute
            await dbCreateFencerByName(mockFencer);

            // Verify
            expect(db.insert).toHaveBeenCalledWith(schema.fencers);
            expect(db.insert().values).toHaveBeenCalledWith({
                fname: 'John',
                lname: 'Smith',
                club: null,
                clubid: null,
                erating: 'A',
                eyear: 2020,
                frating: 'U',
                fyear: 0,
                srating: 'U',
                syear: 0,
            });
            expect(mockFencer.id).toBe(42);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('created with id 42'),
                expect.any(String)
            );
        });

        it('links fencer to existing club if club name matches', async () => {
            // Setup
            const mockFencer = {
                fname: 'Jane',
                lname: 'Doe',
                club: 'Test Fencing Club',
            };
            const existingClub = { id: 5, name: 'Test Fencing Club', abbreviation: 'TFC' };
            (clubUtils.dbSearchClubs as jest.Mock).mockResolvedValue([existingClub]);
            (db.insert(schema.fencers).values().returning as jest.Mock).mockResolvedValue([{ id: 43 }]);

            // Execute
            await dbCreateFencerByName(mockFencer);

            // Verify
            expect(clubUtils.dbSearchClubs).toHaveBeenCalledWith('Test Fencing Club');
            expect(clubUtils.dbCreateClub).not.toHaveBeenCalled();
            expect(mockFencer.clubid).toBe(5);
            expect(db.insert().values).toHaveBeenCalledWith(
                expect.objectContaining({
                    clubid: 5,
                })
            );
        });

        it('creates a new club if club name does not match existing clubs', async () => {
            // Setup
            const mockFencer = {
                fname: 'Alex',
                lname: 'Johnson',
                club: 'New Fencing Club',
            };
            (clubUtils.dbSearchClubs as jest.Mock).mockResolvedValue([]);
            (clubUtils.dbCreateClub as jest.Mock).mockResolvedValue(6);
            (db.insert(schema.fencers).values().returning as jest.Mock).mockResolvedValue([{ id: 44 }]);

            // Execute
            await dbCreateFencerByName(mockFencer);

            // Verify
            expect(clubUtils.dbSearchClubs).toHaveBeenCalledWith('New Fencing Club');
            expect(clubUtils.dbCreateClub).toHaveBeenCalledWith({ name: 'New Fencing Club' });
            expect(mockFencer.clubid).toBe(6);
            expect(db.insert().values).toHaveBeenCalledWith(
                expect.objectContaining({
                    clubid: 6,
                })
            );
        });

        it('updates the fencer ID from database result', async () => {
            // This test simplifies to just check that fencer ID is updated
            const mockFencer = {
                fname: 'Mike',
                lname: 'Taylor',
            };

            // Mock returning an ID from the database
            (db.insert(schema.fencers).values().returning as jest.Mock).mockResolvedValue([{ id: 45 }]);

            // Execute
            await dbCreateFencerByName(mockFencer);

            // Verify ID is set from the database result
            expect(mockFencer.id).toBe(45);
        });

        it('creates fencer with event param but no insert when insertOnCreate is false', async () => {
            // Setup for this test - we'll create a custom mock of dbAddFencerToEventById
            const originalImport = require('../../../src/db/utils/fencer');
            const originalAddFencerToEvent = originalImport.dbAddFencerToEventById;

            // Create a spy to check if dbAddFencerToEventById gets called
            const addFencerSpy = jest.fn();
            originalImport.dbAddFencerToEventById = addFencerSpy;

            const mockFencer = {
                fname: 'Mike',
                lname: 'Taylor',
            };
            const mockEvent = {
                id: 10,
                weapon: 'Foil',
                gender: 'Mixed',
                age: 'Senior',
            };

            // Mock fencer insert
            (db.insert(schema.fencers).values().returning as jest.Mock).mockResolvedValue([{ id: 46 }]);

            // Execute - with insertOnCreate = false (default)
            await dbCreateFencerByName(mockFencer, mockEvent);

            // Verify fencer ID is set
            expect(mockFencer.id).toBe(46);
            // Verify dbAddFencerToEventById was not called
            expect(addFencerSpy).not.toHaveBeenCalled();

            // Restore the original function
            originalImport.dbAddFencerToEventById = originalAddFencerToEvent;
        });

        it('handles database errors gracefully', async () => {
            // Setup
            const mockFencer = {
                fname: 'Error',
                lname: 'Test',
            };
            const dbError = new Error('Database error');
            (db.insert(schema.fencers).values().returning as jest.Mock).mockRejectedValue(dbError);

            // Execute
            await dbCreateFencerByName(mockFencer);

            // Verify
            expect(consoleSpy.error).toHaveBeenCalledWith('Error creating fencer:', dbError);
            expect(mockFencer.id).toBeUndefined();
        });
    });

    describe('dbSearchFencers', () => {
        it('returns matching fencers for valid search query', async () => {
            // Setup
            const mockFencers = [
                { id: 1, fname: 'John', lname: 'Smith' },
                { id: 2, fname: 'Jane', lname: 'Johnson' },
            ];

            // Set up more specific mocks
            const mockWhere = jest.fn().mockResolvedValue(mockFencers);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbSearchFencers('John');

            // Verify
            expect(result).toEqual(mockFencers);
            expect(mockSelect).toHaveBeenCalled();
            expect(mockFrom).toHaveBeenCalledWith(schema.fencers);
            expect(consoleSpy.log).toHaveBeenCalledWith('Search returned 2 results');
        });

        it('returns empty array when no matches are found', async () => {
            // Setup
            const mockWhere = jest.fn().mockResolvedValue([]);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbSearchFencers('NonExistent');

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.log).toHaveBeenCalledWith('Search returned 0 results');
        });

        it('handles database errors by returning empty array', async () => {
            // Setup
            const dbError = new Error('Search error');

            const mockWhere = jest.fn().mockRejectedValue(dbError);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbSearchFencers('Test');

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.error).toHaveBeenCalledWith('Error searching fencers:', dbError);
        });
    });

    describe('dbGetFencersInEventById', () => {
        it('returns fencers in an event', async () => {
            // Setup
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };
            const mockFencers = [
                { id: 1, fname: 'John', lname: 'Smith' },
                { id: 2, fname: 'Jane', lname: 'Johnson' },
            ];

            // Set up more specific mocks
            const mockWhere = jest.fn().mockResolvedValue(mockFencers);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockInnerJoin = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockFrom = jest.fn().mockReturnValue({ innerJoin: mockInnerJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbGetFencersInEventById(mockEvent);

            // Verify
            expect(result).toEqual(mockFencers);
            expect(mockSelect).toHaveBeenCalled();
            expect(mockFrom).toHaveBeenCalledWith(schema.fencers);
            expect(consoleSpy.log).toHaveBeenCalledWith('Fencers associated with Event ID [10]: 2');
        });

        it('returns empty array when no fencers are in the event', async () => {
            // Setup
            const mockEvent = { id: 11, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };

            // Set up more specific mocks
            const mockWhere = jest.fn().mockResolvedValue([]);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockInnerJoin = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockFrom = jest.fn().mockReturnValue({ innerJoin: mockInnerJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbGetFencersInEventById(mockEvent);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.log).toHaveBeenCalledWith('Fencers associated with Event ID [11]: 0');
        });

        it('handles database errors by returning empty array', async () => {
            // Setup
            const mockEvent = { id: 12, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };
            const dbError = new Error('Database error');

            // Set up more specific mocks
            const mockWhere = jest.fn().mockRejectedValue(dbError);
            const mockLeftJoin = jest.fn().mockReturnValue({ where: mockWhere });
            const mockInnerJoin = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin });
            const mockFrom = jest.fn().mockReturnValue({ innerJoin: mockInnerJoin });
            const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

            // Override the db.select mock for this test
            db.select = mockSelect;

            // Execute
            const result = await dbGetFencersInEventById(mockEvent);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.error).toHaveBeenCalledWith('Error getting fencers in event:', dbError);
        });
    });

    describe('dbAddFencerToEventById', () => {
        it('adds a fencer to an event successfully', async () => {
            // Setup
            const mockFencer = { id: 42, fname: 'John', lname: 'Smith' };
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };

            // Simplified mock approach
            const mockOnConflictDoNothing = jest.fn().mockResolvedValue({});
            const mockValues = jest.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
            const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
            db.insert = mockInsert;

            // Execute
            await dbAddFencerToEventById(mockFencer, mockEvent);

            // Verify
            expect(mockInsert).toHaveBeenCalledWith(schema.fencerEvents);
            expect(mockValues).toHaveBeenCalledWith({
                fencerid: 42,
                eventid: 10,
            });
            expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('added to "Mixed Senior Foil"'));
        });

        it('throws error if fencer ID is missing', async () => {
            // Setup
            const mockFencer = { fname: 'John', lname: 'Smith' } as any;
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };

            // Simplified mock approach
            db.insert = jest.fn(); // Should never be called

            // Execute & verify
            await dbAddFencerToEventById(mockFencer, mockEvent);

            // The insert should never be called
            expect(db.insert).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Error adding fencer undefined to event 10'),
                expect.any(Error)
            );
        });

        it('handles database errors gracefully', async () => {
            // Setup
            const mockFencer = { id: 42, fname: 'John', lname: 'Smith' };
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };
            const dbError = new Error('Database error');

            // Mock with error
            const mockOnConflictDoNothing = jest.fn().mockRejectedValue(dbError);
            const mockValues = jest.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
            const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
            db.insert = mockInsert;

            // Execute
            await dbAddFencerToEventById(mockFencer, mockEvent);

            // Verify
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Error adding fencer 42 to event 10'),
                dbError
            );
        });
    });

    describe('dbDeleteFencerFromEventById', () => {
        it('deletes a fencer from an event successfully', async () => {
            // Setup
            const mockFencer = { id: 42, fname: 'John', lname: 'Smith' };
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };

            // Simplified mock approach
            const mockWhere = jest.fn().mockResolvedValue({});
            const mockDelete = jest.fn().mockReturnValue({ where: mockWhere });
            db.delete = mockDelete;

            // Execute
            await dbDeleteFencerFromEventById(mockFencer, mockEvent);

            // Verify
            expect(mockDelete).toHaveBeenCalledWith(schema.fencerEvents);
            expect(mockWhere).toHaveBeenCalled();
        });

        it('throws error if fencer ID is missing', async () => {
            // Setup
            const mockFencer = { fname: 'John', lname: 'Smith' } as any;
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };

            // Mock delete function that should never be called
            db.delete = jest.fn();

            // Execute & Verify
            await expect(dbDeleteFencerFromEventById(mockFencer, mockEvent)).rejects.toThrow('Fencer ID is required');
            expect(db.delete).not.toHaveBeenCalled();
        });

        it('throws database errors', async () => {
            // Setup
            const mockFencer = { id: 42, fname: 'John', lname: 'Smith' };
            const mockEvent = { id: 10, weapon: 'Foil', gender: 'Mixed', age: 'Senior' };
            const dbError = new Error('Database error');

            // Mock delete function that throws error
            const mockWhere = jest.fn().mockRejectedValue(dbError);
            const mockDelete = jest.fn().mockReturnValue({ where: mockWhere });
            db.delete = mockDelete;

            // Execute & Verify
            await expect(dbDeleteFencerFromEventById(mockFencer, mockEvent)).rejects.toThrow(dbError);
            expect(consoleSpy.error).toHaveBeenCalledWith('Error deleting fencer from event:', dbError);
        });
    });
});
