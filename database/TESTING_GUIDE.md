# 🧪 Database Testing Guide

Complete guide for testing your CRM database setup and populating it with data.

---

## ✅ Step 1: Health Check (Verify Setup)

Run this in **Supabase SQL Editor** to verify everything is working:

```sql
-- File: database/test-database.sql
```

**Expected Results:**
- ✅ 24 tables created
- ✅ 5 system roles (super_admin, admin, contractor, estimator, client)
- ✅ All tables have RLS enabled
- ✅ ~15 helper functions created

---

## 🔑 Step 2: Get Your User ID

Before populating data, you need your Supabase Auth user ID:

### Option A: Create User via Supabase Dashboard
1. Go to: **Authentication** → **Users** → **Add User**
2. Email: `admin@acmerestoration.com`
3. Password: (set a password)
4. ✅ **Auto Confirm User**: Check this box
5. Click **Create User**
6. **Copy the User ID** (UUID format)

### Option B: Use Existing User
1. Go to: **Authentication** → **Users**
2. Click on your user
3. **Copy the ID** from the top of the page

---

## 🌱 Step 3: Populate Test Data

1. **Open** `database/seed-test-data.sql`

2. **Replace ALL occurrences** of `YOUR_USER_ID_HERE` with your actual user ID:
   ```sql
   -- Find this:
   'YOUR_USER_ID_HERE'::uuid

   -- Replace with (example):
   '123e4567-e89b-12d3-a456-426614174000'::uuid
   ```

3. **Run the entire file** in Supabase SQL Editor

4. **Verify** the results at the bottom - you should see:
   - 1 organization (Acme Restoration Services)
   - 1 user with admin role
   - 2 sample claims with properties
   - 1 insurance company with adjuster

---

## 🔌 Step 4: Test API Connection

### Local Testing

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Visit the test endpoint**:
   ```
   http://localhost:3000/api/test-db
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "message": "✅ Database connection successful!",
     "data": {
       "organizations": {
         "count": 1,
         "items": [...]
       },
       "roles": {
         "count": 5,
         "items": [...]
       },
       "claims": {
         "count": 2
       }
     }
   }
   ```

### Production Testing

After deploying to Vercel:
```
https://your-app.vercel.app/api/test-db
```

---

## 🔐 Step 5: Test RLS Policies

### Test as Authenticated User

Run this in Supabase SQL Editor:

```sql
-- Simulate being logged in as your user
SET request.jwt.claim.sub = 'YOUR_USER_ID_HERE';

-- Try to query claims (should see your org's claims only)
SELECT
    claim_number,
    claim_type,
    status,
    estimated_total
FROM claims;

-- Try to query other orgs (should return empty)
SELECT * FROM claims
WHERE organization_id != (
    SELECT organization_id
    FROM user_organization_roles
    WHERE user_id = auth.uid()
    LIMIT 1
);

-- Reset
RESET request.jwt.claim.sub;
```

**Expected Results:**
- ✅ You can see claims from YOUR organization
- ✅ You CANNOT see claims from other organizations
- ✅ RLS is working correctly!

---

## 📊 Step 6: Verify Data in UI

### Using Supabase Table Editor

1. Go to: **Table Editor** in Supabase Dashboard
2. Browse these tables:
   - `organizations` - Should see Acme Restoration
   - `users` - Should see your user
   - `user_organization_roles` - Should see the link
   - `claims` - Should see 2 claims
   - `properties` - Should see 2 properties
   - `insurance_companies` - Should see State Farm

### Using SQL Queries

```sql
-- Get organization summary
SELECT
    o.name,
    o.subscription_tier,
    COUNT(DISTINCT c.id) as total_claims,
    COUNT(DISTINCT u.id) as total_users
FROM organizations o
LEFT JOIN claims c ON c.organization_id = o.id
LEFT JOIN user_organization_roles uor ON uor.organization_id = o.id
LEFT JOIN users u ON u.id = uor.user_id
WHERE o.slug = 'acme-restoration'
GROUP BY o.id, o.name, o.subscription_tier;

-- Get claims with properties
SELECT
    c.claim_number,
    c.claim_type,
    c.status,
    c.priority,
    c.estimated_total,
    p.owner_full_name,
    p.full_address
FROM claims c
LEFT JOIN properties p ON p.claim_id = c.id
ORDER BY c.created_at DESC;
```

---

## 🚨 Troubleshooting

### Issue: "permission denied for table claims"
**Solution**: RLS policies are working! You need to be authenticated. Make sure you're logged in via Supabase Auth.

### Issue: "No data returned"
**Solution**:
1. Check that you replaced `YOUR_USER_ID_HERE` in seed script
2. Verify user is linked to organization in `user_organization_roles`
3. Run the verification queries at the bottom of `seed-test-data.sql`

### Issue: "relation does not exist"
**Solution**: Schema wasn't applied. Run `database/COMPLETE_SCHEMA.sql` first.

### Issue: API endpoint returns 500 error
**Solution**:
1. Check `.env.local` has correct Supabase credentials
2. Verify environment variables are set in Vercel
3. Check Vercel deployment logs for specific error

---

## 🎯 Next Steps

Once testing is complete:

1. **✅ Database working** - Schema and RLS verified
2. **✅ Test data populated** - Sample claims and organizations
3. **✅ API connection working** - Can query from Next.js

### Ready to build features!

Now you can:
- Build the Claims Dashboard UI
- Create Estimate Forms
- Add Photo Upload functionality
- Implement Invoice Generation
- Set up User Management

---

## 📚 Additional Test Queries

### Create Additional Test Users

```sql
-- Add a contractor user
INSERT INTO users (id, email, first_name, last_name)
VALUES (
    'NEW_USER_ID_HERE'::uuid,
    'contractor@acmerestoration.com',
    'John',
    'Contractor'
);

-- Link to organization as Contractor
INSERT INTO user_organization_roles (user_id, organization_id, role_id)
VALUES (
    'NEW_USER_ID_HERE'::uuid,
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    (SELECT id FROM roles WHERE name = 'contractor')
);
```

### Create More Test Claims

```sql
-- Quick claim creation template
INSERT INTO claims (
    organization_id,
    claim_number,
    created_by,
    claim_type,
    status,
    date_of_loss,
    estimated_total,
    description
) VALUES (
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'CLM-2025-003',
    'YOUR_USER_ID_HERE'::uuid,
    'fire',
    'open',
    CURRENT_DATE,
    25000.00,
    'Kitchen fire damage - smoke and heat damage throughout home'
);
```

---

## ✅ Testing Checklist

- [ ] Health check shows 24 tables
- [ ] System roles created (5 roles)
- [ ] RLS enabled on all tables
- [ ] User created in Supabase Auth
- [ ] User ID copied and replaced in seed script
- [ ] Seed data script executed successfully
- [ ] Organization visible in table editor
- [ ] Claims visible with properties
- [ ] API test endpoint returns success
- [ ] RLS policies prevent cross-organization access
- [ ] Can query data via Supabase client
- [ ] Ready to build application features! 🚀
