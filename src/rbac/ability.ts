import { createMongoAbility, AbilityBuilder, MongoAbility } from '@casl/ability';

// Define our subjects (entities we want to control access to)
export type AppSubjects = 'Tournament' | 'Event' | 'Round' | 'Official' | 'Referee' | 'Bout' | 'Fencer' | 'Team' | 'TeamMember' | 'TeamBout' | 'all';

// Define possible actions
export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'score' | 'substitute';

// Define our custom ability type for the application
export type AppAbility = MongoAbility<[Actions, AppSubjects]>;

// Define roles in the system
export enum Role {
    TOURNAMENT_CREATOR = 'tournament_creator',
    OFFICIAL = 'official',
    REFEREE = 'referee',
    VIEWER = 'viewer',
}

/**
 * Creates an ability instance based on user role
 */
export function defineAbilityFor(role: Role): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (role === Role.TOURNAMENT_CREATOR) {
        // Tournament creator can do everything
        can('manage', 'all');
    } else if (role === Role.OFFICIAL) {
        // Officials can do everything except manage officials
        can('manage', 'all');
        cannot('manage', 'Official');
        cannot('manage', 'Referee');
        // Officials can manage teams
        can('manage', 'Team');
        can('manage', 'TeamMember');
        can('substitute', 'TeamMember');
        can('score', 'TeamBout');
    } else if (role === Role.REFEREE) {
        // Referees can only score bouts (including team bouts)
        can('read', 'all');
        can('score', 'Bout');
        can('score', 'TeamBout');
        can('read', 'Team');
        can('read', 'TeamMember');
        can('substitute', 'TeamMember');
    } else {
        // Viewers can only read
        can('read', 'all');
    }

    return build();
}

// Create the default ability with no permissions
export const defaultAbility = defineAbilityFor(Role.VIEWER);

/**
 * Helper function to determine role from an ability instance
 */
export function getRoleFromAbility(ability: AppAbility): Role {
    if (ability.can('manage', 'all')) {
        return Role.TOURNAMENT_CREATOR;
    } else if (ability.can('manage', 'Tournament') && ability.cannot('manage', 'Official')) {
        return Role.OFFICIAL;
    } else if (ability.can('score', 'Bout')) {
        return Role.REFEREE;
    } else {
        return Role.VIEWER;
    }
}
