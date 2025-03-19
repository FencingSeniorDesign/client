# Migrated TournaFence Client

This is a migrated version of the TournaFence client with a domain-driven folder structure.

## Folder Structure

```
- assets/                            # Static assets
- docs/                              # Documentation
- src/
  - core/                            # Core application utilities
    - navigation/                    # Navigation setup
    - utils/                         # Generic utilities
    - hooks/                         # Generic hooks
    - components/                    # Shared/common components
    - types/                         # TypeScript type definitions
  - features/                        # Domain-based features
    - tournaments/                   # Tournament management feature
    - events/                        # Event management feature
    - fencers/                       # Fencer management feature
    - pools/                         # Pool round feature
    - brackets/                      # Bracket round features
    - referee/                       # Referee module feature
    - officials/                     # Officials management feature
  - data/                            # Data access layer
    - database/                      # Database access
    - networking/                    # Networking layer
    - providers/                     # Data providers
  - App.tsx                          # Root App component
```

## Benefits of the New Structure

1. Feature cohesion - All code related to a specific feature is grouped together
2. Easier to understand the domain model
3. Better separation of concerns
4. Improved maintainability and scalability
5. More intuitive for new developers to navigate
6. Clearer boundaries between different parts of the application
