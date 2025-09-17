-- Database State Assessment for Supabase Job Manager Schema
-- Copy and paste this into Supabase SQL Editor to check current state

-- Check which tables exist
SELECT 'TABLES STATUS' as category, 'Checking existing tables...' as info;

SELECT 
  'workspaces' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'workspace_members' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspace_members') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'customers' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'parts' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parts') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'labor_items' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'labor_items') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'jobs' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'quotes' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'invoices' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'sync_events' as table_name,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_events') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check indexes
SELECT 'INDEXES STATUS' as category, 'Checking performance indexes...' as info;

SELECT 
  indexname as index_name,
  tablename as table_name,
  '✅ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check Row Level Security status
SELECT 'RLS STATUS' as category, 'Checking Row Level Security...' as info;

SELECT 
  tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events')
ORDER BY tablename;

-- Check policies
SELECT 'POLICIES STATUS' as category, 'Checking RLS policies...' as info;

SELECT 
  tablename as table_name,
  policyname as policy_name,
  '✅ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers
SELECT 'TRIGGERS STATUS' as category, 'Checking update triggers...' as info;

SELECT 
  event_object_table as table_name,
  trigger_name,
  '✅ EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- Check functions
SELECT 'FUNCTIONS STATUS' as category, 'Checking database functions...' as info;

SELECT 
  routinename as function_name,
  '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routinename = 'update_updated_at_column';

-- Summary count
SELECT 'SUMMARY' as category, 'Database setup completion status:' as info;

SELECT 
  'Tables' as component,
  COUNT(*) as total_expected,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name IN ('workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events')
   AND table_schema = 'public') as actual_count,
  CASE WHEN (SELECT COUNT(*) FROM information_schema.tables 
             WHERE table_name IN ('workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events')
             AND table_schema = 'public') = 9 
    THEN '✅ COMPLETE' ELSE '⚠️ INCOMPLETE' END as status
FROM (SELECT unnest(ARRAY['workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events']) as expected) t
UNION ALL
SELECT 
  'Indexes' as component,
  12 as total_expected,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as actual_count,
  CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') >= 12
    THEN '✅ COMPLETE' ELSE '⚠️ INCOMPLETE' END as status
UNION ALL
SELECT 
  'RLS Policies' as component,
  9 as total_expected,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as actual_count,
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 9
    THEN '✅ COMPLETE' ELSE '⚠️ INCOMPLETE' END as status
UNION ALL
SELECT 
  'Triggers' as component,
  8 as total_expected,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_schema = 'public' AND trigger_name LIKE '%updated_at%') as actual_count,
  CASE WHEN (SELECT COUNT(*) FROM information_schema.triggers 
             WHERE trigger_schema = 'public' AND trigger_name LIKE '%updated_at%') >= 8
    THEN '✅ COMPLETE' ELSE '⚠️ INCOMPLETE' END as status;

-- Final recommendation
SELECT 
  'RECOMMENDATION' as category,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name IN ('workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events')
          AND table_schema = 'public') = 9
    THEN '✅ Database is ready! Your app should work correctly.'
    ELSE '⚠️ Run the supabase-schema-safe.sql script to complete setup.'
  END as recommendation;