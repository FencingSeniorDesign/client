import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
    createTeam,
    getTeam,
    updateTeam,
    deleteTeam,
    getTeamsByEvent,
    addTeamMember,
    removeTeamMember,
    getTeamMembers,
    substituteTeamMember,
    validateTeamComposition,
    seedTeamsInPools,
} from '../../../src/db/utils/team';
import { TeamCreate, TeamUpdate, TeamMemberCreate } from '../../../src/db/utils/team';
import { DrizzleClient } from '../../../src/db/DrizzleClient';

// Mock DrizzleClient
jest.mock('../../../src/db/DrizzleClient');

describe('Team Utilities', () => {
    let mockClient: jest.Mocked<DrizzleClient>;

    beforeEach(() => {
        mockClient = new DrizzleClient('test.db') as jest.Mocked<DrizzleClient>;
        jest.clearAllMocks();
    });

    describe('createTeam', () => {
        it('should create a team successfully', async () => {
            const teamData: TeamCreate = {
                name: 'Test Team',
                eventid: 1,
                clubid: 1,
                seed: 1,
            };

            mockClient.insert.mockResolvedValue({ lastInsertRowid: 1 });

            const result = await createTeam(mockClient, teamData);

            expect(result).toBe(1);
            expect(mockClient.insert).toHaveBeenCalledWith('Teams', teamData);
        });
    });

    describe('getTeam', () => {
        it('should get a team by id', async () => {
            const teamId = 1;
            const mockTeam = {
                id: teamId,
                name: 'Test Team',
                eventid: 1,
                clubid: 1,
                seed: 1,
            };

            mockClient.get.mockResolvedValue(mockTeam);

            const result = await getTeam(mockClient, teamId);

            expect(result).toEqual(mockTeam);
            expect(mockClient.get).toHaveBeenCalledWith('SELECT * FROM Teams WHERE id = ?', [teamId]);
        });

        it('should return null if team not found', async () => {
            mockClient.get.mockResolvedValue(null);

            const result = await getTeam(mockClient, 999);

            expect(result).toBeNull();
        });
    });

    describe('updateTeam', () => {
        it('should update a team successfully', async () => {
            const teamId = 1;
            const updateData: TeamUpdate = {
                name: 'Updated Team',
                seed: 2,
            };

            mockClient.run.mockResolvedValue({ changes: 1 });

            const result = await updateTeam(mockClient, teamId, updateData);

            expect(result).toBe(true);
            expect(mockClient.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Teams SET'),
                expect.arrayContaining(['Updated Team', 2, teamId])
            );
        });

        it('should return false if no team was updated', async () => {
            mockClient.run.mockResolvedValue({ changes: 0 });

            const result = await updateTeam(mockClient, 999, { name: 'Test' });

            expect(result).toBe(false);
        });
    });

    describe('deleteTeam', () => {
        it('should delete a team and its members', async () => {
            const teamId = 1;

            mockClient.run.mockResolvedValueOnce({ changes: 2 }); // Delete members
            mockClient.run.mockResolvedValueOnce({ changes: 1 }); // Delete team

            const result = await deleteTeam(mockClient, teamId);

            expect(result).toBe(true);
            expect(mockClient.run).toHaveBeenCalledTimes(2);
            expect(mockClient.run).toHaveBeenNthCalledWith(1, 'DELETE FROM TeamMembers WHERE teamid = ?', [teamId]);
            expect(mockClient.run).toHaveBeenNthCalledWith(2, 'DELETE FROM Teams WHERE id = ?', [teamId]);
        });
    });

    describe('getTeamsByEvent', () => {
        it('should get all teams for an event', async () => {
            const eventId = 1;
            const mockTeams = [
                { id: 1, name: 'Team A', eventid: eventId },
                { id: 2, name: 'Team B', eventid: eventId },
            ];

            mockClient.all.mockResolvedValue(mockTeams);

            const result = await getTeamsByEvent(mockClient, eventId);

            expect(result).toEqual(mockTeams);
            expect(mockClient.all).toHaveBeenCalledWith('SELECT * FROM Teams WHERE eventid = ? ORDER BY seed, name', [
                eventId,
            ]);
        });
    });

    describe('addTeamMember', () => {
        it('should add a team member successfully', async () => {
            const memberData: TeamMemberCreate = {
                teamid: 1,
                fencerid: 1,
                role: 'starter',
                position: 1,
            };

            // Mock existing member check
            mockClient.get.mockResolvedValueOnce(null);
            mockClient.insert.mockResolvedValue({ lastInsertRowid: 1 });

            const result = await addTeamMember(mockClient, memberData);

            expect(result).toBe(1);
            expect(mockClient.insert).toHaveBeenCalledWith('TeamMembers', memberData);
        });

        it('should throw error if fencer already on another team', async () => {
            const memberData: TeamMemberCreate = {
                teamid: 1,
                fencerid: 1,
                role: 'starter',
                position: 1,
            };

            // Mock existing member on different team
            mockClient.get.mockResolvedValueOnce({ id: 1, teamid: 2 });

            await expect(addTeamMember(mockClient, memberData)).rejects.toThrow(
                'Fencer is already on another team in this event'
            );
        });
    });

    describe('removeTeamMember', () => {
        it('should remove a team member successfully', async () => {
            const teamId = 1;
            const fencerId = 1;

            mockClient.run.mockResolvedValue({ changes: 1 });

            const result = await removeTeamMember(mockClient, teamId, fencerId);

            expect(result).toBe(true);
            expect(mockClient.run).toHaveBeenCalledWith('DELETE FROM TeamMembers WHERE teamid = ? AND fencerid = ?', [
                teamId,
                fencerId,
            ]);
        });
    });

    describe('getTeamMembers', () => {
        it('should get all team members with fencer details', async () => {
            const teamId = 1;
            const mockMembers = [
                {
                    id: 1,
                    teamid: teamId,
                    fencerid: 1,
                    role: 'starter',
                    position: 1,
                    fname: 'John',
                    lname: 'Doe',
                },
                {
                    id: 2,
                    teamid: teamId,
                    fencerid: 2,
                    role: 'starter',
                    position: 2,
                    fname: 'Jane',
                    lname: 'Smith',
                },
            ];

            mockClient.all.mockResolvedValue(mockMembers);

            const result = await getTeamMembers(mockClient, teamId);

            expect(result).toEqual(mockMembers);
            expect(mockClient.all).toHaveBeenCalledWith(expect.stringContaining('JOIN Fencers'), [teamId]);
        });
    });

    describe('substituteTeamMember', () => {
        it('should substitute a team member successfully', async () => {
            const teamId = 1;
            const outFencerId = 1;
            const inFencerId = 2;

            // Mock the outgoing member
            mockClient.get.mockResolvedValueOnce({
                id: 1,
                teamid: teamId,
                fencerid: outFencerId,
                role: 'starter',
                position: 1,
            });

            // Mock the substitute check
            mockClient.get.mockResolvedValueOnce({
                id: 2,
                teamid: teamId,
                fencerid: inFencerId,
                role: 'substitute',
            });

            mockClient.run.mockResolvedValue({ changes: 1 });

            await substituteTeamMember(mockClient, teamId, outFencerId, inFencerId);

            expect(mockClient.run).toHaveBeenCalledTimes(2);
        });

        it('should throw error if out fencer not found', async () => {
            mockClient.get.mockResolvedValueOnce(null);

            await expect(substituteTeamMember(mockClient, 1, 999, 2)).rejects.toThrow(
                'Outgoing fencer not found on team'
            );
        });

        it('should throw error if in fencer not a substitute', async () => {
            // Mock outgoing member
            mockClient.get.mockResolvedValueOnce({
                id: 1,
                teamid: 1,
                fencerid: 1,
                role: 'starter',
            });

            // Mock incoming member not on team
            mockClient.get.mockResolvedValueOnce(null);

            await expect(substituteTeamMember(mockClient, 1, 1, 2)).rejects.toThrow(
                'Incoming fencer must be a substitute on the team'
            );
        });
    });

    describe('validateTeamComposition', () => {
        it('should validate NCAA team composition', async () => {
            const members = [{ role: 'starter' }, { role: 'starter' }, { role: 'starter' }, { role: 'substitute' }];

            mockClient.all.mockResolvedValue(members);

            const result = await validateTeamComposition(mockClient, 1, 'NCAA');

            expect(result.valid).toBe(true);
            expect(result.starterCount).toBe(3);
            expect(result.substituteCount).toBe(1);
        });

        it('should fail validation for invalid NCAA team', async () => {
            const members = [{ role: 'starter' }, { role: 'starter' }];

            mockClient.all.mockResolvedValue(members);

            const result = await validateTeamComposition(mockClient, 1, 'NCAA');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('must have exactly 3 starters');
        });

        it('should validate 45-touch relay team composition', async () => {
            const members = [{ role: 'starter' }, { role: 'starter' }, { role: 'starter' }, { role: 'substitute' }];

            mockClient.all.mockResolvedValue(members);

            const result = await validateTeamComposition(mockClient, 1, '45-touch');

            expect(result.valid).toBe(true);
        });
    });

    describe('seedTeamsInPools', () => {
        it('should seed teams using snake seeding', async () => {
            const teams = [
                { id: 1, seed: 1 },
                { id: 2, seed: 2 },
                { id: 3, seed: 3 },
                { id: 4, seed: 4 },
                { id: 5, seed: 5 },
                { id: 6, seed: 6 },
            ];

            mockClient.all.mockResolvedValue(teams);
            mockClient.insert.mockResolvedValue({ lastInsertRowid: 1 });

            await seedTeamsInPools(mockClient, 1, 1, 2, 3);

            // Should create 6 pool assignments (6 teams)
            expect(mockClient.insert).toHaveBeenCalledTimes(6);

            // Check snake seeding pattern
            // Pool 1: 1, 4, 5
            // Pool 2: 2, 3, 6
            expect(mockClient.insert).toHaveBeenNthCalledWith(
                1,
                'TeamPoolAssignment',
                expect.objectContaining({ teamid: 1, poolnumber: 1 })
            );
            expect(mockClient.insert).toHaveBeenNthCalledWith(
                2,
                'TeamPoolAssignment',
                expect.objectContaining({ teamid: 2, poolnumber: 2 })
            );
            expect(mockClient.insert).toHaveBeenNthCalledWith(
                3,
                'TeamPoolAssignment',
                expect.objectContaining({ teamid: 3, poolnumber: 2 })
            );
            expect(mockClient.insert).toHaveBeenNthCalledWith(
                4,
                'TeamPoolAssignment',
                expect.objectContaining({ teamid: 4, poolnumber: 1 })
            );
        });
    });
});
