#!/bin/bash
# Pre-Edit Hook - Enforces data protection rules
# RULE: No changing data variables - always ask before creating new datasets

TOOL_INPUT="$1"

# List of protected data files and patterns
PROTECTED_PATTERNS=(
    ".env.local"
    ".env.production"
    "database/schemas/"
    "types.ts"
    "supabase.ts"
    "seed"
    "migration"
)

# Check if editing protected data files
for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$TOOL_INPUT" | grep -qi "$pattern"; then
        echo "WARNING: You are attempting to edit a protected data file."
        echo "RULE: No changing data variables without explicit user approval."
        echo "Pattern matched: $pattern"
        echo ""
        echo "Please confirm with the user before proceeding."
        # Note: This warns but doesn't block - change exit 0 to exit 1 to block
        exit 0
    fi
done

# Check for changes to data-related variables/constants
if echo "$TOOL_INPUT" | grep -qiE "(SUPABASE_|DATABASE_|DB_|API_KEY|SECRET|CREDENTIALS)"; then
    echo "WARNING: Detected changes to data/credential variables."
    echo "RULE: Always ask the user before modifying data configurations."
    exit 0
fi

exit 0
