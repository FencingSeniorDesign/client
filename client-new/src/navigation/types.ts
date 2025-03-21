import { 
  Tournament, 
  Fencer, 
  Referee, 
  Official, 
  Event, 
  Round, 
  Bout,
  DEFormat,
  PoolsOption 
} from '../core/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// UI-specific types that extend core types
export interface PoolConfiguration {
  pools: number;
  baseSize: number;
  extraPools: number; // number of pools that get one extra fencer
}

export interface FencerWithPoolNumber extends Fencer {
  poolNumber?: number; // For pool assignment order
}

export interface EventWithUI extends Event {
  startedCount?: number; // Used to make sure we don't re-init pool/de brackets
}

export interface RoundWithUI extends Round {
  poolConfiguration?: PoolConfiguration;
}

export interface BoutWithFencers {
  id: number;
  fencerA: Fencer;
  fencerB: Fencer;
  scoreA: number;
  scoreB: number;
  status: 'pending' | 'active' | 'completed';
}

// Navigation types
export type MainTabParamList = {
  Home: undefined;
  Tournaments: undefined;
  Settings: undefined;
};

export type TournamentStackParamList = {
  TournamentList: undefined;
  TournamentDetails: { tournamentName: string };
  CreateTournament: undefined;
  JoinTournament: undefined;
};

export type EventStackParamList = {
  EventList: { tournamentName: string };
  EventDetails: { eventId: number };
  EventManagement: { tournamentName: string };
  EventSettings: { event: EventWithUI; onSave: (updatedEvent: EventWithUI) => void };
  EventResults: { eventId: number };
};

export type RoundStackParamList = {
  RoundList: { eventId: number };
  RoundSettings: { roundId: number };
  RoundResults: { roundId: number; eventId: number; currentRoundIndex: number };
};

export type PoolStackParamList = {
  PoolsOverview: { eventId: number; roundId: number; currentRoundIndex: number };
  PoolDetail: { roundId: number; poolId: number };
  BoutOrder: { roundId: number; poolId: number };
};

export type DEStackParamList = {
  DEBracket: { eventId: number; roundId: number; currentRoundIndex: number };
  DoubleElimination: { eventId: number; roundId: number; currentRoundIndex: number };
  CompassDraw: { eventId: number; roundId: number; currentRoundIndex: number };
};

export type RefereeStackParamList = {
  RefereeAssignment: { eventId: number };
  BoutScoring: {
    boutId: number;
    fencer1Name: string;
    fencer2Name: string;
    currentScore1: number;
    currentScore2: number;
  };
};

export type OfficialStackParamList = {
  OfficialList: { tournamentName: string };
  OfficialAssignment: { eventId: number };
  ManageOfficials: { tournamentName: string };
};

export type FencerStackParamList = {
  FencerList: { tournamentName: string };
  FencerDetails: { fencerId: number };
  FencerRegistration: { eventId: number };
};

// Combined root stack that includes all stacks
export type RootStackParamList = {
  // Main entry points
  HomeTabs: undefined;
  
  // Tournament section
  TournamentStack: undefined;
  ...TournamentStackParamList,
  
  // Event section
  EventStack: undefined;
  ...EventStackParamList,
  
  // Round section
  RoundStack: undefined;
  ...RoundStackParamList,
  
  // Pool section
  PoolStack: undefined;
  ...PoolStackParamList,
  
  // DE section
  DEStack: undefined;
  ...DEStackParamList,
  
  // Referee section
  RefereeStack: undefined;
  ...RefereeStackParamList,
  
  // Official section
  OfficialStack: undefined;
  ...OfficialStackParamList,
  
  // Fencer section
  FencerStack: undefined;
  ...FencerStackParamList,
  
  // Legacy routes (to be migrated)
  EventManagment: { tournamentName: string }; // Typo preserved for backward compatibility
  EventSettings: { event: EventWithUI; onSave: (updatedEvent: EventWithUI) => void };
  RefereeModule: {
    boutIndex: number;
    fencer1Name: string;
    fencer2Name: string;
    currentScore1: number;
    currentScore2: number;
    onSaveScores?: (score1: number, score2: number) => void;
  };
  PoolsPage: {
    event: EventWithUI;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
  };
  BoutOrderPage: {
    roundId: number;
    poolId: number;
    isRemote?: boolean;
  };
  RoundResults: {
    roundId: number;
    eventId: number;
    currentRoundIndex: number;
    isRemote?: boolean;
  };
  DEBracketPage: {
    event: EventWithUI;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
  };
  DoubleEliminationPage: {
    event: EventWithUI;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
  };
  CompassDrawPage: {
    event: EventWithUI;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
  };
  ManageOfficials: {
    tournamentName: string;
    isRemote?: boolean;
  };
  TournamentResultsPage: {
    eventId: number;
    isRemote?: boolean;
  };
};

// Navigation prop types
export type MainStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;