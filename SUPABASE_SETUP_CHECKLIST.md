# ✅ Supabase Setup Checklist

## Current Status
- ✅ **Local environment configured** (.env.local updated)
- ⏳ **Database schema** (needs to be applied)
- ⏳ **Storage buckets** (need to be created)
- ⏳ **Vercel environment variables** (need to be set)
- ⏳ **Test connection** (after schema is applied)

---

## 📋 STEP-BY-STEP GUIDE

### ✅ STEP 1: Local Environment (COMPLETE)
Your `.env.local` is configured with:
- Project URL: `https://qxswelavrvfgtpyukijb.supabase.co`
- Anon Key: Configured ✓

---

### 🗄️ STEP 2: Apply Database Schema

#### Option A: Manual (Recommended - Most Reliable)

1. **Open Supabase SQL Editor**:
   - https://app.supabase.com/project/qxswelavrvfgtpyukijb/sql/new

2. **Run Each File IN ORDER** (copy entire file → paste → run):

   ```
   ✓ database/schemas/001-init.sql          (Organizations, Users, Roles)
   ✓ database/schemas/002-claims.sql        (Claims, Properties)
   ✓ database/schemas/003-estimates.sql     (Estimates, Line Items)
   ✓ database/schemas/004-photos.sql        (Photos, Documents)
   ✓ database/schemas/005-invoices.sql      (Invoices, Payments)
   ✓ database/schemas/006-insurers.sql      (Insurance Companies)
   ✓ database/schemas/007-status-history.sql (Audit Trail)
   ✓ database/schemas/008-rls-policies.sql  (Security Policies)
   ```

3. **Verify Success**:
   - Each file should show "Success" in green
   - Check **Table Editor** - you should see 20+ tables

#### Option B: Copy-Paste Friendly

Open each file in your code editor, select all (Cmd/Ctrl+A), copy, paste into SQL Editor, run.

---

### 📦 STEP 3: Create Storage Buckets

1. **Go to Storage**:
   - https://app.supabase.com/project/qxswelavrvfgtpyukijb/storage/buckets

2. **Create First Bucket**:
   - Click **New Bucket**
   - Name: `claim-photos`
   - Public bucket: **✅ YES**
   - File size limit: `52428800` (50 MB)
   - Allowed MIME types: `image/*`
   - Click **Save**

3. **Create Second Bucket**:
   - Click **New Bucket**
   - Name: `claim-documents`
   - Public bucket: **❌ NO** (private)
   - File size limit: `52428800` (50 MB)
   - Allowed MIME types: Leave empty (all types)
   - Click **Save**

---

### ☁️ STEP 4: Configure Vercel Environment Variables

1. **Go to Vercel Dashboard**:
   - https://vercel.com/dashboard
   - Select your project: **Landing-Page**

2. **Go to Settings → Environment Variables**

3. **Add These Variables**:

   ```bash
   VITE_SUPABASE_URL
   Value: https://qxswelavrvfgtpyukijb.supabase.co
   Environments: Production, Preview, Development

   VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTc4OTMsImV4cCI6MjA3OTU5Mzg5M30.YH0Kxil6gSKLak4oRqW7ihrpQEtnj-sKLlyx8Dac4HA
   Environments: Production, Preview, Development
   ```

4. **Click Save** for each

5. **Redeploy** (optional - will use new variables on next deploy)

---

### 🧪 STEP 5: Test Your Setup

#### A. Install Dependencies (if not already done)

```bash
npm install
```

#### B. Start Development Server

```bash
npm run dev
```

#### C. Test Connection

Open browser to `http://localhost:5173`

**Test 1: Check Console**
- Open Developer Console (F12)
- Should see NO Supabase credential warnings
- Should see connection established

**Test 2: Try Login Page**
- Go to Portal Login
- The yellow "Setup Required" banner should still show (because auth code is commented)
- No console errors = good!

**Test 3: Check Database Connection**

Open browser console and paste:

```javascript
// Test Supabase connection
const { createClient } = await import('/@modules/@supabase/supabase-js');
const supabase = createClient(
  'https://qxswelavrvfgtpyukijb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTc4OTMsImV4cCI6MjA3OTU5Mzg5M30.YH0Kxil6gSKLak4oRqW7ihrpQEtnj-sKLlyx8Dac4HA'
);
const { data, error } = await supabase.from('organizations').select('count');
console.log('Connection test:', data, error);
```

Should see: `Connection test: [{count: 0}] null` (or similar)

---

### 🔓 STEP 6: Enable Authentication (Optional - After Testing)

Once database is working, uncomment the auth code:

1. **In `components/PortalLogin.tsx`** (lines 32-40):
   ```typescript
   // Remove the /* and */ to uncomment this:
   const { session, user } = await signIn(formData.email, formData.password);
   if (session && user) {
     window.location.href = '/dashboard';
   }
   ```

2. **Remove the temporary error** (line 43):
   ```typescript
   // DELETE this line:
   setError('Supabase authentication not configured yet...');
   ```

3. **Create a test user** in Supabase:
   - Go to **Authentication** → **Users**
   - Click **Add User**
   - Email: `admin@estimatereliance.com`
   - Password: (set a password)
   - Auto-confirm: ✅ YES
   - Click **Create User**

4. **Test login!**

---

### 🎯 STEP 7: Enable Claim Submission (Optional)

In `components/ClaimSubmission.tsx` (lines 134-183):

1. **Uncomment the import**:
   ```typescript
   import { createClaim } from '../lib/supabase';
   ```

2. **Uncomment the claim creation code**

3. **Update the organization_id**:
   - Replace `'TEMP_ORG_ID'` with your actual org ID
   - Or create a default org first

---

## 🐛 Troubleshooting

### "relation does not exist"
- Schema not applied correctly
- Re-run the migration that failed
- Check for error messages in SQL Editor

### "Invalid API key"
- Check `.env.local` has correct VITE_SUPABASE_ANON_KEY
- Restart dev server (`npm run dev`)

### "Row Level Security" error
- RLS policies not applied (migration 008)
- Re-run `database/schemas/008-rls-policies.sql`

### Console shows "Supabase credentials not configured"
- Check `.env.local` exists and has values
- Restart dev server
- Clear browser cache

---

## 📊 What You'll Have After Setup

✅ **30+ database tables** ready for data
✅ **Multi-tenant architecture** with organizations
✅ **Row Level Security** protecting your data
✅ **User authentication** via Supabase Auth
✅ **File storage** for photos and documents
✅ **Auto-calculating** estimates and invoices
✅ **Audit trail** for all changes
✅ **Type-safe** TypeScript interfaces

---

## 🎉 Next Steps After Setup

1. Create your first organization
2. Add test users with different roles
3. Submit a test claim
4. Upload test photos
5. Create an estimate
6. Begin Next.js migration

---

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Schema Reference**: `database/docs/README-for-AI.md`
- **Setup Guide**: `database/docs/SETUP.md`
- **Migration Plan**: `database/docs/NEXTJS_MIGRATION_PLAN.md`

---

**Current Status**: Step 2 - Apply Database Schema
**Next Step**: Copy `database/schemas/001-init.sql` into Supabase SQL Editor and run it!
