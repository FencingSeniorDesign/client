# TournaFence Implementation Strategy - Technical Specification

## 1. Development Phasing Framework

### 1.1 Phase Distribution Architecture

The implementation follows a structured phase distribution matrix with established dependencies and deliverables:

| Phase | Duration | Primary Focus | Key Deliverables | Dependencies |
|-------|----------|---------------|-----------------|--------------|
| **1. Core Infrastructure + Database Schema** | 4 weeks | System foundation | Domain models, schema implementation, base configuration | None |
| **2. Authentication + Repository Framework** | 3 weeks | Security architecture | Authentication system, repository interfaces, permission model | Phase 1 |
| **3. Network Layer + Basic Synchronization** | 4 weeks | Communication infrastructure | API endpoints, WebSocket channels, basic sync protocol | Phase 2 |
| **4. UI Framework + MVVM Implementation** | 3 weeks | User interface architecture | MVVM framework, base components, navigation | Phase 2 |
| **5. Feature Implementation (Incremental)** | 8 weeks | Core domain functionality | Tournament management, scoring, bracket generation | Phases 3, 4 |
| **6. Caching System + Advanced Synchronization** | 3 weeks | Performance optimization | Multi-level caching, conflict resolution | Phase 5 |
| **7. Optimization + Performance Tuning** | 2 weeks | System efficiency | Performance profiling, bottleneck elimination | Phase 6 |
| **8. Comprehensive Testing** | 3 weeks | Quality assurance | System tests, stress testing, user acceptance | All previous phases |

### 1.2 Critical Path Analysis

The critical path traverses the implementation phases as follows:

```
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Phase 4 (UI Framework) executes in parallel with Phase 3, facilitating earlier integration of UI components with backend services.

### 1.3 Phase Implementation Specifications

#### 1.3.1 Phase 1: Core Infrastructure + Database Schema

**Component Specifications:**

- **Domain Model System**
  - Entity class hierarchy with validation constraints
  - Immutable data structures with builder patterns
  - Comprehensive validation service with type-safe error reporting
  - Domain event publication framework

- **Database Abstraction Layer**
  - Exposed ORM table definition system
  - Migration framework with forward/backward compatibility
  - Transaction management subsystem with isolation levels
  - Query optimization framework

- **Configuration Management System**
  - Environment-aware configuration provider
  - Configuration inheritance hierarchy
  - Secure credential storage subsystem
  - Feature flag infrastructure

#### 1.3.2 Phase 2: Authentication + Repository Framework

**Component Specifications:**

- **Authentication Subsystem**
  - JWT token generation and validation service
  - Role-based authorization framework with permission matrix
  - Device identity verification system
  - Token lifecycle management service

- **Repository Framework**
  - Generic repository interface hierarchy
  - Specialized repository interfaces for domain entities
  - Implementation classes for SQLite and PostgreSQL
  - Unit of work and transaction scope management

- **Permission Enforcement System**
  - Annotation-based permission declaration
  - AOP interceptor for method-level security
  - Permission evaluation service with caching
  - Audit logging system for authorization decisions

#### 1.3.3 Phase 3: Network Layer + Basic Synchronization

**Component Specifications:**

- **API Endpoint Framework**
  - RESTful endpoint definition system
  - Request/response serialization framework
  - Error handling and reporting subsystem
  - Rate limiting and throttling service

- **WebSocket Communication System**
  - Connection management framework
  - Message serialization and routing
  - Subscription management system
  - Connection state monitoring service

- **Synchronization Protocol**
  - Entity versioning system
  - Change detection framework
  - Conflict resolution strategy interface
  - Synchronization message definitions

#### 1.3.4 Phase 4: UI Framework + Platform-Specific Implementation

**Component Specifications:**

- **MVVM Architecture Framework**
  - ViewModel base class with lifecycle management
  - UI state container with immutability guarantees
  - Command pattern implementation for UI actions
  - Navigation controller with deep linking support

- **Platform Adaptation System**
  - Form factor detection service
  - Input capability detection service
  - Adaptive layout engine
  - Platform-specific optimization service

- **Responsive Layout System**
  - Layout constraint system
  - Dynamic component sizing framework
  - Screen density adaptation service
  - Component visibility management

- **Accessibility Framework**
  - Screen reader integration service
  - Focus management system
  - Color contrast verification service
  - Alternative input method support

#### 1.3.5 Phase 5: Feature Implementation (Incremental)

**Component Specifications:**

- **Tournament Management Module**
  - Tournament creation and configuration services
  - Event and round management services
  - Participant registration and tracking services
  - Tournament lifecycle management services

- **Bout Management System**
  - Bout creation and assignment services
  - Score tracking and validation services
  - Penalty tracking and enforcement services
  - Bout completion and verification services

- **Bracket Generation Engine**
  - Seeding algorithm implementation
  - Bracket structure generation service
  - Advancement rule enforcement service
  - Special case handling (byes, withdrawals)

#### 1.3.6 Phase 6: Caching System + Advanced Synchronization

**Component Specifications:**

- **Multi-Level Cache Architecture**
  - Cache provider abstraction layer
  - Cache entry metadata management
  - Cache invalidation notification system
  - Cache statistics and monitoring service

- **Advanced Entity Synchronization**
  - Version vector implementation
  - Three-way merge engine
  - Conflict detection and resolution service
  - Entity dependency tracking system

- **Offline Operation System**
  - Operation queueing service
  - Operation replay and synchronization service
  - Connection state transition management
  - Conflict resolution user interface service

#### 1.3.7 Phase 7: Optimization + Performance Tuning

**Component Specifications:**

- **Performance Profiling Framework**
  - Method execution timing service
  - Memory allocation monitoring service
  - Database query analysis service
  - UI rendering performance monitoring

- **Optimization Services**
  - Query optimization service
  - Memory usage optimization service
  - Battery usage optimization service
  - Network bandwidth optimization service

#### 1.3.8 Phase 8: Comprehensive Testing

**Component Specifications:**

- **Test Execution Framework**
  - Automated test orchestration service
  - Test environment provisioning service
  - Test data generation service
  - Test result aggregation and reporting service

- **System Integration Testing**
  - End-to-end workflow verification system
  - Multi-device synchronization verification
  - Edge case scenario execution framework
  - Failure recovery testing system

## 2. Platform-Specific UI Architecture

### 2.1 UI Architecture Specification

The system implements a layered UI architecture that separates platform-independent business logic from platform-specific presentation components:

```
┌───────────────────────────────────────────────────────────┐
│                   Shared Business Logic                    │
│       (ViewModels, Domain Models, Repositories)           │
└───────────────────┬───────────────────┬───────────────────┘
                    │                   │                    
┌───────────────────▼───┐   ┌───────────▼───────────────────┐
│   Desktop-Specific UI  │   │         Mobile-Specific UI    │
│                        │   │                               │
│ ┌────────────────────┐ │   │ ┌─────────────────────────┐  │
│ │  Large-Format      │ │   │ │  Compact Navigation     │  │
│ │  Layout Components │ │   │ │  Components            │  │
│ └────────────────────┘ │   │ └─────────────────────────┘  │
│                        │   │                               │
│ ┌────────────────────┐ │   │ ┌─────────────────────────┐  │
│ │  Multi-pane Views  │ │   │ │  Single-pane Views      │  │
│ └────────────────────┘ │   │ └─────────────────────────┘  │
│                        │   │                               │
│ ┌────────────────────┐ │   │ ┌─────────────────────────┐  │
│ │  Keyboard-Focused  │ │   │ │  Touch-Optimized        │  │
│ │  Interactions      │ │   │ │  Interactions           │  │
│ └────────────────────┘ │   │ └─────────────────────────┘  │
└────────────────────────┘   └───────────────────────────────┘
           ▲                               ▲                  
           └───────────────┬───────────────┘                  
                           │                                  
┌──────────────────────────▼──────────────────────────────┐  
│                Shared UI Components                      │  
│                                                         │  
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  
│  │  Typography  │  │    Colors    │  │    Icons     │   │  
│  └──────────────┘  └──────────────┘  └──────────────┘   │  
│                                                         │  
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  
│  │   Buttons    │  │  Form Fields  │  │   Dialogs    │   │  
│  └──────────────┘  └──────────────┘  └──────────────┘   │  
│                                                         │  
│  ┌──────────────────────────────────────────────────┐   │  
│  │        Adaptive Layout primitives                │   │  
│  └──────────────────────────────────────────────────┘   │  
└─────────────────────────────────────────────────────────┘  
```

### 2.2 Platform-Specific Optimization Specification

#### 2.2.1 Desktop Interface Specification

**Information Architecture:**
- Multi-column layouts with dynamic panel allocation
- Hierarchical navigation with breadcrumb tracking
- Context-sensitive sidebars with related information
- Comprehensive data views with sortable and filterable tables

**Interaction Model:**
- Keyboard shortcut system for rapid operation execution
- Mouse-optimized precision controls for tournament management
- Drag-and-drop interfaces for resource allocation
- Right-click context menus for contextual operations

**Layout System:**
- Docking panel framework with user-customizable layouts
- Resizable interface components with preserved state
- Multiple synchronized views for cross-referenced data
- Split-pane interfaces for simultaneous data viewing

#### 2.2.2 Mobile Interface Specification

**Information Architecture:**
- Single-column focused layouts with progressive disclosure
- Tab-based primary navigation with bottom positioning
- Hierarchical drill-down navigation patterns
- Summarized data views with detail expansion capabilities

**Interaction Model:**
- Touch optimization with minimum 44×44dp touch targets
- Swipe gesture system for common navigation patterns
- Pull-to-refresh pattern for data synchronization
- Floating action buttons for primary operations

**Layout System:**
- Responsive containers with breakpoint-based reconfiguration
- Bottom sheet interfaces for supplementary information
- Modal dialogs for focused task completion
- Collapsible headers for maximized content space

### 2.3 Adaptive Layout System Specification

The adaptive layout system implements a responsive design framework that dynamically adjusts UI components based on device characteristics:

**Class Structure:**
- `WindowSizeClass`: Enumeration defining device size categories (Compact, Medium, Expanded)
- `WindowInsets`: Structure defining available screen space accounting for system UI elements
- `OrientationStateHandler`: Service managing orientation-specific layouts
- `AdaptiveLayoutController`: Core service orchestrating layout adaptation

**Layout Adaptation Rules:**
- Screen width < 600dp: Compact layout with single-column presentation
- Screen width 600-840dp: Medium layout with dual-pane presentation where appropriate
- Screen width > 840dp: Expanded layout with multi-column presentation
- Additional adaptation for orientation, pixel density, and input methods

**Component Selection Process:**
1. Device characteristics detection via platform APIs
2. WindowSizeClass determination based on screen metrics
3. Input capability assessment (touch, keyboard, mouse)
4. Component selection based on device classification
5. Layout parameter optimization for selected components

### 2.4 Authentication Framework Specification

The system implements a comprehensive role-based authentication framework with device identity verification:

#### 2.4.1 Authentication Component Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                Authentication System                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────┐      ┌───────────────────────────┐ │
│  │    Role Hierarchy     │      │    Permission Registry    │ │
│  │                       │      │                           │ │
│  │  - TOURNAMENT_ORGANIZER│◄────►│  - Entity-level permissions│ │
│  │  - REFEREE            │      │  - Operation permissions   │ │
│  │  - VIEWER             │      │  - System permissions      │ │
│  │  - SCORING_BOX        │      │  - Permission inheritance  │ │
│  └───────────┬───────────┘      └───────────────┬───────────┘ │
│              │                                   │             │
│              ▼                                   ▼             │
│  ┌───────────────────────┐      ┌───────────────────────────┐ │
│  │    Token Manager      │      │    AuthContext Provider   │ │
│  │                       │      │                           │ │
│  │  - JWT generation     │      │  - Current user role      │ │
│  │  - Token verification │◄────►│  - Permission evaluation  │ │
│  │  - Token refresh      │      │  - User authentication    │ │
│  │  - Device binding     │      │  - Session management     │ │
│  └───────────┬───────────┘      └───────────────┬───────────┘ │
│              │                                   │             │
│              └───────────────────┬───────────────┘             │
│                                  │                             │
│                                  ▼                             │
│  ┌───────────────────────────────────────────────────────────┐│
│  │                 AuthInterceptor                           ││
│  │                                                           ││
│  │  - Annotation-based permission enforcement                ││
│  │  - Method interception and verification                   ││
│  │  - Audit logging of access attempts                       ││
│  │  - Exception generation for unauthorized access           ││
│  └───────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 2.4.2 Role-Based Authentication Specification

**Role Hierarchy Interface:**
```
sealed class UserRole(val permissions: Set<Permission>) {
    object TournamentOrganizer : UserRole(
        setOf(
            Permission.MANAGE_TOURNAMENTS,
            Permission.MANAGE_EVENTS,
            Permission.MANAGE_PARTICIPANTS,
            Permission.ASSIGN_REFEREES,
            Permission.VIEW_ALL_DATA,
            Permission.MODIFY_ALL_DATA
        )
    )
    
    object Referee : UserRole(
        setOf(
            Permission.VIEW_ASSIGNED_BOUTS,
            Permission.SCORE_ASSIGNED_BOUTS,
            Permission.VIEW_EVENT_DATA,
            Permission.REPORT_ISSUES
        )
    )
    
    object Viewer : UserRole(
        setOf(
            Permission.VIEW_PUBLIC_DATA
        )
    )
    
    object ScoringBox : UserRole(
        setOf(
            Permission.REGISTER_TOUCHES,
            Permission.SYNC_WITH_REFEREE
        )
    )
}
```

**Permission Enforcement System:**
```
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class RequiresPermission(
    val permission: Permission,
    val entityParam: String = "",
    val ownerParam: String = ""
)

interface PermissionEvaluator {
    fun hasPermission(permission: Permission): Boolean
    fun hasPermission(permission: Permission, entityId: Long): Boolean
    fun hasPermission(permission: Permission, entity: Any): Boolean
}
```

#### 2.4.3 Device Registration Protocol

The system implements a secure device registration protocol using QR codes for authentication:

**Registration Sequence:**
1. Tournament organizer generates a unique registration token with embedded permissions
2. QR code is generated containing the registration token and tournament identifier
3. Referee/official scans QR code with their device
4. Device extracts registration information and initiates authentication handshake
5. Device sends hardware identifiers and requested role to tournament server
6. Tournament organizer verifies the registration request visually (name/photo)
7. Upon approval, device receives a signed JWT token bound to its hardware identifiers
8. Device stores token securely in local protected storage
9. Subsequent connections use the JWT token for authenticated access

**Security Measures:**
- Registration tokens expire after a configurable short time period (default: 5 minutes)
- Each registration token can only be used once
- Device hardware identifiers are cryptographically bound to issued JWT tokens
- JWTs have a configurable expiration period based on role (default: 12 hours for referees)
- Token refresh requires re-authentication for sensitive roles
- All authentication events are logged with device identifiers and timestamps
- Token revocation capability for compromised devices or unauthorized access

## 3. Caching Architecture Specification

### 3.1 Initial Cache Implementation

The system implements a single-level caching architecture with the following component structure:

```
┌───────────────────────────────────────────────────────────┐
│                     Client Application                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────┐        ┌─────────────────────┐   │
│  │   UI Components     │        │    View Models      │   │
│  └─────────┬───────────┘        └────────┬────────────┘   │
│            │                             │                │
│            ▼                             ▼                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Repository Layer                    │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│                            ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Memory Cache (L1)                   │  │
│  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │   │ Entity Cache│ │Query Results│ │Reference Data│   │  │
│  │   └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│                            ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │             Local Database Adapter                   │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    SQLite/PostgreSQL                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Cache Component Specifications

#### 3.2.1 Entity Cache

**Interface Definition:**
```
interface EntityCache<T: Any> {
    fun get(id: Any): T?
    fun put(id: Any, entity: T, metadata: CacheEntryMetadata)
    fun remove(id: Any)
    fun invalidate(type: KClass<T>)
    fun clear()
}
```

**Cache Entry Metadata Structure:**
```
data class CacheEntryMetadata {
    val creationTimestamp: Long
    val lastAccessTimestamp: Long
    val expirationTimestamp: Long
    val version: Long
    val sourceTopic: String
    val dependencies: Set<CacheKey>
}
```

**Configuration Parameters:**
```
data class EntityCacheConfiguration {
    val entityType: KClass<*>
    val ttlSeconds: Int
    val maxSize: Int
    val evictionPolicy: EvictionPolicy
    val invalidationTriggers: Set<InvalidationTrigger>
}

enum class EvictionPolicy {
    LRU, LFU, FIFO
}

enum class InvalidationTrigger {
    ENTITY_UPDATE, RELATED_ENTITY_UPDATE, TIME_EXPIRATION
}
```

#### 3.2.2 Query Results Cache

**Interface Definition:**
```
interface QueryResultsCache {
    fun <T> get(queryKey: String, parameters: Map<String, Any>): CachedQueryResult<T>?
    fun <T> put(queryKey: String, parameters: Map<String, Any>, result: List<T>, metadata: CacheEntryMetadata)
    fun invalidate(queryKey: String)
    fun invalidateByEntityType(entityType: KClass<*>)
    fun clear()
}
```

**Component Behavior:**
- Query result caching with parameterized query keys
- Automatic invalidation when related entities are modified
- Size-constrained caching with configurable maximum entries
- Results serialization for efficient memory usage

### 3.3 Future Cache Extension Specification

The caching architecture will be extended in Phase 6 to include the following components:

#### 3.3.1 Persistent Cache (L2)

**Interface Definition:**
```
interface PersistentCache {
    fun <T: Any> get(key: CacheKey): T?
    fun <T: Any> put(key: CacheKey, value: T, metadata: CacheEntryMetadata)
    fun remove(key: CacheKey)
    fun invalidate(pattern: CacheKeyPattern)
    fun clear()
    fun compact()
    fun stats(): PersistentCacheStats
}
```

**Component Behavior:**
- Disk-based storage with binary serialization format
- B-tree indexing for efficient key-based retrieval
- Size limitation with LRU eviction policy
- Periodic compaction to reclaim storage space
- Cross-session persistence with versioned entries

#### 3.3.2 Cache Coordination Service

**Interface Definition:**
```
interface CacheCoordinationService {
    fun registerCache(cache: CacheProvider, level: CacheLevel)
    fun invalidate(key: CacheKey)
    fun invalidatePattern(pattern: CacheKeyPattern)
    fun synchronizeAll()
    fun registerInvalidationListener(listener: InvalidationListener)
    fun propagateInvalidation(source: InvalidationSource, key: CacheKey)
}
```

**Component Behavior:**
- Coordinated invalidation across cache levels
- Invalidation message propagation via WebSocket
- Version vector tracking for distributed invalidation
- Cache coherence protocol implementation
- Invalidation batching for network efficiency

#### 3.3.3 Entity-Specific Caching Strategies

The system implements specialized caching strategies for each entity type, optimizing for their specific access patterns and update frequencies:

| Entity Type | Initial Load | Real-time Updates | Offline Access | Invalidation Strategy |
|-------------|--------------|-------------------|----------------|------------------------|
| Tournament  | HTTP         | SSE               | Full Cache     | Event-based with 30-minute TTL |
| Events      | HTTP         | SSE               | Full Cache     | Event-based with 15-minute TTL |
| Bouts       | HTTP         | WebSocket         | Role-based     | Immediate with propagation |
| Scores      | WebSocket    | WebSocket         | Limited        | Immediate with dependency tracking |
| Fencers     | HTTP         | SSE               | Minimal        | Event-based with 1-hour TTL |

**Caching Behavior by Entity:**

- **Tournament Entities:**
  - Loaded via HTTP during application initialization
  - Changes propagated via Server-Sent Events
  - Complete offline access for all users
  - Cache entries valid for 30 minutes with event-based invalidation
  - Background refresh when connection available

- **Event Entities:**
  - Loaded via HTTP during tournament view
  - Changes propagated via Server-Sent Events
  - Complete offline access for all users
  - Cache entries valid for 15 minutes with event-based invalidation
  - Proactive loading of related events

- **Bout Entities:**
  - Initial load via HTTP batch requests
  - Real-time updates via WebSocket subscription
  - Offline access based on user role
  - Immediate invalidation with dependency propagation
  - Partial updates for efficient bandwidth usage

- **Score Entities:**
  - Primary load and updates via WebSocket
  - High-priority real-time synchronization
  - Limited offline caching for recent results
  - Immediate invalidation when new scores reported
  - Delta updates for bandwidth optimization

- **Fencer Entities:**
  - Batch loading via HTTP requests
  - Infrequent updates via Server-Sent Events
  - Minimal caching for essential reference data
  - Long TTL (1 hour) with selective invalidation
  - Background prefetching for tournament participants

#### 3.3.4 Role-Based Cache Policies

The system implements role-specific caching policies that optimize for each user type's specific requirements:

**Tournament Organizer Cache Policy:**
- **Philosophy:** Minimal caching with direct database access
- **Cached Entities:**
  - Configuration data for UI performance
  - Reference data for data integrity rules
  - Historical results for reporting functions
  - UI state for view persistence
- **Cache Constraints:**
  - Aggressive invalidation to ensure data freshness
  - Direct database operations for critical data modifications
  - Synchronous validation for data integrity operations
  - Transaction boundary enforcement for multi-entity operations

**Referee Cache Policy:**
- **Philosophy:** Focused caching with bout-centric prioritization
- **Cached Entities:**
  - Assigned bouts with highest priority (L1 + L2 cache)
  - Active event data with full caching
  - Tournament structure for navigation
  - Fencer reference data for assigned bouts
- **Cache Constraints:**
  - Long-term caching of assigned bout data
  - Offline operation support for assigned bouts
  - Aggressive prefetching of imminent bout data
  - Background synchronization of non-critical data
  - Conflict resolution favors tournament organizer data

**Viewer Cache Policy:**
- **Philosophy:** Broad caching with emphasis on read performance
- **Cached Entities:**
  - Tournament structure and event listings
  - Recently viewed bouts with short retention
  - Results and standings with medium retention
  - Fencer profiles for viewed events
- **Cache Constraints:**
  - Limited offline browsing capabilities
  - Optimistic rendering with placeholder indicators
  - Background refresh with visual status indicators
  - Bandwidth-efficient delta updates
  - Progressive loading of historical data

**Scoring Box Cache Policy:**
- **Philosophy:** Minimal, focused caching for operational reliability
- **Cached Entities:**
  - Current bout data only
  - Connection parameters and device pairing data
  - Basic fencer identification data
- **Cache Constraints:**
  - Short-lived caching for active bout only
  - No persistent storage of bout history
  - Aggressive connection state monitoring
  - Immediate synchronization of scoring actions
  - Fallback to direct referee communication

## 4. Test-Driven Development Methodology

### 4.1 Test Classification Hierarchy

The system implements a hierarchical test classification system with the following structure:

```
┌─────────────────────────────────────────────────────────┐
│                   Test Hierarchy                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │               System Tests                       │    │
│  │   - End-to-end workflows                        │    │
│  │   - Cross-component integration                 │    │
│  │   - Performance and load testing                │    │
│  └────────────────────┬────────────────────────────┘    │
│                       │                                 │
│                       ▼                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │             Integration Tests                    │    │
│  │   - Component interactions                       │    │
│  │   - Database operations                          │    │
│  │   - Network operations                           │    │
│  │   - Security enforcement                         │    │
│  └────────────────────┬────────────────────────────┘    │
│                       │                                 │
│                       ▼                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │                Unit Tests                        │    │
│  │   - Domain entity behavior                       │    │
│  │   - Business rule enforcement                    │    │
│  │   - ViewModel logic                              │    │
│  │   - Utility functions                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Test Implementation Specification

#### 4.2.1 Unit Test Framework

**Test Class Structure:**
- Domain entity tests: Validation, state transitions, business rule enforcement
- Repository interface tests: Method contracts, error conditions, edge cases
- ViewModel tests: State transitions, command execution, data transformation
- Utility function tests: Input validation, output verification, error handling

**Test Framework Components:**
- Assertion library with fluent API for validation
- Mock object framework for dependency isolation
- Test data generators for comprehensive case coverage
- Parameterized test support for edge case verification

#### 4.2.2 Integration Test Framework

**Test Class Structure:**
- Repository implementation tests: Database operations, transaction management
- Network component tests: Communication protocols, connection management
- Security enforcement tests: Authentication, authorization, audit logging
- Cross-component interaction tests: Service collaboration verification

**Test Framework Components:**
- In-memory database support for repository testing
- Network simulation framework for connectivity testing
- Security context simulation for authorization testing
- Transaction verification framework for data consistency

#### 4.2.3 System Test Framework

**Test Class Structure:**
- End-to-end workflow tests: Complete business processes
- Performance tests: Response time, throughput, resource utilization
- Stress tests: System behavior under peak load conditions
- Recovery tests: System behavior after failure conditions

**Test Framework Components:**
- Test scenario definition language
- Automated test execution orchestration
- Performance metrics collection framework
- Load generation framework for stress testing

### 4.3 Test Coverage Requirements

**Coverage Metrics by Component Type:**

| Component Type | Line Coverage | Branch Coverage | Function Coverage |
|----------------|---------------|----------------|-------------------|
| Domain Model | 95% | 90% | 100% |
| Repositories | 90% | 85% | 95% |
| ViewModels | 90% | 80% | 95% |
| UI Components | 75% | 70% | 85% |
| Network Layer | 85% | 80% | 90% |
| Utilities | 90% | 85% | 95% |

## 5. Domain-Specific Language Specification

### 5.1 DSL Architecture Overview

The Domain-Specific Language framework implements a fluent API for tournament management operations with type-safe builders and context-sensitive operations.

#### 5.1.1 DSL Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                     DSL Entry Points                     │
│   - tournament { }                                      │
│   - bout { }                                            │
│   - query { }                                           │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     DSL Context Classes                  │
│   - TournamentDslContext                                │
│   - EventDslContext                                     │
│   - BoutDslContext                                      │
│   - ...                                                 │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     DSL Receivers                        │
│   - TournamentReceiver                                  │
│   - EventReceiver                                       │
│   - BoutReceiver                                        │
│   - ...                                                 │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     Domain Operations                    │
│   - TournamentOperations                                │
│   - EventOperations                                     │
│   - BoutOperations                                      │
│   - ...                                                 │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     Repository Layer                     │
└─────────────────────────────────────────────────────────┘
```

### 5.2 DSL Interface Specifications

#### 5.2.1 Tournament Management DSL

**Interface Definition:**
```
// Type-safe ID wrapper classes
@JvmInline
value class TournamentId(val value: Long)

@JvmInline
value class EventId(val value: Long)

@JvmInline
value class VenueId(val value: Long)

@JvmInline 
value class FencerId(val value: Long)

// Tournament creation DSL
interface TournamentDsl {
    fun name(name: String)
    fun startDate(date: LocalDate)
    fun endDate(date: LocalDate)
    fun venue(venueId: VenueId)
    fun venueName(name: String) // Alternative when creating new venue
    fun address(init: AddressDsl.() -> Unit)
    fun event(init: EventDsl.() -> Unit)
}

// Tournament modification DSL
interface TournamentModificationDsl {
    fun addFencers(fencerIds: List<FencerId>)
    fun seedEvent(eventId: EventId, init: SeedingDsl.() -> Unit)
    fun generatePools(eventId: EventId, init: PoolGenerationDsl.() -> Unit)
    fun assignReferees(init: RefereeAssignmentDsl.() -> Unit)
}
```

**Component Interaction Specification:**

The Tournament Management DSL facilitates the following interaction patterns:

1. **Tournament Creation Sequence:**
   - Client code invokes the tournament DSL entry point
   - DSL context receives and validates tournament configuration parameters
   - Tournament receiver transforms DSL inputs into domain model objects
   - Domain operations persist the tournament entity and associated metadata
   - Repository layer executes required database operations
   - System returns strongly-typed TournamentId for future references

2. **Tournament Configuration Process:**
   - Basic tournament properties (name, dates, venue) configured directly on TournamentDsl
   - Entity references handled via strongly-typed IDs (VenueId) ensuring referential integrity
   - Nested structure configuration (address, events) managed through specialized DSL contexts
   - Property validation performed at each DSL context level with type-safety enforcement
   - Cross-property constraints validated prior to execution

3. **Tournament Modification Flow:**
   - Modification DSL accepts an existing TournamentId ensuring correct entity targeting
   - Repository uses ID-based lookup for efficient entity retrieval
   - Modification operations reference entities via strongly-typed IDs
   - Repository persists changes with transaction integrity and referential consistency
   - Events published for tournament modification with appropriate entity identifiers

#### 5.2.2 Bout Management DSL

**Interface Definition:**
```
// Additional type-safe ID wrappers
@JvmInline
value class BoutId(val value: Long)

@JvmInline
value class RefereeId(val value: Long)

@JvmInline
value class StripId(val value: Long)

interface BoutDsl {
    fun fencer1(fencerId: FencerId)
    fun fencer2(fencerId: FencerId)
    fun referee(refereeId: RefereeId)
    fun strip(stripId: StripId)
    fun startPeriod(periodNumber: Int)
    fun stopPeriod(periodNumber: Int, timeRemaining: Duration)
    fun at(minutes: Int, seconds: Int, block: BoutActionDsl.() -> Unit)
    fun finalizeBout(block: BoutFinalizationDsl.() -> Unit)
}

interface BoutActionDsl {
    fun scoreTouch(fencerPosition: FencerPosition)
    fun card(fencerPosition: FencerPosition, cardTypeId: CardTypeId)
    fun medicalTimeout(fencerPosition: FencerPosition, duration: Duration)
    fun assignPriority(fencerPosition: FencerPosition)
}

// For reference:
enum class FencerPosition { FENCER_1, FENCER_2 }

@JvmInline
value class CardTypeId(val value: Long)
```

**Component Interaction Specification:**

The Bout Management DSL enables the following interaction patterns:

1. **Bout Setup Sequence:**
   - Client code invokes the bout DSL entry point with optional BoutId
   - DSL context receives and validates bout configuration parameters
   - System resolves participant entities using strongly-typed FencerId values
   - System allocates resources using StripId and RefereeId ensuring correct entity references
   - Initial bout state established in the repository with proper entity relationships
   - Returns BoutId for subsequent operations

2. **Bout Action Recording Process:**
   - Temporal actions (start/stop periods) modify bout time state using BoutId reference
   - Scoring actions update bout score state with fencer position validation
   - Card actions apply penalties using CardTypeId for rule enforcement
   - Special actions (medical timeout, priority) apply specialized rules
   - All actions are recorded with timestamps and proper entity references for replay capability

3. **Bout Finalization Flow:**
   - Final score validation against bout rules using type-safe entity references
   - Winner determination based on rules and score with proper FencerId assignment
   - Bout statistics calculation and persistence with referential integrity
   - State transition to completed status tracked in audit log with BoutId
   - Event publication for bout completion with strongly-typed entity identifiers

### 5.3 DSL Implementation Strategy

The DSL implementation utilizes Kotlin's type-safe builder pattern with the following technical components:

- Lambda with receiver for context-sensitive operations
- Builder pattern for entity construction
- Extension functions for fluent API design
- Type inference for simplified syntax
- Validation at construction time for error detection

### 5.4 Team Event Management Specification

The system implements comprehensive support for team events with specialized components and interfaces:

#### 5.4.1 Team Event Architecture

```
┌───────────────────────────────────────────────────────────┐
│                Team Event Management System                │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────┐        ┌───────────────────────┐ │
│  │   Team Repository   │        │  Team Event Settings  │ │
│  │                     │        │                       │ │
│  │  - Team CRUD        │◄──────►│  - Format configuration│ │
│  │  - Roster management│        │  - Scoring rules       │ │
│  │  - Validation       │        │  - Substitution rules  │ │
│  └─────────┬───────────┘        └───────────┬───────────┘ │
│            │                                │             │
│            ▼                                ▼             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               Team Match Manager                    │  │
│  │                                                     │  │
│  │  - Match creation and scheduling                    │  │
│  │  - Bout sequencing                                  │  │
│  │  - Position assignments                             │  │
│  │  - Substitution management                          │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│                            ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │             Format-Specific Handlers                │  │
│  │                                                     │  │
│  │  ┌─────────────────┐          ┌─────────────────┐   │  │
│  │  │  Relay Format   │          │   NCAA Format   │   │  │
│  │  │                 │          │                 │   │  │
│  │  │ - Score tracking│          │ - Bout tracking │   │  │
│  │  │ - Relay order   │          │ - Victory count │   │  │
│  │  │ - Rotation mgmt │          │ - Position mgmt │   │  │
│  │  └─────────────────┘          └─────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 5.4.2 Team Management Interfaces

**Team Repository Interface:**
```
interface TeamRepository {
    fun createTeam(event: Event, name: String, club: Club?): Team
    fun getTeam(teamId: Long): Team
    fun updateTeam(team: Team): Team
    fun deleteTeam(teamId: Long)
    fun getTeamsForEvent(eventId: Long): List<Team>
    
    fun addTeamMember(team: Team, fencer: Fencer, position: Int?, role: TeamMemberRole): TeamMember
    fun removeTeamMember(teamId: Long, fencerId: Long)
    fun updateTeamMember(teamMember: TeamMember): TeamMember
    fun getTeamMembers(teamId: Long): List<TeamMember>
}
```

**Team Event Settings Interface:**
```
interface TeamEventSettings {
    val eventId: Long
    val formatType: TeamFormatType // RELAY or NCAA
    val boutPointsToWin: Int
    val maxScore: Int? // For relay format
    val boutTimeLimitSeconds: Int
    val allowSubstitutions: Boolean
    val maxSubstitutions: Int?
    val substitutionRules: SubstitutionRules
}

enum class TeamFormatType {
    RELAY, NCAA
}

data class SubstitutionRules(
    val allowSubstitutionAfterBout: Boolean = true,
    val allowSubstitutionDuringBout: Boolean = false,
    val requireMedicalReason: Boolean = false,
    val allowMultipleSubstitutionsPerBout: Boolean = false
)
```

#### 5.4.3 Team Event DSL Specification

**Team Event DSL Interface:**
```
// Additional ID types for team event management
@JvmInline
value class TeamId(val value: Long)

@JvmInline
value class WeaponId(val value: Long)

@JvmInline
value class GenderId(val value: Long)

@JvmInline
value class AgeCategoryId(val value: Long)

@JvmInline
value class ClubId(val value: Long)

@JvmInline
value class TeamMatchId(val value: Long)

interface TeamEventDsl {
    fun name(name: String)
    fun weapon(weaponId: WeaponId)
    fun gender(genderId: GenderId)
    fun ageCategory(categoryId: AgeCategoryId)
    fun format(formatType: TeamFormatType)
    fun relaySettings(init: RelaySettingsDsl.() -> Unit)
    fun ncaaSettings(init: NcaaSettingsDsl.() -> Unit)
    fun substitutionRules(init: SubstitutionRulesDsl.() -> Unit)
}

interface TeamDsl {
    fun name(name: String)
    fun club(clubId: ClubId)
    fun captain(fencerId: FencerId)
    fun member(fencerId: FencerId, position: Int? = null, role: TeamMemberRole = TeamMemberRole.REGULAR)
    fun alternate(fencerId: FencerId)
}

interface TeamMatchDsl {
    fun team1(teamId: TeamId)
    fun team2(teamId: TeamId)
    fun referee(refereeId: RefereeId)
    fun strip(stripId: StripId)
    fun startTime(dateTime: LocalDateTime)
    fun bout(position: Int, init: TeamBoutDsl.() -> Unit)
    fun substitution(teamId: TeamId, outFencerId: FencerId, inFencerId: FencerId, reason: String? = null)
}
```

**Component Interaction Specification:**

The Team Event Management system enables the following interaction patterns:

1. **Team Event Configuration Sequence:**
   - Client code defines team event parameters through the TeamEventDsl with strongly-typed IDs
   - System validates configuration against tournament rules using typesafe entity references
   - Format-specific validation rules applied (relay vs NCAA) with consistent ID-based entity lookup
   - Team event parameters persisted to the database with proper foreign key relationships
   - Event created with team-specific metadata and returns EventId for future references

2. **Team Roster Management Process:**
   - Teams created through the TeamDsl with ClubId for proper club association
   - Team members added with FencerId for unambiguous fencer identification
   - Validation ensures team size constraints are met with reliable entity references
   - Captain designation with FencerId ensuring proper authorization
   - Alternates tracked for potential substitutions with consistent identity management

3. **Team Match Execution Flow:**
   - Match created between two teams using TeamId references for accurate team identification
   - Format-specific bout sequence generation with proper entity relationships
   - Fencer position assignments based on team roster using FencerId references
   - Score tracking according to format rules with referential integrity
   - Substitution management with rule enforcement using strongly-typed entity IDs

4. **Format-Specific Processing:**
   - Relay format: Cumulative scoring with sequential bouts linked by consistent IDs
   - NCAA format: Individual bout victories counted with reliable entity identification
   - Format-specific rules enforced for scoring and advancement with proper entity references
   - Specialized UI components for format visualization with consistent ID-based entity access

## 6. Conclusion

The implementation strategy outlined in this technical specification document provides a comprehensive architectural blueprint for the TournaFence system. The structured phasing approach enables incremental delivery while managing technical dependencies. The platform-specific UI architecture ensures optimal user experience across form factors. The caching architecture establishes a foundation for efficient data access with future extensibility. The test-driven development methodology ensures comprehensive quality validation throughout the development lifecycle.

The authentication framework provides robust security with role-based access control and device identity verification. The entity-specific and role-based caching strategies optimize performance for different user types and access patterns. The team event management system enables comprehensive support for complex team competitions in both relay and NCAA formats.

Implementation will proceed according to the defined phases, with continuous evaluation and adaptation based on emerging requirements and technical discoveries.