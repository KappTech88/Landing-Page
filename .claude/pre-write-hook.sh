#!/bin/bash
# Pre-Write Hook - Enforces data protection rules
# RULE: Always ask before creating a new dataset

TOOL_INPUT="$1"

# Patterns that indicate new data/dataset creation
DATA_PATTERNS=(
    "schema"
    "migration"
    "seed"
    "fixture"
    "dataset"
    "data.json"
    "data.ts"
    "types.ts"
    ".sql"
    "database/"
    ".env"
)

# Check if creating new data-related files
for pattern in "${DATA_PATTERNS[@]}"; do
    if echo "$TOOL_INPUT" | grep -qi "$pattern"; then
        echo "BLOCKED: Creating new data file requires user approval."
        echo "RULE: Always ask before creating a new dataset."
        echo "Pattern matched: $pattern"
        echo ""
        echo "Please ask the user for permission before creating this file."
        exit 1
    fi
done

exit 0
