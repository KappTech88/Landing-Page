# Database Setup Guide

## Prerequisites

- Docker installed (for local Supabase)
- Node.js 18+ installed
- Supabase CLI installed: `npm install -g supabase`
- PostgreSQL client (optional, for manual queries)

## Local Setup

### 1. Initialize Supabase

```bash
cd /home/user/Landing-Page

# Initialize Supabase project
supabase init

# This creates /supabase folder with config
```

### 2. Start Local Supabase

```bash
# Start Docker containers (Postgres, Auth, Storage, etc.)
supabase start

# Note the output:
# - API URL: http://localhost:54321
# - anon key: eyJ...
# - service_role key: eyJ...
# - Database URL: postgresql://postgres:postgres@localhost:54322/postgres
```

### 3. Apply Schema Migrations

```bash
# Copy schema files to migrations folder
cp database/schemas/*.sql supabase/migrations/

# Rename for proper ordering
cd supabase/migrations
mv ../../database/schemas/001-init.sql 20250101000001_init.sql
mv ../../database/schemas/002-claims.sql 20250101000002_claims.sql
mv ../../database/schemas/003-estimates.sql 20250101000003_estimates.sql
mv ../../database/schemas/004-photos.sql 20250101000004_photos.sql
mv ../../database/schemas/005-invoices.sql 20250101000005_invoices.sql
mv ../../database/schemas/006-insurers.sql 20250101000006_insurers.sql
mv ../../database/schemas/007-status-history.sql 20250101000007_status_history.sql
mv ../../database/schemas/008-rls-policies.sql 20250101000008_rls_policies.sql

cd ../..

# Reset database and apply all migrations
supabase db reset
```

### 4. Verify Schema

```bash
# List all tables
supabase db list

# Test a query
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 5. Seed Initial Data

```bash
# Apply seed data
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f database/examples/seed-data.sql
```

## Remote Production Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create new project
3. Note down:
   - Project URL
   - anon (public) key
   - service_role (secret) key

### 2. Link Local to Remote

```bash
# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF

# Get project ref from Supabase dashboard URL:
# https://app.supabase.com/project/YOUR_PROJECT_REF
```

### 3. Push Schema to Remote

```bash
# Push all migrations to remote
supabase db push
```

### 4. Verify Remote

```bash
# Check remote database
supabase db remote list
```

## Vercel Environment Setup

Add these environment variables in Vercel dashboard:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key

# Server-side only (NOT prefixed with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Secret service role key
DATABASE_URL=postgresql://...  # Direct database connection (optional)

# Google Workspace OAuth (for email integration)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

## Generate TypeScript Types

```bash
# Generate types from schema
supabase gen types typescript --local > types/database.ts

# For remote
supabase gen types typescript > types/database.ts
```

## Testing RLS Policies

```sql
-- Connect to database
psql postgresql://postgres:postgres@localhost:54322/postgres

-- Set role as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'USER_UUID_HERE';

-- Test queries (should only see data in user's org)
SELECT * FROM claims;
SELECT * FROM estimates;

-- Reset
RESET ROLE;
RESET request.jwt.claim.sub;
```

## Common Commands

```bash
# Start/Stop Local Supabase
supabase start
supabase stop

# Reset database (WARNING: Deletes all data)
supabase db reset

# Create new migration
supabase migration new migration_name

# Show migration status
supabase migration list

# Pull remote changes
supabase db pull

# Generate types
supabase gen types typescript --local > types/database.ts
```

## Troubleshooting

### Port Conflicts

If ports 54321, 54322 are in use:

```bash
# Stop Supabase
supabase stop

# Kill processes on ports
lsof -ti:54321 | xargs kill -9
lsof -ti:54322 | xargs kill -9

# Restart
supabase start
```

### Migration Errors

```bash
# Check migration status
supabase migration list

# Fix migration
supabase migration repair --status applied 20250101000001

# Reset and try again
supabase db reset
```

### RLS Issues

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- List policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Disable RLS temporarily (DEVELOPMENT ONLY)
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
```

## Next Steps

1. ✅ Local Supabase running
2. ✅ Schema applied
3. ✅ Seed data loaded
4. ✅ Types generated
5. → Set up authentication
6. → Configure storage buckets
7. → Test API routes
8. → Deploy to production
