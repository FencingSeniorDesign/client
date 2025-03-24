#!/usr/bin/env bash
# Script to update imports to use the new structure

# Set the directory to the project root
PROJECT_DIR="$(pwd)"

# Find all TypeScript and TypeScript React files
find $PROJECT_DIR/src -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do
  echo "Processing $file"
  
  # Update old repository imports to new service/hook pattern
  sed -i '' 's/import { \([a-zA-Z0-9]*\)Repository } from ".\/\([a-zA-Z0-9]*\)Repository"/import { use\1Repository } from ".\/hooks\/use\1Repository"/g' "$file"
  sed -i '' 's/import { \([a-zA-Z0-9]*\)Repository } from "..\/\([a-zA-Z0-9]*\)Repository"/import { use\1Repository } from "..\/hooks\/use\1Repository"/g' "$file"
  
  # Update old direct database imports to use the infrastructure exports
  sed -i '' 's/import { db } from "..\/..\/..\/infrastructure\/database\/client"/import { db } from "..\/..\/..\/infrastructure\/database"/g' "$file"
  sed -i '' 's/import db from "..\/..\/..\/infrastructure\/database\/client"/import { db } from "..\/..\/..\/infrastructure\/database"/g' "$file"
  
  # Update network status imports
  sed -i '' 's/import { useNetworkStatus } from "..\/..\/..\/infrastructure\/networking\/client"/import { useNetworkStatus } from "..\/..\/..\/infrastructure\/networking"/g' "$file"
  
  # Update query-related imports
  sed -i '' 's/import { useInvalidateQueries } from "..\/..\/..\/infrastructure\/query\/utils"/import { useInvalidateQueries } from "..\/..\/..\/infrastructure\/query"/g' "$file"
  sed -i '' 's/import { createQueryKeys } from "..\/..\/..\/infrastructure\/query\/utils"/import { createQueryKeys } from "..\/..\/..\/infrastructure\/query"/g' "$file"
  
  # Update advanced query imports
  sed -i '' 's/import { \([a-zA-Z0-9]*\) } from "..\/..\/..\/infrastructure\/query\/advanced"/import { \1 } from "..\/..\/..\/infrastructure\/query"/g' "$file"
  
  # Update old schema imports to use the infrastructure exports
  sed -i '' 's/import { \([a-zA-Z0-9, ]*\) } from "..\/..\/..\/infrastructure\/database\/schema"/import { \1 } from "..\/..\/..\/infrastructure\/database"/g' "$file"
  
  # Replace direct import from view hooks with infrastructure export
  sed -i '' 's/import { \([a-zA-Z0-9, ]*\) } from "..\/..\/..\/infrastructure\/database\/view-hooks"/import { \1 } from "..\/..\/..\/infrastructure\/database"/g' "$file"
done

echo "Import updates completed!"