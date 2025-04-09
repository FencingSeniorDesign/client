// src/navigation/utils/BoutOrderUtils.ts
import { Fencer } from '../navigation/types';

// Define bout order patterns for different pool sizes
const BOUT_ORDERS: { [key: number]: number[][] } = {
  4: [
    [1, 4], [2, 3], [1, 3], [2, 4], [3, 4], [1, 2]
  ],
  5: [
    [1, 2], [3, 4], [5, 1], [2, 3], [5, 4], [1, 3], [2, 5], [4, 1], [3, 5], [4, 2]
  ],
  6: [
    [1, 2], [4, 5], [2, 3], [5, 6], [3, 1], [6, 4], [2, 5], [1, 4], [5, 3], [1, 6], [4, 2], [3, 6], [5, 1], [3, 4], [6, 2]
  ],
  7: [
    [1, 4], [2, 5], [3, 6], [7, 1], [5, 4], [2, 3], [6, 7], [5, 1], [4, 3], [6, 2], [5, 7], [3, 1], [4, 6], [7, 2], [3, 5], [1, 6], [2, 4], [7, 3], [6, 5], [1, 2], [4, 7]
  ],
  8: [
    [2, 3], [1, 5], [7, 4], [6, 8], [1, 2], [3, 4], [5, 6], [8, 7], [4, 1], [5, 2], [8, 3], [6, 7], [4, 2], [8, 1], [7, 5], [3, 6], [2, 8], [5, 4], [6, 1], [3, 7], [4, 8], [2, 6], [3, 5], [1, 7], [4, 6], [8, 5], [7, 2], [1, 3]
  ],
  9: [
    [1, 9], [2, 8], [3, 7], [4, 6], [1, 5], [2, 9], [8, 3], [7, 4], [6, 5], [1, 2], [9, 3], [8, 4], [7, 5], [6, 1], [3, 2], [9, 4], [5, 8], [7, 6], [3, 1], [2, 4], [5, 9], [8, 6], [7, 1], [4, 3], [5, 2], [6, 9], [8, 7], [4, 1], [5, 3], [6, 2], [9, 7], [1, 8], [4, 5], [3, 6], [2, 7], [9, 8]
  ],
};

// Special bout orders for teammates
const TEAMMATE_BOUT_ORDERS: { [key: number]: { [key: string]: number[][] } } = {
  // 6 fencers
  6: {
    // 2 teammates at positions 1-4
    '1,4': [
      [1, 4], [2, 5], [3, 6], [5, 1], [4, 2], [3, 1], [6, 2], [5, 3], [6, 4], [1, 2], [3, 4], [5, 6], [2, 3], [1, 6], [4, 5]
    ],
    // Two sets of 2 teammates at positions 1-4, 2-5
    '1,4,2,5': [
      [1, 4], [2, 5], [3, 6], [5, 1], [4, 2], [3, 1], [6, 2], [5, 3], [6, 4], [1, 2], [3, 4], [5, 6], [2, 3], [1, 6], [4, 5]
    ],
    // Three sets of 2 teammates at positions 1-4, 2-5, 3-6
    '1,4,2,5,3,6': [
      [1, 4], [2, 5], [3, 6], [5, 1], [4, 2], [3, 1], [6, 2], [5, 3], [6, 4], [1, 2], [3, 4], [5, 6], [2, 3], [1, 6], [4, 5]
    ],
    // 3 teammates at positions 1-2-3
    '1,2,3': [
      [1, 2], [4, 5], [2, 3], [5, 6], [3, 1], [6, 4], [2, 5], [1, 4], [5, 3], [1, 6], [4, 2], [3, 6], [5, 1], [3, 4], [6, 2]
    ],
  },
  // 7 fencers
  7: {
    // 2 teammates at positions 1-4
    '1,4': [
      [1, 4], [2, 5], [3, 6], [7, 1], [5, 4], [2, 3], [6, 7], [5, 1], [4, 3], [6, 2], [5, 7], [3, 1], [4, 6], [7, 2], [3, 5], [1, 6], [2, 4], [7, 3], [6, 5], [1, 2], [4, 7]
    ],
    // 3 teammates at positions 1-2-3
    '1,2,3': [
      [1, 2], [4, 5], [6, 7], [3, 1], [4, 7], [2, 3], [5, 1], [6, 2], [3, 4], [7, 5], [1, 6], [4, 2], [7, 3], [5, 6], [1, 4], [2, 7], [5, 3], [6, 4], [7, 1], [2, 5], [3, 6]
    ],
  },
};

/**
 * Group fencers by club
 * @param fencers Array of fencers
 * @returns Object with club names as keys and arrays of fencers as values
 */
export function groupFencersByClub(fencers: Fencer[]): { [club: string]: Fencer[] } {
  const clubGroups: { [club: string]: Fencer[] } = {};
  
  fencers.forEach(fencer => {
    const clubName = fencer.club || fencer.clubName || '';
    if (clubName && clubName !== '') {
      if (!clubGroups[clubName]) {
        clubGroups[clubName] = [];
      }
      clubGroups[clubName].push(fencer);
    }
  });
  
  return clubGroups;
}

/**
 * Assign pool positions to fencers based on club affiliations
 * @param fencers Array of fencers
 * @returns Array of fencers with poolNumber property set
 */
export function assignPoolPositions(fencers: Fencer[]): Fencer[] {
  const clubGroups = groupFencersByClub(fencers);
  const teamGroups = Object.values(clubGroups).filter(group => group.length > 1);
  const soloFencers = Object.values(clubGroups)
    .filter(group => group.length === 1)
    .flat();
  
  // Sort team groups by size (largest first)
  teamGroups.sort((a, b) => b.length - a.length);
  
  const poolSize = fencers.length;
  const assignedFencers: Fencer[] = new Array(poolSize);
  
  // Handle different scenarios based on pool size and team compositions
  if (poolSize === 6) {
    if (teamGroups.length === 1 && teamGroups[0].length === 2) {
      // 2 teammates: place them at positions 1 and 4
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[3] = teamGroups[0][1]; // Position 4
    } else if (teamGroups.length === 2 && teamGroups[0].length === 2 && teamGroups[1].length === 2) {
      // Two sets of 2 teammates: place them at positions 1-4 and 2-5
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[3] = teamGroups[0][1]; // Position 4
      assignedFencers[1] = teamGroups[1][0]; // Position 2
      assignedFencers[4] = teamGroups[1][1]; // Position 5
    } else if (teamGroups.length === 3 && teamGroups[0].length === 2 && teamGroups[1].length === 2 && teamGroups[2].length === 2) {
      // Three sets of 2 teammates: place them at positions 1-4, 2-5, 3-6
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[3] = teamGroups[0][1]; // Position 4
      assignedFencers[1] = teamGroups[1][0]; // Position 2
      assignedFencers[4] = teamGroups[1][1]; // Position 5
      assignedFencers[2] = teamGroups[2][0]; // Position 3
      assignedFencers[5] = teamGroups[2][1]; // Position 6
    } else if (teamGroups.length === 1 && teamGroups[0].length === 3) {
      // 3 teammates: place them at positions 1-2-3
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[1] = teamGroups[0][1]; // Position 2
      assignedFencers[2] = teamGroups[0][2]; // Position 3
    }
  } else if (poolSize === 7) {
    if (teamGroups.length === 1 && teamGroups[0].length === 2) {
      // 2 teammates: place them at positions 1 and 4
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[3] = teamGroups[0][1]; // Position 4
    } else if (teamGroups.length === 1 && teamGroups[0].length === 3) {
      // 3 teammates: place them at positions 1-2-3
      assignedFencers[0] = teamGroups[0][0]; // Position 1
      assignedFencers[1] = teamGroups[0][1]; // Position 2
      assignedFencers[2] = teamGroups[0][2]; // Position 3
    }
  }
  // Add handling for other pool sizes as needed
  
  // Fill in remaining positions with solo fencers
  let soloIndex = 0;
  for (let i = 0; i < poolSize; i++) {
    if (!assignedFencers[i] && soloIndex < soloFencers.length) {
      assignedFencers[i] = soloFencers[soloIndex++];
    }
  }
  
  // If there are still empty positions, fill them with remaining team members
  let teamIndex = 0;
  for (let i = 0; i < poolSize; i++) {
    if (!assignedFencers[i]) {
      // Find the next unassigned team member
      let found = false;
      while (teamIndex < teamGroups.length && !found) {
        const team = teamGroups[teamIndex];
        const unassignedMember = team.find(member => !assignedFencers.includes(member));
        if (unassignedMember) {
          assignedFencers[i] = unassignedMember;
          found = true;
        } else {
          teamIndex++;
        }
      }
    }
  }
  
  // Set pool numbers for each fencer
  return assignedFencers.map((fencer, index) => {
    if (fencer) {
      return {
        ...fencer,
        poolNumber: index + 1 // 1-based position
      };
    }
    // If there's a gap (shouldn't happen), use the original fencer
    return {
      ...fencers[index],
      poolNumber: index + 1
    };
  });
}

/**
 * Get the bout order for a pool
 * @param poolSize Size of the pool
 * @param fencers Array of fencers in the pool
 * @returns Array of bout pairs [leftPosition, rightPosition]
 */
export function getBoutOrder(poolSize: number, fencers: Fencer[]): number[][] {
  // Group fencers by club to identify teammates
  const clubGroups = groupFencersByClub(fencers);
  const teamGroups = Object.values(clubGroups).filter(group => group.length > 1);
  
  // If no teammates or unsupported pool size, use standard bout order
  if (teamGroups.length === 0 || !BOUT_ORDERS[poolSize]) {
    return BOUT_ORDERS[poolSize] || [];
  }
  
  // Create a string representation of teammate positions
  const teammatePositions: string[] = [];
  teamGroups.forEach(group => {
    const positions = group.map(fencer => fencer.poolNumber || 0).sort((a, b) => a - b);
    teammatePositions.push(positions.join(','));
  });
  
  // Check if we have a special bout order for this configuration
  const positionKey = teammatePositions.join(',');
  if (TEAMMATE_BOUT_ORDERS[poolSize] && TEAMMATE_BOUT_ORDERS[poolSize][positionKey]) {
    return TEAMMATE_BOUT_ORDERS[poolSize][positionKey];
  }
  
  // Default to standard bout order if no special order is defined
  return BOUT_ORDERS[poolSize] || [];
}

/**
 * Generate club abbreviation from name
 * @param name Club name
 * @returns Abbreviation (2-5 characters)
 */
export function generateClubAbbreviation(name: string): string {
  if (!name) return '';
  
  // Take first letter of each word, uppercase
  const abbr = name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  // Ensure it's between 2-5 characters
  if (abbr.length < 2) {
    // If too short, add the second letter of the first word if available
    return name.length > 1 ? name.substring(0, 2).toUpperCase() : abbr;
  } else if (abbr.length > 5) {
    // If too long, truncate to 5 characters
    return abbr.substring(0, 5);
  }
  
  return abbr;
}