-- =====================================================
-- DATABASE HEALTH CHECK
-- Run this to verify your setup is working correctly
-- =====================================================

-- Check all tables exist (should return 24 tables)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify system roles exist (should return 5 roles)
SELECT id, name, display_name, is_system_role 
FROM roles 
WHERE is_system_role = true
ORDER BY name;

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Verify helper functions exist
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

SELECT '✅ Database health check complete!' AS status;
