#!/bin/bash
set -e

# Define source and destination directories
SOURCE_DIR="/Users/luka/Documents/DevFolder/client"
DEST_DIR="/Users/luka/Documents/DevFolder/client/client-new"

# Function to ensure directory exists
ensure_dir() {
  mkdir -p "$1"
}

# Function to copy a file with parent directories
copy_file() {
  local src="$1"
  local dest="$2"
  # Create the destination directory if it doesn't exist
  mkdir -p "$(dirname "$dest")"
  # Copy the file
  cp "$src" "$dest"
  echo "Copied: $src → $dest"
}

echo "=== Starting Migration Process ==="
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"

# ======= PHASE 1: Core Files =======
echo "=== Phase 1: Migrating Core Files ==="

# Copy types
copy_file "$SOURCE_DIR/src/types.d.ts" "$DEST_DIR/src/core/types.ts"

# ======= PHASE 2: Infrastructure Files =======
echo "=== Phase 2: Migrating Infrastructure Files ==="

# Networking
copy_file "$SOURCE_DIR/src/networking/TournamentClient.ts" "$DEST_DIR/src/infrastructure/networking/client.ts"
copy_file "$SOURCE_DIR/src/networking/TournamentServer.ts" "$DEST_DIR/src/infrastructure/networking/server.ts"
copy_file "$SOURCE_DIR/src/networking/NetworkUtils.ts" "$DEST_DIR/src/infrastructure/networking/utils.ts"
copy_file "$SOURCE_DIR/src/networking/MessageTypes.ts" "$DEST_DIR/src/infrastructure/networking/types.ts"
copy_file "$SOURCE_DIR/src/networking/NetworkErrors.ts" "$DEST_DIR/src/infrastructure/networking/errors.ts"
copy_file "$SOURCE_DIR/src/networking/components/ConnectionStatusBar.tsx" "$DEST_DIR/src/infrastructure/networking/components/ConnectionStatusBar.tsx"

# ======= PHASE 3: Feature Domains =======
echo "=== Phase 3: Migrating Feature Domains ==="

# Tournament Domain
copy_file "$SOURCE_DIR/src/navigation/screens/Home.tsx" "$DEST_DIR/src/features/tournaments/screens/Home.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/TournamentListComponent.tsx" "$DEST_DIR/src/features/tournaments/components/TournamentList.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/CreateTournamentModal.tsx" "$DEST_DIR/src/features/tournaments/components/CreateTournamentModal.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/JoinTournamentModal.tsx" "$DEST_DIR/src/features/tournaments/components/JoinTournamentModal.tsx"

# Events Domain
copy_file "$SOURCE_DIR/src/navigation/screens/EventManagement.tsx" "$DEST_DIR/src/features/events/screens/EventManagement.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/EventSettings.tsx" "$DEST_DIR/src/features/events/screens/EventSettings.tsx"

# Rounds Domain - Pool
copy_file "$SOURCE_DIR/src/navigation/screens/PoolsPage.tsx" "$DEST_DIR/src/features/rounds/pool/screens/PoolsPage.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/BoutOrderPage.tsx" "$DEST_DIR/src/features/rounds/pool/screens/BoutOrderPage.tsx"

# Rounds Domain - DE
copy_file "$SOURCE_DIR/src/navigation/screens/DEBracketPage.tsx" "$DEST_DIR/src/features/rounds/de/screens/DEBracketPage.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/DoubleEliminationPage.tsx" "$DEST_DIR/src/features/rounds/de/double/screens/DoubleEliminationPage.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/CompassDrawPage.tsx" "$DEST_DIR/src/features/rounds/de/compass/screens/CompassDrawPage.tsx"
copy_file "$SOURCE_DIR/src/navigation/components/DEBoutCard.tsx" "$DEST_DIR/src/features/rounds/de/components/DEBoutCard.tsx"
copy_file "$SOURCE_DIR/src/navigation/components/DEHelpModal.tsx" "$DEST_DIR/src/features/rounds/de/components/DEHelpModal.tsx"
copy_file "$SOURCE_DIR/src/navigation/components/DEOverview.tsx" "$DEST_DIR/src/features/rounds/de/components/DEOverview.tsx"
copy_file "$SOURCE_DIR/src/navigation/utils/BracketFormats.ts" "$DEST_DIR/src/features/rounds/de/utils/BracketFormats.ts"
copy_file "$SOURCE_DIR/src/navigation/utils/CompassDrawUtils.ts" "$DEST_DIR/src/features/rounds/de/compass/utils/CompassDrawUtils.ts"
copy_file "$SOURCE_DIR/src/navigation/utils/DoubleEliminationUtils.ts" "$DEST_DIR/src/features/rounds/de/double/utils/DoubleEliminationUtils.ts"
copy_file "$SOURCE_DIR/src/navigation/utils/DENavigationUtil.ts" "$DEST_DIR/src/features/rounds/de/utils/DENavigationUtil.ts"
copy_file "$SOURCE_DIR/src/navigation/screens/RoundResults.tsx" "$DEST_DIR/src/features/rounds/results/screens/RoundResults.tsx"

# Officials Domain
copy_file "$SOURCE_DIR/src/navigation/screens/ManageOfficials.tsx" "$DEST_DIR/src/features/officials/screens/ManageOfficials.tsx"

# Referee Domain
copy_file "$SOURCE_DIR/src/navigation/screens/RefereeModule/RefereeModule.tsx" "$DEST_DIR/src/features/referee/screens/RefereeModule.tsx"
copy_file "$SOURCE_DIR/src/navigation/screens/RefereeModule/CustomTimeModal.tsx" "$DEST_DIR/src/features/referee/components/CustomTimeModal.tsx"

# ======= PHASE 4: Data Management =======
echo "=== Phase 4: Migrating Data Management Files ==="

# These will need to be split, but copy them to reference locations first
copy_file "$SOURCE_DIR/src/data/TournamentDataProvider.ts" "$DEST_DIR/src/infrastructure/database/TournamentDataProvider.ts.reference"
copy_file "$SOURCE_DIR/src/data/TournamentDataHooks.ts" "$DEST_DIR/src/infrastructure/database/TournamentDataHooks.ts.reference"
copy_file "$SOURCE_DIR/src/db/TournamentDatabaseUtils.ts" "$DEST_DIR/src/infrastructure/database/TournamentDatabaseUtils.ts.reference"
copy_file "$SOURCE_DIR/src/hooks/useTournamentQueries.ts" "$DEST_DIR/src/infrastructure/database/useTournamentQueries.ts.reference"
copy_file "$SOURCE_DIR/src/hooks/usePersistentStateHook.ts" "$DEST_DIR/src/core/hooks/usePersistentStateHook.ts"

# ======= PHASE 4.5: Create Drizzle ORM and Tanstack Query Infrastructure =======
echo "=== Phase 4.5: Creating Drizzle ORM and Tanstack Query Infrastructure ==="

# Create placeholder files for Drizzle ORM
mkdir -p "$DEST_DIR/src/infrastructure/database/migrations"
touch "$DEST_DIR/src/infrastructure/database/schema.ts"
touch "$DEST_DIR/src/infrastructure/database/client.ts"

# Create placeholder files for Tanstack Query
mkdir -p "$DEST_DIR/src/infrastructure/query"
touch "$DEST_DIR/src/infrastructure/query/provider.tsx"
touch "$DEST_DIR/src/infrastructure/query/utils.ts"

# Create placeholder hook directories for domains
mkdir -p "$DEST_DIR/src/features/tournaments/hooks"
touch "$DEST_DIR/src/features/tournaments/hooks/useTournamentQueries.ts"

mkdir -p "$DEST_DIR/src/features/events/hooks"
touch "$DEST_DIR/src/features/events/hooks/useEventQueries.ts"

mkdir -p "$DEST_DIR/src/features/fencers/hooks"
touch "$DEST_DIR/src/features/fencers/hooks/useFencerQueries.ts"

mkdir -p "$DEST_DIR/src/features/rounds/pool/hooks"
touch "$DEST_DIR/src/features/rounds/pool/hooks/usePoolQueries.ts"

mkdir -p "$DEST_DIR/src/features/rounds/de/hooks"
touch "$DEST_DIR/src/features/rounds/de/hooks/useDEQueries.ts"

mkdir -p "$DEST_DIR/src/features/officials/hooks"
touch "$DEST_DIR/src/features/officials/hooks/useOfficialQueries.ts"

mkdir -p "$DEST_DIR/src/features/referee/hooks"
touch "$DEST_DIR/src/features/referee/hooks/useRefereeQueries.ts"

# ======= PHASE 5: Navigation =======
echo "=== Phase 5: Migrating Navigation Files ==="

copy_file "$SOURCE_DIR/src/navigation/navigation/types.tsx" "$DEST_DIR/src/navigation/types.ts"
copy_file "$SOURCE_DIR/src/navigation/index.tsx" "$DEST_DIR/src/navigation/index.tsx.reference"

# ======= PHASE 6: App Root =======
echo "=== Phase 6: Migrating App Root ==="

copy_file "$SOURCE_DIR/src/App.tsx" "$DEST_DIR/src/App.tsx.reference"
copy_file "$SOURCE_DIR/index.tsx" "$DEST_DIR/src/index.tsx"

echo "=== Migration Complete ==="
echo "Next steps:"
echo "1. Split monolithic files (TournamentDatabaseUtils.ts, TournamentDataProvider.ts, etc.)"
echo "2. Update import paths in all files"
echo "3. Create domain-specific services and repositories"
echo "4. Update navigation structure"
echo "5. Build and test the application"