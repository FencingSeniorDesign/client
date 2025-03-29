#!/bin/bash
# Script to update all imports from TournamentDatabaseUtils to DrizzleDatabaseUtils

# List of files to update
FILES=(
    "src/navigation/screens/Home.tsx"
    "src/navigation/screens/TournamentListComponent.tsx"
    "src/navigation/screens/CreateTournamentModal.tsx"
    "src/navigation/screens/PoolsPage.tsx"
    "src/navigation/screens/DoubleEliminationPage.tsx"
    "src/navigation/screens/DEBracketPage.tsx" 
    "src/navigation/screens/CompassDrawPage.tsx"
    "src/networking/TournamentServer.ts"
)

# Loop through each file and update the import
for file in "${FILES[@]}"
do
    echo "Updating $file..."
    sed -i '' 's/TournamentDatabaseUtils/DrizzleDatabaseUtils/g' "$file"
done

echo "All files updated successfully!"