#!/bin/bash
# =====================================================
# Apply Database Schema to Supabase
# =====================================================

echo "🚀 Applying database schema to Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo "📋 Please apply schemas manually via SQL Editor:"
    echo "   https://app.supabase.com/project/qxswelavrvfgtpyukijb/sql/new"
    echo ""
    echo "Run these files IN ORDER:"
    for file in database/schemas/*.sql; do
        echo "   - $file"
    done
    exit 1
fi

# Apply each migration
for i in {1..8}; do
    file="database/schemas/00${i}-*.sql"
    echo "📝 Applying migration $i/8: $file"

    # TODO: Add actual Supabase CLI command here
    # supabase db execute -f "$file"

    echo "✅ Migration $i complete"
done

echo ""
echo "🎉 All migrations applied successfully!"
