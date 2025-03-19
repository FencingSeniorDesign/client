#!/usr/bin/env python3
import os
import shutil
import re
from pathlib import Path

# Define source and destination paths
SOURCE_DIR = Path("/Users/luka/Documents/DevFolder/client")
DEST_DIR = Path("/Users/luka/Documents/DevFolder/client-new")

# Create the new directory structure
def create_directory_structure():
    dirs = [
        "assets",
        "docs",
        "src/core/navigation",
        "src/core/utils",
        "src/core/hooks",
        "src/core/components",
        "src/core/types",
        "src/features/tournaments/components",
        "src/features/tournaments/hooks",
        "src/features/tournaments/screens",
        "src/features/tournaments/utils",
        "src/features/events/components",
        "src/features/events/hooks",
        "src/features/events/screens",
        "src/features/events/utils",
        "src/features/fencers/components",
        "src/features/fencers/screens",
        "src/features/fencers/hooks",
        "src/features/fencers/utils",
        "src/features/pools/components",
        "src/features/pools/screens",
        "src/features/pools/hooks",
        "src/features/pools/utils",
        "src/features/brackets/components",
        "src/features/brackets/screens",
        "src/features/brackets/hooks",
        "src/features/brackets/utils",
        "src/features/referee/components",
        "src/features/referee/screens",
        "src/features/referee/hooks",
        "src/features/referee/utils",
        "src/features/officials/components",
        "src/features/officials/screens",
        "src/features/officials/hooks",
        "src/features/officials/utils",
        "src/data/database",
        "src/data/networking",
        "src/data/providers",
    ]
    
    for directory in dirs:
        (DEST_DIR / directory).mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {directory}")

# Copy root files
def copy_root_files():
    root_files = [
        "README.md",
        "app.json",
        "gesture-handler.native.tsx",
        "gesture-handler.tsx",
        "index.tsx",
        "package-lock.json",
        "package.json",
        "tsconfig.json",
        "typedoc.json"
    ]
    
    for file in root_files:
        if (SOURCE_DIR / file).exists():
            shutil.copy2(SOURCE_DIR / file, DEST_DIR / file)
            print(f"Copied root file: {file}")

# Copy and organize files based on domain
def organize_files():
    # Define file mappings (source path -> destination path)
    file_mappings = {
        # Assets
        "assets": "assets",
        "src/assets": "src/core/assets",
        
        # Docs
        "docs": "docs",
        
        # Core
        "src/App.tsx": "src/App.tsx",
        "src/types.d.ts": "src/core/types/index.d.ts",
        
        # Navigation core
        "src/navigation/index.tsx": "src/core/navigation/index.tsx",
        "src/navigation/navigation/types.tsx": "src/core/navigation/types.tsx",
        
        # Hooks
        "src/hooks/usePersistentStateHook.ts": "src/core/hooks/usePersistentStateHook.ts",
        
        # Utils
        "src/navigation/utils/RoundAlgorithms.tsx": "src/core/utils/RoundAlgorithms.tsx",
        
        # Tournament feature
        "src/navigation/screens/CreateTournamentModal.tsx": "src/features/tournaments/screens/CreateTournamentModal.tsx",
        "src/navigation/screens/JoinTournamentModal.tsx": "src/features/tournaments/screens/JoinTournamentModal.tsx",
        "src/navigation/screens/TournamentListComponent.tsx": "src/features/tournaments/screens/TournamentListComponent.tsx",
        "src/navigation/screens/Home.tsx": "src/features/tournaments/screens/Home.tsx",
        "src/data/TournamentDataHooks.ts": "src/features/tournaments/hooks/TournamentDataHooks.ts",
        "src/data/TournamentDataProvider.ts": "src/data/providers/TournamentDataProvider.ts",
        "src/hooks/useTournamentQueries.ts": "src/features/tournaments/hooks/useTournamentQueries.ts",
        
        # Event feature
        "src/navigation/screens/EventManagement.tsx": "src/features/events/screens/EventManagement.tsx",
        "src/navigation/screens/EventSettings.tsx": "src/features/events/screens/EventSettings.tsx",
        "src/navigation/screens/RoundResults.tsx": "src/features/events/screens/RoundResults.tsx",
        
        # Pools feature
        "src/navigation/screens/PoolsPage.tsx": "src/features/pools/screens/PoolsPage.tsx",
        "src/navigation/screens/BoutOrderPage.tsx": "src/features/pools/screens/BoutOrderPage.tsx",
        
        # Brackets feature
        "src/navigation/screens/DEBracketPage.tsx": "src/features/brackets/screens/DEBracketPage.tsx",
        "src/navigation/screens/DoubleEliminationPage.tsx": "src/features/brackets/screens/DoubleEliminationPage.tsx",
        "src/navigation/screens/CompassDrawPage.tsx": "src/features/brackets/screens/CompassDrawPage.tsx",
        "src/navigation/utils/BracketFormats.ts": "src/features/brackets/utils/BracketFormats.ts",
        "src/navigation/utils/CompassDrawUtils.ts": "src/features/brackets/utils/CompassDrawUtils.ts",
        "src/navigation/utils/DENavigationUtil.ts": "src/features/brackets/utils/DENavigationUtil.ts",
        "src/navigation/utils/DoubleEliminationUtils.ts": "src/features/brackets/utils/DoubleEliminationUtils.ts",
        "src/navigation/components/DEBoutCard.tsx": "src/features/brackets/components/DEBoutCard.tsx",
        "src/navigation/components/DEHelpModal.tsx": "src/features/brackets/components/DEHelpModal.tsx",
        "src/navigation/components/DEOverview.tsx": "src/features/brackets/components/DEOverview.tsx",
        
        # Referee feature
        "src/navigation/screens/RefereeModule/RefereeModule.tsx": "src/features/referee/screens/RefereeModule.tsx",
        "src/navigation/screens/RefereeModule/CustomTimeModal.tsx": "src/features/referee/screens/CustomTimeModal.tsx",
        
        # Officials feature
        "src/navigation/screens/ManageOfficials.tsx": "src/features/officials/screens/ManageOfficials.tsx",
        
        # Data layer
        "src/db/TournamentDatabaseUtils.ts": "src/data/database/TournamentDatabaseUtils.ts",
        "src/networking/MessageTypes.ts": "src/data/networking/MessageTypes.ts",
        "src/networking/NetworkErrors.ts": "src/data/networking/NetworkErrors.ts",
        "src/networking/NetworkUtils.ts": "src/data/networking/NetworkUtils.ts",
        "src/networking/TournamentClient.ts": "src/data/networking/TournamentClient.ts",
        "src/networking/TournamentServer.ts": "src/data/networking/TournamentServer.ts",
        "src/networking/components/ConnectionStatusBar.tsx": "src/core/components/ConnectionStatusBar.tsx",
    }
    
    # Copy files according to mappings
    for source_path, dest_path in file_mappings.items():
        source_full_path = SOURCE_DIR / source_path
        dest_full_path = DEST_DIR / dest_path
        
        if source_full_path.exists():
            if source_full_path.is_dir():
                if dest_full_path.exists():
                    shutil.rmtree(dest_full_path)
                shutil.copytree(source_full_path, dest_full_path)
                print(f"Copied directory: {source_path} -> {dest_path}")
            else:
                os.makedirs(os.path.dirname(dest_full_path), exist_ok=True)
                shutil.copy2(source_full_path, dest_full_path)
                print(f"Copied file: {source_path} -> {dest_path}")
        else:
            print(f"Warning: Source path does not exist: {source_path}")

# Create type definition files for each feature domain
def create_type_files():
    type_files = {
        "tournaments": """// Tournament related type definitions
export interface Tournament {
  id: string;
  name: string;
  // Add more properties as needed
}
""",
        "events": """// Event related type definitions
export interface Event {
  id: string;
  name: string;
  // Add more properties as needed
}
""",
        "fencers": """// Fencer related type definitions
export interface Fencer {
  id: string;
  name: string;
  // Add more properties as needed
}
""",
        "pools": """// Pool related type definitions
export interface Pool {
  id: string;
  fencers: string[];
  // Add more properties as needed
}
""",
        "brackets": """// Bracket related type definitions
export interface Bracket {
  id: string;
  type: string;
  // Add more properties as needed
}
""",
        "referee": """// Referee related type definitions
export interface Referee {
  id: string;
  name: string;
  // Add more properties as needed
}
""",
        "officials": """// Officials related type definitions
export interface Official {
  id: string;
  name: string;
  role: string;
  // Add more properties as needed
}
""",
    }
    
    for domain, content in type_files.items():
        file_path = DEST_DIR / f"src/features/{domain}/types.ts"
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Created type definition file: src/features/{domain}/types.ts")

# Create a README file for the migrated code
def create_readme():
    readme_content = """# Migrated TournaFence Client

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
"""
    
    with open(DEST_DIR / "README.md", 'w') as f:
        f.write(readme_content)
    print("Created new README.md file")

def main():
    print("Starting migration process...")
    create_directory_structure()
    copy_root_files()
    organize_files()
    create_type_files()
    create_readme()
    print("Migration completed successfully!")

if __name__ == "__main__":
    main()