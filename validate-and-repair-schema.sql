-- Schema Validation and Repair Tool
-- This script checks your database state and provides repair commands

-- 1. Check missing tables and provide creation commands
SELECT 'MISSING TABLES CHECK' as section, 'Checking for missing tables...' as info;

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    repair_sql TEXT := '';
BEGIN
    -- Check each required table
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        missing_tables := array_append(missing_tables, 'workspaces');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
        missing_tables := array_append(missing_tables, 'workspace_members');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        missing_tables := array_append(missing_tables, 'customers');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parts') THEN
        missing_tables := array_append(missing_tables, 'parts');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'labor_items') THEN
        missing_tables := array_append(missing_tables, 'labor_items');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') THEN
        missing_tables := array_append(missing_tables, 'jobs');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes') THEN
        missing_tables := array_append(missing_tables, 'quotes');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        missing_tables := array_append(missing_tables, 'invoices');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_events') THEN
        missing_tables := array_append(missing_tables, 'sync_events');
    END IF;
    
    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️ MISSING TABLES: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE '🔧 REPAIR: Run the 01-tables-only.sql script to create missing tables';
    ELSE
        RAISE NOTICE '✅ ALL TABLES EXIST';
    END IF;
END $$;

-- 2. Check missing indexes
SELECT 'MISSING INDEXES CHECK' as section, 'Checking for missing indexes...' as info;

DO $$
DECLARE
    expected_indexes TEXT[] := ARRAY[
        'idx_workspace_members_workspace_id',
        'idx_customers_workspace_id', 
        'idx_parts_workspace_id',
        'idx_labor_items_workspace_id',
        'idx_jobs_workspace_id',
        'idx_jobs_customer_id',
        'idx_quotes_workspace_id',
        'idx_quotes_job_id',
        'idx_invoices_workspace_id',
        'idx_invoices_job_id',
        'idx_sync_events_workspace_id',
        'idx_sync_events_created_at'
    ];
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    idx TEXT;
BEGIN
    FOREACH idx IN ARRAY expected_indexes
    LOOP
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = idx AND schemaname = 'public') THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE NOTICE '⚠️ MISSING INDEXES: %', array_to_string(missing_indexes, ', ');
        RAISE NOTICE '🔧 REPAIR: Run the 02-indexes-and-performance.sql script';
    ELSE
        RAISE NOTICE '✅ ALL INDEXES EXIST';
    END IF;
END $$;

-- 3. Check missing triggers
SELECT 'MISSING TRIGGERS CHECK' as section, 'Checking for missing triggers...' as info;

DO $$
DECLARE
    expected_triggers TEXT[] := ARRAY[
        'update_workspaces_updated_at',
        'update_workspace_members_updated_at',
        'update_customers_updated_at', 
        'update_parts_updated_at',
        'update_labor_items_updated_at',
        'update_jobs_updated_at',
        'update_quotes_updated_at',
        'update_invoices_updated_at'
    ];
    missing_triggers TEXT[] := ARRAY[]::TEXT[];
    trig TEXT;
BEGIN
    FOREACH trig IN ARRAY expected_triggers
    LOOP
        IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = trig AND trigger_schema = 'public') THEN
            missing_triggers := array_append(missing_triggers, trig);
        END IF;
    END LOOP;
    
    IF array_length(missing_triggers, 1) > 0 THEN
        RAISE NOTICE '⚠️ MISSING TRIGGERS: %', array_to_string(missing_triggers, ', ');
        RAISE NOTICE '🔧 REPAIR: Run the 03-triggers-and-functions.sql script';
    ELSE
        RAISE NOTICE '✅ ALL TRIGGERS EXIST';
    END IF;
END $$;

-- 4. Check RLS and policies
SELECT 'SECURITY CHECK' as section, 'Checking Row Level Security...' as info;

DO $$
DECLARE
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
    expected_tables TEXT[] := ARRAY['workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events'];
    tbl TEXT;
    missing_policies INTEGER := 0;
BEGIN
    -- Check RLS enabled
    FOREACH tbl IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename = tbl 
              AND rowsecurity = true
        ) THEN
            tables_without_rls := array_append(tables_without_rls, tbl);
        END IF;
    END LOOP;
    
    -- Count policies
    SELECT COUNT(*) INTO missing_policies
    FROM (SELECT unnest(expected_tables)) AS t(tablename)
    WHERE NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = t.tablename
    );
    
    IF array_length(tables_without_rls, 1) > 0 OR missing_policies > 0 THEN
        IF array_length(tables_without_rls, 1) > 0 THEN
            RAISE NOTICE '⚠️ TABLES WITHOUT RLS: %', array_to_string(tables_without_rls, ', ');
        END IF;
        IF missing_policies > 0 THEN
            RAISE NOTICE '⚠️ MISSING POLICIES: % tables without policies', missing_policies;
        END IF;
        RAISE NOTICE '🔧 REPAIR: Run the 04-security-policies.sql script';
    ELSE
        RAISE NOTICE '✅ ROW LEVEL SECURITY PROPERLY CONFIGURED';
    END IF;
END $$;

-- 5. Final recommendation
SELECT 'FINAL RECOMMENDATION' as section, 'Overall database status:' as info;

DO $$
DECLARE
    total_tables INTEGER;
    total_indexes INTEGER;
    total_triggers INTEGER;
    total_policies INTEGER;
    status TEXT;
BEGIN
    -- Count existing components
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_name IN ('workspaces', 'workspace_members', 'customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices', 'sync_events')
      AND table_schema = 'public';
    
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO total_triggers
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' AND trigger_name LIKE '%updated_at%';
    
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Determine status
    IF total_tables = 9 AND total_indexes >= 12 AND total_triggers >= 8 AND total_policies >= 9 THEN
        status := '✅ COMPLETE: Database is fully set up and ready!';
    ELSIF total_tables = 9 THEN
        status := '⚠️ PARTIAL: Tables exist, but missing performance features. Run remaining scripts.';
    ELSIF total_tables > 0 THEN
        status := '⚠️ INCOMPLETE: Some tables missing. Run supabase-schema-safe.sql for complete setup.';
    ELSE
        status := '❌ EMPTY: No tables found. Run supabase-schema-safe.sql to set up database.';
    END IF;
    
    RAISE NOTICE 'TABLES: %/9, INDEXES: %/12, TRIGGERS: %/8, POLICIES: %/9', 
        total_tables, total_indexes, total_triggers, total_policies;
    RAISE NOTICE '%', status;
    
    IF total_tables = 9 AND total_indexes >= 12 AND total_triggers >= 8 AND total_policies >= 9 THEN
        RAISE NOTICE '🎉 Your app should now work with full sync capabilities!';
    END IF;
END $$;