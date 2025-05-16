import {
    dbCreateOfficial,
    dbGetOfficialByDeviceId,
    dbAddOfficialToEvent,
    dbGetOfficialsForEvent,
    dbListOfficials,
    dbDeleteOfficial,
} from '../../../src/db/utils/official';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        insert: jest.fn(),
        select: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../../../src/db/schema', () => ({
    officials: { id: 'id', tableName: 'officials' },
    officialEvents: { officialid: 'officialid', eventid: 'eventid' },
}));

describe('Official DB Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('dbCreateOfficial', () => {
        it('creates an official and returns new ID', async () => {
            const mockResult = [{ id: 42 }];
            const mockReturning = jest.fn().mockResolvedValue(mockResult);
            const mockValues = jest.fn(() => ({ returning: mockReturning }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            const newId = await dbCreateOfficial({
                fname: 'John',
                lname: 'Doe',
                nickname: 'JD',
                device_id: 'device123',
            });

            expect(newId).toBe(42);
            expect(db.insert).toHaveBeenCalledWith(schema.officials);
            expect(mockValues).toHaveBeenCalledWith({
                fname: 'John',
                lname: 'Doe',
                nickname: 'JD',
                device_id: 'device123',
            });
            expect(mockReturning).toHaveBeenCalledWith({ id: schema.officials.id });
        });

        it('throws error when new official ID is not returned', async () => {
            const mockResult: any[] = [];
            const mockReturning = jest.fn().mockResolvedValue(mockResult);
            const mockValues = jest.fn(() => ({ returning: mockReturning }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            await expect(
                dbCreateOfficial({
                    fname: 'Jane',
                    lname: 'Doe',
                    device_id: 'device456',
                })
            ).rejects.toThrow('Failed to get new official ID');
        });
    });

    describe('dbGetOfficialByDeviceId', () => {
        it('returns an official if found', async () => {
            const fakeOfficial = { id: 1, fname: 'John', lname: 'Doe' };
            const mockLimit = jest.fn().mockResolvedValue([fakeOfficial]);
            const mockWhere = jest.fn(() => ({ limit: mockLimit }));
            const mockFrom = jest.fn(() => ({ where: mockWhere }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const officialFound = await dbGetOfficialByDeviceId('device123');
            expect(officialFound).toEqual(fakeOfficial);
            expect(db.select).toHaveBeenCalled();
        });

        it('returns null if no official is found', async () => {
            const mockLimit = jest.fn().mockResolvedValue([]);
            const mockWhere = jest.fn(() => ({ limit: mockLimit }));
            const mockFrom = jest.fn(() => ({ where: mockWhere }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const officialFound = await dbGetOfficialByDeviceId('invalid-device');
            expect(officialFound).toBeNull();
        });
    });

    describe('dbAddOfficialToEvent', () => {
        it('adds an official to an event without error', async () => {
            const mockOnConflictDoNothing = jest.fn().mockResolvedValue(undefined);
            const mockValues = jest.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            await expect(dbAddOfficialToEvent(1, 100)).resolves.toBeUndefined();
            expect(db.insert).toHaveBeenCalledWith(schema.officialEvents);
            expect(mockValues).toHaveBeenCalledWith({ officialid: 1, eventid: 100 });
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });

        it('throws error if insertion fails', async () => {
            const errorMessage = 'Insert failed';
            const mockOnConflictDoNothing = jest.fn().mockRejectedValue(new Error(errorMessage));
            const mockValues = jest.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
            const mockInsert = jest.fn(() => ({ values: mockValues }));
            (db.insert as jest.Mock).mockImplementation(mockInsert);

            await expect(dbAddOfficialToEvent(1, 101)).rejects.toThrow(errorMessage);
        });
    });

    describe('dbGetOfficialsForEvent', () => {
        it('returns list of officials for an event', async () => {
            const fakeJoinedResult = [
                { officials: { id: 1, fname: 'John', lname: 'Doe' } },
                { officials: { id: 2, fname: 'Jane', lname: 'Smith' } },
            ];
            const mockWhere = jest.fn().mockResolvedValue(fakeJoinedResult);
            const mockInnerJoin = jest.fn(() => ({ where: mockWhere }));
            const mockFrom = jest.fn(() => ({ innerJoin: mockInnerJoin }));
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const officials = await dbGetOfficialsForEvent(100);
            expect(officials).toEqual([
                { id: 1, fname: 'John', lname: 'Doe' },
                { id: 2, fname: 'Jane', lname: 'Smith' },
            ]);
        });

        it('returns empty array when an error occurs', async () => {
            (db.select as jest.Mock).mockReturnValue({
                from: () => ({
                    innerJoin: () => ({
                        where: () => Promise.reject(new Error('Query error')),
                    }),
                }),
            });
            const officials = await dbGetOfficialsForEvent(200);
            expect(officials).toEqual([]);
        });
    });

    describe('dbListOfficials', () => {
        it('returns a list of officials', async () => {
            const fakeOfficials = [
                { id: 1, fname: 'John', lname: 'Doe' },
                { id: 2, fname: 'Jane', lname: 'Smith' },
            ];
            const mockFrom = jest.fn().mockResolvedValue(fakeOfficials);
            (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

            const officials = await dbListOfficials();
            expect(officials).toEqual(fakeOfficials);
            expect(db.select).toHaveBeenCalled();
        });

        it('returns empty array when an error occurs', async () => {
            (db.select as jest.Mock).mockReturnValue({
                from: () => Promise.reject(new Error('Select error')),
            });
            const officials = await dbListOfficials();
            expect(officials).toEqual([]);
        });
    });

    describe('dbDeleteOfficial', () => {
        it('deletes an official and its event associations', async () => {
            const mockDeleteOfficialEventsWhere = jest.fn().mockResolvedValue(undefined);
            const mockDeleteOfficialsWhere = jest.fn().mockResolvedValue(undefined);
            const mockDeleteForOfficialEvents = jest.fn(() => ({ where: mockDeleteOfficialEventsWhere }));
            const mockDeleteForOfficials = jest.fn(() => ({ where: mockDeleteOfficialsWhere }));

            (db.delete as jest.Mock)
                .mockImplementationOnce(mockDeleteForOfficialEvents)
                .mockImplementationOnce(mockDeleteForOfficials);

            await expect(dbDeleteOfficial(99)).resolves.toBeUndefined();

            expect(db.delete).toHaveBeenCalledWith(schema.officialEvents);
            expect(db.delete).toHaveBeenCalledWith(schema.officials);
            expect(mockDeleteOfficialEventsWhere).toHaveBeenCalledWith(eq(schema.officialEvents.officialid, 99));
            expect(mockDeleteOfficialsWhere).toHaveBeenCalledWith(eq(schema.officials.id, 99));
        });

        it('throws error if deletion fails', async () => {
            const errorMessage = 'Deletion error';
            (db.delete as jest.Mock).mockImplementation(() => ({
                where: () => Promise.reject(new Error(errorMessage)),
            }));

            await expect(dbDeleteOfficial(100)).rejects.toThrow(errorMessage);
        });
    });
});

console.log('We recommend installing an extension to run jest tests.');
