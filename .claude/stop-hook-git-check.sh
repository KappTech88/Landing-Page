#!/bin/bash
# Stop Hook - Auto-generates git log summary after session
# Creates a summary of changes made during this branch/session

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
    exit 0
fi

# Only run for claude/ branches
if [[ ! "$BRANCH" =~ ^claude/ ]]; then
    exit 0
fi

SUMMARY_FILE="$REPO_ROOT/.claude/BRANCH_SUMMARY.md"

# Get commits on this branch not in main
COMMITS=$(git log main..$BRANCH --oneline 2>/dev/null)

if [ -z "$COMMITS" ]; then
    exit 0
fi

# Generate summary
cat > "$SUMMARY_FILE" << EOF
# Branch Summary: $BRANCH

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Author:** Claude (AI Coder)

---

## Commits

\`\`\`
$(git log main..$BRANCH --oneline 2>/dev/null)
\`\`\`

## Detailed Changes

$(git log main..$BRANCH --pretty=format:'### %s%n%n%b%n---' 2>/dev/null)

## Files Changed

\`\`\`
$(git diff --stat main..$BRANCH 2>/dev/null)
\`\`\`
EOF

# Stage the summary
git add "$SUMMARY_FILE" 2>/dev/null

echo "Branch summary updated: $SUMMARY_FILE"
exit 0
