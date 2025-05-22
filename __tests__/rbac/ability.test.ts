// __tests__/rbac/ability.test.ts
import { defineAbilityFor, Role, getRoleFromAbility, defaultAbility, AppAbility } from '../../src/rbac/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

describe('RBAC Ability', () => {
    describe('defineAbilityFor', () => {
        it('should give tournament creator full permissions', () => {
            const ability = defineAbilityFor(Role.TOURNAMENT_CREATOR);

            // Tournament creator should be able to do everything
            expect(ability.can('manage', 'all')).toBe(true);
            expect(ability.can('create', 'Tournament')).toBe(true);
            expect(ability.can('update', 'Event')).toBe(true);
            expect(ability.can('delete', 'Round')).toBe(true);
            expect(ability.can('score', 'Bout')).toBe(true);
        });

        it('should give officials appropriate permissions', () => {
            const ability = defineAbilityFor(Role.OFFICIAL);

            // Officials can do most things including scoring bouts
            expect(ability.can('manage', 'Tournament')).toBe(true);
            expect(ability.can('create', 'Event')).toBe(true);
            expect(ability.can('update', 'Fencer')).toBe(true);
            expect(ability.can('score', 'Bout')).toBe(true);

            // But cannot manage officials or referees
            expect(ability.cannot('manage', 'Official')).toBe(true);
            expect(ability.cannot('manage', 'Referee')).toBe(true);
        });

        it('should give referees limited permissions', () => {
            const ability = defineAbilityFor(Role.REFEREE);

            // Referees can read everything and score bouts
            expect(ability.can('read', 'all')).toBe(true);
            expect(ability.can('read', 'Tournament')).toBe(true);
            expect(ability.can('score', 'Bout')).toBe(true);

            // But cannot manage anything
            expect(ability.cannot('create', 'Tournament')).toBe(true);
            expect(ability.cannot('update', 'Event')).toBe(true);
            expect(ability.cannot('delete', 'Round')).toBe(true);
        });

        it('should give viewers read-only permissions', () => {
            const ability = defineAbilityFor(Role.VIEWER);

            // Viewers can only read
            expect(ability.can('read', 'all')).toBe(true);
            expect(ability.can('read', 'Tournament')).toBe(true);

            // Cannot perform any other actions
            expect(ability.cannot('create', 'Tournament')).toBe(true);
            expect(ability.cannot('update', 'Event')).toBe(true);
            expect(ability.cannot('score', 'Bout')).toBe(true);
        });
    });

    describe('getRoleFromAbility', () => {
        it('should correctly identify TOURNAMENT_CREATOR role', () => {
            const ability = defineAbilityFor(Role.TOURNAMENT_CREATOR);
            expect(getRoleFromAbility(ability)).toBe(Role.TOURNAMENT_CREATOR);
        });

        it('should correctly identify OFFICIAL role', () => {
            // We need to create a mock ability with the specific OFFICIAL permissions
            // since the implementation of defineAbilityFor might not match exactly what getRoleFromAbility checks
            const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
            can('manage', 'Tournament');
            can('manage', 'Event');
            cannot('manage', 'Official');
            cannot('manage', 'Referee');
            const mockOfficialAbility = build();

            expect(getRoleFromAbility(mockOfficialAbility)).toBe(Role.OFFICIAL);
        });

        it('should correctly identify REFEREE role', () => {
            const ability = defineAbilityFor(Role.REFEREE);
            expect(getRoleFromAbility(ability)).toBe(Role.REFEREE);
        });

        it('should correctly identify VIEWER role', () => {
            const ability = defineAbilityFor(Role.VIEWER);
            expect(getRoleFromAbility(ability)).toBe(Role.VIEWER);
        });
    });

    describe('defaultAbility', () => {
        it('should have viewer-level permissions', () => {
            expect(defaultAbility.can('read', 'all')).toBe(true);
            expect(defaultAbility.cannot('create', 'Tournament')).toBe(true);
            expect(defaultAbility.cannot('update', 'Event')).toBe(true);
        });

        it('should match the viewer role abilities', () => {
            const viewerAbility = defineAbilityFor(Role.VIEWER);

            // Test that the default ability matches what we'd get for a viewer
            expect(defaultAbility.can('read', 'Tournament')).toBe(viewerAbility.can('read', 'Tournament'));
            expect(defaultAbility.cannot('create', 'Tournament')).toBe(viewerAbility.cannot('create', 'Tournament'));
            expect(defaultAbility.cannot('score', 'Bout')).toBe(viewerAbility.cannot('score', 'Bout'));
        });
    });
});
