#!/bin/bash
# Pre-Bash Hook - Enforces version control rules
# RULE: Never merge branches with main - only the user will do that

TOOL_INPUT="$1"

# Block any git merge to main/master
if echo "$TOOL_INPUT" | grep -qiE "git\s+(merge|rebase).*\s+(main|master)"; then
    echo "BLOCKED: Merging to main/master is not allowed."
    echo "RULE: Only the repository owner can merge branches to main."
    echo "Please create a Pull Request instead."
    exit 1
fi

# Block git checkout main followed by merge
if echo "$TOOL_INPUT" | grep -qiE "git\s+checkout\s+(main|master)\s*&&.*merge"; then
    echo "BLOCKED: Merging to main/master is not allowed."
    echo "RULE: Only the repository owner can merge branches to main."
    exit 1
fi

# Block git push to main with force
if echo "$TOOL_INPUT" | grep -qiE "git\s+push.*(-f|--force).*\s+(main|master)"; then
    echo "BLOCKED: Force pushing to main/master is not allowed."
    exit 1
fi

# Block direct push to main (allow only feature branches)
if echo "$TOOL_INPUT" | grep -qiE "git\s+push\s+(origin\s+)?(main|master)(\s|$)"; then
    echo "BLOCKED: Direct push to main/master is not allowed."
    echo "RULE: Only the repository owner can push to main."
    exit 1
fi

exit 0
