# Remote Tournament Connection Persistence Implementation Plan

## Overview

This implementation plan addresses the architectural limitation in the TournaFence application where disconnection from a tournament server causes an immediate and disruptive switch to local database mode. The solution employs a zustand-based state management approach with a multi-tier caching strategy to provide a seamless user experience during network disruptions.

## Core Requirements

1. Maintain access to remote tournament data during temporary disconnections
2. Provide clear visual indicators of connection state to users
3. Implement intelligent reconnection strategies with exponential backoff
4. Enable graceful degradation of functionality based on connection state
5. Preserve user context and state across reconnection attempts

## System Architecture

### 1. Connection State Model

The application will implement a connection state machine with the following states:

```mermaid
stateDiagram-v2
    [*] --> LOCAL_MODE
    LOCAL_MODE --> CONNECTED: connect()
    CONNECTED --> TEMPORARILY_DISCONNECTED: connection lost
    TEMPORARILY_DISCONNECTED --> CONNECTED: reconnection success
    TEMPORARILY_DISCONNECTED --> PERMANENTLY_DISCONNECTED: max retries exceeded
    CONNECTED --> EXPLICITLY_DISCONNECTED: disconnect()
    EXPLICITLY_DISCONNECTED --> LOCAL_MODE: after timeout
    EXPLICITLY_DISCONNECTED --> CONNECTED: manual reconnect
    PERMANENTLY_DISCONNECTED --> CONNECTED: manual reconnect
    PERMANENTLY_DISCONNECTED --> LOCAL_MODE: user navigates away
```

These states represent:

- **CONNECTED**: Active connection to tournament server
- **TEMPORARILY_DISCONNECTED**: Connection lost, automatic reconnection in progress
- **EXPLICITLY_DISCONNECTED**: User-initiated disconnection
- **PERMANENTLY_DISCONNECTED**: Failed to reconnect after maximum attempts
- **LOCAL_MODE**: Operating with local tournaments only

### 2. Multi-Tier Caching Architecture

```mermaid
flowchart TD
    A[Client Request] --> B{Connection State?}
    B -->|CONNECTED| C[Try Remote Server]
    B -->|DISCONNECTED| D[Use Cache]
    C -->|Success| E[Update Cache]
    C -->|Failure| D
    D -->|Cache Hit| F[Return Cached Data]
    D -->|Cache Miss| G{LOCAL_MODE?}
    G -->|Yes| H[Use Local Database]
    G -->|No| I[Return Error]
    
    subgraph "Cache System"
    J[In-Memory Cache] --> K[Persistent Cache]
    end
```

We'll implement a multi-tiered caching approach:

1. **In-Memory Cache (Primary)**: Fast access tier using zustand
2. **Persistent Cache (Secondary)**: Durable storage using AsyncStorage

The local database will never be used for remote tournament data, as it would serve incorrect data. It will only be used in LOCAL_MODE, when the user is working with tournaments stored locally on the device.

### 3. Data Source Prioritization

The system will implement a clear hierarchy for data source selection:

```mermaid
flowchart TD
    A[Data Request] --> B{LOCAL_MODE?}
    B -->|Yes| C[Local Database]
    B -->|No| D[Remote Tournament]
    D --> E{Connection State?}
    E -->|CONNECTED| F[Try Remote Server]
    E -->|Any Disconnected State| G[Use Cache]
    F -->|Success| H[Return & Update Cache]
    F -->|Failure| G
    G -->|Cache Hit| I[Return Cached Data]
    G -->|Cache Miss| J[Return Error]
```

For remote tournaments:
1. **Remote Server**: Primary source when connected
2. **Memory Cache**: First fallback when disconnected or server errors occur
3. **Persistent Cache**: Second fallback when memory cache is unavailable

For local tournaments:
1. **Local Database**: Only source for LOCAL_MODE

The local database should never be used as a fallback for remote tournament data, as it would serve incorrect data. Each data fetching operation should follow this strict separation between remote and local data sources.

## Implementation Details

### 1. Initialization Sequence

The initialization sequence is critical to ensure proper system state on application launch:

```mermaid
sequenceDiagram
    participant App
    participant ConnectionStore
    participant CacheStore
    participant TournamentClient
    
    App->>ConnectionStore: loadPersistedState()
    App->>CacheStore: hydrate()
    ConnectionStore->>TournamentClient: checkLastConnection()
    alt Was Connected
        ConnectionStore->>TournamentClient: attemptReconnection()
        alt Reconnection Success
            TournamentClient->>ConnectionStore: updateState(CONNECTED)
        else Reconnection Failure
            TournamentClient->>ConnectionStore: updateState(TEMPORARILY_DISCONNECTED)
            ConnectionStore->>ConnectionStore: scheduleReconnect()
        end
    else No Previous Connection
        ConnectionStore->>ConnectionStore: setState(LOCAL_MODE)
    end
```

The initialization process should:

1. Load persisted connection state and cache data
2. Check if the app was previously connected to a tournament
3. If previously connected, attempt reconnection
4. Transition to appropriate state based on reconnection result
5. Initialize UI components with loaded state

### 2. Query Deduplication Strategy

To prevent cache thrashing during reconnection attempts:

```mermaid
flowchart TD
    A[Query Request] --> B{Active Query for Same Key?}
    B -->|Yes| C[Join Existing Promise]
    B -->|No| D[Create New Query Promise]
    D --> E[Add to In-Flight Queries]
    D --> F{Connection State?}
    F -->|CONNECTED| G[Request from Server]
    F -->|Disconnected| H[Use Cache]
    G -->|Complete| I[Remove from In-Flight]
    H -->|Complete| I
    I --> J[Resolve All Waiting Promises]
```

The implementation should:

1. Maintain a map of in-flight query promises by query key
2. When a duplicate query is requested, return the existing promise
3. Resolve all waiting promises with the same result when complete
4. Clear from the in-flight map after completion
5. Implement timeout handling for stuck queries

### 3. Cache Versioning Mechanism

```mermaid
flowchart LR
    A[Cache Entry] --> B[Metadata]
    B --> C[version: string]
    B --> D[timestamp: number]
    B --> E[ttl: number]
    A --> F[Data]
    
    G[Cache Store] --> H[Migration Manager]
    H --> I{Version Match?}
    I -->|Yes| J[Use As Is]
    I -->|No| K[Apply Migrations]
    K --> L[Update Version]
```

The cache versioning system should:

1. Store schema version with each cache entry
2. Include a migration framework for handling schema changes
3. Version each entity type independently to allow partial migrations
4. Provide a mechanism to force refresh when versions are incompatible
5. Log migration operations for debugging purposes

### 4. Memory Pressure Handling

The cache system should respond appropriately to memory constraints:

```mermaid
flowchart TD
    A[Memory Warning] --> B[Calculate Cache Size]
    B --> C{Over Threshold?}
    C -->|Yes| D[Initiate Eviction]
    D --> E[Sort by Priority & Access Time]
    E --> F[Evict Lowest Priority Items]
    F --> G[Verify Size Reduction]
    G -->|Sufficient| H[Continue]
    G -->|Insufficient| F
    C -->|No| H
```

Implementation should:

1. Monitor memory warnings from the device
2. Implement size estimation for cached objects
3. Define eviction policies based on priority and access patterns
4. Preserve critical navigation and UI state data during eviction
5. Provide hooks for components to mark entries as essential



## Offline UX Patterns

The user experience during connection state transitions should follow these patterns:

### 1. Connection Status Indicators

```mermaid
flowchart LR
    A[Connection States] --> B[Visual Indicators]
    B --> C[CONNECTED: Green dot]
    B --> D[TEMPORARILY_DISCONNECTED: Yellow banner with spinner]
    B --> E[PERMANENTLY_DISCONNECTED: Red banner with retry button]
    B --> F[EXPLICITLY_DISCONNECTED: Gray banner]
    B --> G[LOCAL_MODE: No indicator]
    
    A --> H[Toast Notifications]
    H --> I[Connection Lost: Brief toast]
    H --> J[Reconnected: Brief success toast]
    H --> K[Permanently Disconnected: Persistent toast]
```

Implementation guidelines:

1. Use consistent color coding across the application
2. Position indicators in non-intrusive but visible locations
3. Animate transitions between states
4. Provide appropriate action buttons based on state
5. Ensure color choices consider accessibility requirements

### 2. Component Degradation Patterns

Components should follow consistent degradation patterns based on connection state:

```mermaid
flowchart TD
    A[Component States] --> B[Interactive Elements]
    A --> C[Data Displays]
    A --> D[Action Controls]
    
    B --> E{Connection Status}
    E -->|CONNECTED| F[Fully interactive]
    E -->|TEMPORARILY_DISCONNECTED| G[Interactive with warnings]
    E -->|PERMANENTLY_DISCONNECTED| H[Read-only with retry prompts]
    
    C -->|CONNECTED| I[Live data with freshness indicator]
    C -->|TEMPORARILY_DISCONNECTED| J[Cached data with timestamp]
    C -->|PERMANENTLY_DISCONNECTED| K[Cached data with staleness warning]
    
    D -->|CONNECTED| L[All actions available]
    D -->|TEMPORARILY_DISCONNECTED| M[Read & cached write operations]
    D -->|PERMANENTLY_DISCONNECTED| N[Read-only operations]
```

Guidelines for component behavior:

1. Display clear data freshness indicators (timestamp, "cached" badge)
2. Use subtle visual treatments to indicate degraded functionality
3. Disable or modify interactive elements based on connection state
4. Provide appropriate feedback for actions that require connection
5. Maintain consistent layout between states to prevent jarring transitions

### 3. Offline Action Handling

```mermaid
flowchart TD
    A[User Action] --> B{Requires Connection?}
    B -->|No| C[Execute Normally]
    B -->|Yes| D{Connection State?}
    
    D -->|CONNECTED| E[Execute Normally]
    D -->|TEMPORARILY_DISCONNECTED| F[Queue for Retry]
    D -->|Other| G[Show Cannot Complete]
    
    F --> H[Visual Pending Indicator]
    F --> I[Background Retry when Reconnected]
    I -->|Success| J[Remove from Queue + Notify]
    I -->|Failure| K[Keep in Queue + Error]
    
    G --> L[Offer Manual Retry Option]
```

Implementation requirements:

1. Queue critical user actions during TEMPORARILY_DISCONNECTED state
2. Provide visual feedback for queued actions
3. Automatically retry when connection is restored
4. Allow manual retry for failed actions
5. Preserve action context during disconnections

## Data Synchronization Strategy

### 1. Write Operation Handling

```mermaid
flowchart TD
    A[Write Operation] --> B{Connection State?}
    B -->|CONNECTED| C[Send to Server]
    B -->|TEMPORARILY_DISCONNECTED| D[Queue Operation]
    B -->|Other States| E[Show Error]
    
    C -->|Success| F[Update Local Cache]
    C -->|Failure| G{Server Error?}
    G -->|Yes| H[Retry with Backoff]
    G -->|No| I[Queue Operation]
    
    D --> J[Optimistic UI Update]
    D --> K[Store in Pending Queue]
    K --> L[Apply to Cache]
    
    F --> M[Operation Complete]
    
    subgraph "Reconnection"
    N[Connection Restored] --> O[Process Pending Queue]
    O --> P[Send Operations in Order]
    P --> Q{Conflict?}
    Q -->|Yes| R[Apply Resolution Strategy]
    Q -->|No| S[Confirm Operation]
    R --> T[Update Cache if Needed]
    S --> T
    end
```

This strategy requires:

1. A persistent queue for operations during disconnection
2. Vector clock or other conflict detection mechanism
3. Optimistic UI updates with visual pending indicators
4. Conflict resolution strategies for concurrent modifications
5. Ordered replay of operations upon reconnection

### 2. Conflict Resolution Approaches

```mermaid
flowchart TD
    A[Conflict Detected] --> B[Resolution Strategy]
    
    B --> C[Server Wins]
    B --> D[Client Wins]
    B --> E[Latest Wins]
    B --> F[Manual Resolution]
    B --> G[Merge Strategy]
    
    C --> H[Discard Local Changes]
    D --> I[Override Server Data]
    E --> J[Compare Timestamps]
    F --> K[Show Resolution UI]
    G --> L[Field-by-Field Merge]
    
    J -->|Server Newer| H
    J -->|Client Newer| I
    K --> M[User Choice]
    L --> N[Apply Merge Rules]
```

Implementation requirements:

1. Default to Server Wins for most entities
2. Use Latest Wins for certain entity types (e.g., scores)
3. Implement field-level merge for complex entities when possible
4. Provide manual resolution UI for critical conflicts
5. Track resolution decisions for future conflict handling

### 3. Synchronization Process

The synchronization process during reconnection follows this sequence:

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Cache
    participant PendingOps
    
    Client->>Server: Reconnection Established
    Client->>Server: Request Server Timestamp
    Server->>Client: Send Current Time
    Client->>Client: Calculate Clock Skew
    
    Client->>Server: Request Changes Since Last Sync
    Server->>Client: Send Change Set
    Client->>Client: Compare with Pending Ops
    Client->>Client: Detect Conflicts
    
    loop For Each Entity Type
        Client->>Client: Apply Resolution Strategy
        Client->>Cache: Update Cache
    end
    
    loop For Each Pending Op
        Client->>Client: Apply Clock Skew Correction
        Client->>Server: Send Operation
        alt Success
            Server->>Client: Confirm Success
            Client->>PendingOps: Remove Operation
        else Rejection
            Server->>Client: Reject with Reason
            Client->>Client: Handle Rejection
            Client->>PendingOps: Mark as Failed
        end
    end
    
    Client->>Cache: Update Last Sync Time
```

This process ensures:

1. Time synchronization between client and server
2. Efficient delta updates rather than full data refresh
3. Proper handling of conflicts during reconnection
4. Ordered application of pending operations
5. Resilience to partial synchronization failures

## Implementation Approach

The implementation will proceed in phases:

1. **Phase 1**: Connection state management and basic caching
2. **Phase 2**: Advanced caching and offline UX patterns
3. **Phase 3**: Synchronization and conflict resolution

By implementing the system incrementally, we can validate each layer before building the next, ensuring a robust and maintainable solution.

## Conclusion

This implementation plan addresses the connection persistence limitations while maintaining compatibility with the existing codebase. By utilizing zustand for state management and implementing a multi-tier caching strategy, we provide a seamless user experience during network disruptions while ensuring data integrity and consistency.