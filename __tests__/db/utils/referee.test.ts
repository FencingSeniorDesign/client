import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import {
    dbCreateReferee,
    dbGetRefereeByDeviceId,
    dbAddRefereeToEvent,
    dbGetRefereesForEvent,
    dbListReferees,
    dbDeleteReferee,
} from '../../../src/db/utils/referee';

jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        insert: jest.fn(),
        select: jest.fn(),
        delete: jest.fn(),
    },
}));

describe('Referee DB Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('dbCreateReferee', () => {
        it('creates a new referee and returns new id', async () => {
            const mockReturning = jest.fn().mockResolvedValue([{ id: 101 }]);
            const mockValues = jest.fn(() => ({ returning: mockReturning }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            const newId = await dbCreateReferee({
                fname: 'Alice',
                lname: 'Smith',
                device_id: 'deviceA',
            });

            expect(newId).toBe(101);
            expect(db.insert).toHaveBeenCalledWith(schema.referees);
            expect(mockValues).toHaveBeenCalledWith({
                fname: 'Alice',
                lname: 'Smith',
                nickname: undefined,
                device_id: 'deviceA',
            });
            expect(mockReturning).toHaveBeenCalledWith({ id: schema.referees.id });
        });

        it('throws an error when new referee id is not returned', async () => {
            const mockReturning = jest.fn().mockResolvedValue([]);
            const mockValues = jest.fn(() => ({ returning: mockReturning }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            await expect(
                dbCreateReferee({
                    fname: 'Bob',
                    lname: 'Jones',
                    device_id: 'deviceB',
                })
            ).rejects.toThrow('Failed to get new referee ID');
        });
    });

    describe('dbGetRefereeByDeviceId', () => {
        it('returns a referee if found', async () => {
            const fakeReferee = { id: 1, fname: 'Test', lname: 'Ref' };
            const mockLimit = jest.fn().mockResolvedValue([fakeReferee]);
            const mockWhere = jest.fn(() => ({ limit: mockLimit }));
            const mockFrom = jest.fn(() => ({ where: mockWhere }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const referee = await dbGetRefereeByDeviceId('device1');
            expect(referee).toEqual(fakeReferee);
        });

        it('returns null if no referee is found', async () => {
            const mockLimit = jest.fn().mockResolvedValue([]);
            const mockWhere = jest.fn(() => ({ limit: mockLimit }));
            const mockFrom = jest.fn(() => ({ where: mockWhere }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const referee = await dbGetRefereeByDeviceId('nonexistent');
            expect(referee).toBeNull();
        });
    });

    describe('dbAddRefereeToEvent', () => {
        it('successfully adds a referee to an event', async () => {
            // Provide a chainable onConflictDoNothing that returns a resolved promise.
            const mockOnConflictDoNothing = jest.fn().mockResolvedValue(undefined);
            const mockValues = jest.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            await expect(dbAddRefereeToEvent(1, 10)).resolves.toBeUndefined();
            expect(db.insert).toHaveBeenCalledWith(schema.refereeEvents);
            expect(mockValues).toHaveBeenCalledWith({
                refereeid: 1,
                eventid: 10,
            });
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });
    });

    describe('dbGetRefereesForEvent', () => {
        it('returns referees for an event', async () => {
            // simulate joined result with referee data under key 'referees'
            const fakeJoinedResult = [{ referees: { id: 1, fname: 'Alice', lname: 'Smith' } }];
            const mockWhere = jest.fn().mockResolvedValue(fakeJoinedResult);
            const mockInnerJoin = jest.fn(() => ({ where: mockWhere }));
            const mockFrom = jest.fn(() => ({ innerJoin: mockInnerJoin }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const result = await dbGetRefereesForEvent(10);
            expect(result).toEqual([{ id: 1, fname: 'Alice', lname: 'Smith' }]);
        });

        it('returns empty array if error occurs', async () => {
            (db.select as jest.Mock).mockImplementation(() => {
                throw new Error('Failure');
            });
            const result = await dbGetRefereesForEvent(10);
            expect(result).toEqual([]);
        });
    });

    describe('dbListReferees', () => {
        it('returns a list of referees', async () => {
            const fakeReferees = [{ id: 1 }, { id: 2 }];
            const mockFrom = jest.fn().mockResolvedValue(fakeReferees);
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const result = await dbListReferees();
            expect(result).toEqual(fakeReferees);
        });

        it('returns empty array if error occurs', async () => {
            (db.select as jest.Mock).mockImplementation(() => {
                throw new Error('Failure');
            });
            const result = await dbListReferees();
            expect(result).toEqual([]);
        });
    });

    describe('dbDeleteReferee', () => {
        it('successfully deletes a referee', async () => {
            // Each call to delete returns an object with a chainable where method.
            const mockWhere = jest.fn().mockResolvedValue(undefined);
            const mockDelete = jest.fn(() => ({ where: mockWhere }));
            (db.delete as jest.Mock).mockImplementation(mockDelete);

            await expect(dbDeleteReferee(1)).resolves.toBeUndefined();
            expect(db.delete).toHaveBeenCalledTimes(2);
            expect(db.delete).toHaveBeenCalledWith(schema.refereeEvents);
            expect(db.delete).toHaveBeenCalledWith(schema.referees);
        });

        it('throws error if delete fails', async () => {
            (db.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Delete failed');
            });
            await expect(dbDeleteReferee(1)).rejects.toThrow('Delete failed');
        });
    });
});

console.log('We recommend installing an extension to run jest tests.');
