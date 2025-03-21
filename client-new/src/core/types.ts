import { relations as dbRelations } from '../infrastructure/database/schema';

// Rating type
export type Rating = 'U' | 'E' | 'D' | 'C' | 'B' | 'A';

// Core entity types
export interface Tournament {
  name: string;
  isComplete: boolean;
}

export interface Fencer {
  id: number;
  fname: string;
  lname: string;
  nickname?: string;
  gender?: string;
  club?: string;
  erating: Rating;
  eyear: number;
  frating: Rating;
  fyear: number;
  srating: Rating;
  syear: number;
}

export interface Person {
  id: number;
  fname: string;
  lname: string;
  nickname?: string;
}

export interface Referee extends Person {
  deviceId?: string;
}

export interface Official extends Person {
  deviceId?: string;
}

export type Weapon = 'Epee' | 'Foil' | 'Saber';
export type Gender = 'Men' | 'Women' | 'Mixed';
export type AgeCategory = 'Y10' | 'Y12' | 'Y14' | 'Cadet' | 'Junior' | 'Senior' | 'Veteran';
export type ClassCategory = 'Open' | 'Div1' | 'Div2' | 'Div3' | 'Unclassified';

export interface Event {
  id: number;
  tname: string;
  weapon: Weapon;
  gender: Gender;
  age: AgeCategory;
  class: ClassCategory;
  seeding?: string;
}

export type RoundType = 'pool' | 'de';

export type DEFormat = 'single' | 'double' | 'compass';
export type PoolsOption = 'promotion' | 'target';

export interface Round {
  id: number;
  eventId: number;
  type: RoundType;
  rorder: number;
  
  // Pool settings
  poolCount?: number;
  poolSize?: number;
  poolsOption?: PoolsOption;
  promotionPercent?: number;
  targetBracket?: number;
  useTargetBracket?: boolean;
  
  // DE settings
  deFormat?: DEFormat;
  deTableSize?: number;
  
  isStarted: boolean;
  isComplete: boolean;
}

export type BracketType = 'winners' | 'losers' | 'finals' | 'east' | 'north' | 'west' | 'south';
export type TableSize = 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256;

export interface Bout {
  id: number;
  lFencer?: number;
  rFencer?: number;
  victor?: number;
  referee?: number;
  eventId: number;
  roundId: number;
  tableOf?: TableSize;
}

export interface DEBracketBout {
  id: number;
  roundId: number;
  boutId: number;
  bracketType: BracketType;
  bracketRound: number;
  boutOrder: number;
  nextBoutId?: number;
  loserNextBoutId?: number;
}

export interface DETable {
  id: number;
  roundId: number;
  tableOf: TableSize;
}

export interface FencerBout {
  boutId: number;
  fencerId: number;
  score?: number;
}

export interface FencerPoolAssignment {
  roundId: number;
  poolId: number;
  fencerId: number;
  fencerIdInPool?: number;
}

// Relationship types
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

// Utility types for handling relationships
export type WithRelated<T, R extends keyof typeof dbRelations> = T & {
  [K in keyof typeof dbRelations[R]]: RelatedType<typeof dbRelations[R][K]>;
};

// Helper type to infer relationship result types
type RelatedType<R> = 
  R extends { relationship: 'one-to-one', target: any } 
    ? ReturnType<R['target']> 
    : R extends { relationship: 'many-to-one', target: any }
      ? ReturnType<R['target']>
      : R extends { relationship: 'one-to-many', target: any }
        ? ReturnType<R['target']>[]
        : R extends { relationship: 'many-to-many', target: any, through: any }
          ? ReturnType<R['target']>[]
          : never;

// Query result types with relationships
export type TournamentWithEvents = WithRelated<Tournament, 'tournaments'>;
export type EventWithRelations = WithRelated<Event, 'events'>;
export type RoundWithRelations = WithRelated<Round, 'rounds'>;
export type BoutWithRelations = WithRelated<Bout, 'bouts'>;

// Status types for application state
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// Response type for repository operations
export interface RepositoryResponse<T> {
  data?: T;
  error?: Error;
  status: LoadingStatus;
}

// Context types
export interface AppContextType {
  currentTournament?: Tournament;
  setCurrentTournament: (tournament: Tournament) => void;
}

// Live query types
export interface LiveQuerySubscription {
  unsubscribe: () => void;
}

export interface LiveQueryOptions<T> {
  onData?: (data: T) => void;
  onError?: (error: Error) => void;
}
