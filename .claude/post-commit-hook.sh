#!/bin/bash
# Post-Commit Hook - Auto-updates branch notes after each commit
# Runs after Bash tool when git commit is detected

TOOL_INPUT="$1"
REPO_ROOT="/home/user/Landing-Page"
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)

# Only process git commit commands
if ! echo "$TOOL_INPUT" | grep -qiE "git\s+commit"; then
    exit 0
fi

# Only run for claude/ branches
if [[ ! "$BRANCH" =~ ^claude/ ]]; then
    exit 0
fi

NOTES_FILE="$REPO_ROOT/.claude/BRANCH_NOTES.md"

# Get latest commit info
LATEST_HASH=$(git -C "$REPO_ROOT" log -1 --format='%h' 2>/dev/null)
LATEST_MSG=$(git -C "$REPO_ROOT" log -1 --format='%s' 2>/dev/null)
LATEST_TIME=$(git -C "$REPO_ROOT" log -1 --format='%ci' 2>/dev/null)
FILES_CHANGED=$(git -C "$REPO_ROOT" diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | head -10)

# Create or update notes file
if [ ! -f "$NOTES_FILE" ]; then
    cat > "$NOTES_FILE" << EOF
# Branch Notes: $BRANCH

**Created:** $(date '+%Y-%m-%d %H:%M:%S')
**Author:** Claude (AI Coder)

---

## Change Log

EOF
fi

# Append latest commit to notes
cat >> "$NOTES_FILE" << EOF
### $LATEST_TIME
**Commit:** \`$LATEST_HASH\` - $LATEST_MSG

**Files:**
\`\`\`
$FILES_CHANGED
\`\`\`

---

EOF

echo "Branch notes updated: $NOTES_FILE"
exit 0
