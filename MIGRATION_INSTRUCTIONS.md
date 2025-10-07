# Database Migration: Job Status Update

## Problem
The application now supports 8 job statuses but the database constraint only allows 4 old statuses, causing this error:
```
❌ pushChanges failed: Error: Failed to update jobs: new row for relation "jobs" violates check constraint "jobs_status_check"
```

## Solution
Run the migration script to update the database constraint.

## Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migration-update-job-statuses.sql`
4. Click **Run** to execute the migration

### Option 2: Command Line (if you have psql access)
```bash
psql -h your-supabase-host -U postgres -d postgres -f migration-update-job-statuses.sql
```

### Option 3: Manual SQL Execution
Execute these commands in your Supabase SQL editor:

```sql
-- Drop the existing check constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add the new check constraint with all workflow statuses
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
  CHECK (status IN (
    'not-started', 
    'waiting-quote', 
    'quote-sent', 
    'quote-approved', 
    'active', 
    'on-hold', 
    'completed', 
    'cancelled'
  ));
```

## Verification
After running the migration, verify it worked by checking the constraint:
```sql
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'jobs_status_check';
```

## New Job Status Workflow
- **not-started** - Default status for new jobs
- **waiting-quote** - Job needs pricing/estimation  
- **quote-sent** - Quote has been sent to customer
- **quote-approved** - Customer approved the quote
- **active** - Work is in progress
- **on-hold** - Temporarily paused
- **completed** - Job finished successfully
- **cancelled** - Job was cancelled

## Files Updated
- ✅ `migration-update-job-statuses.sql` - Migration script
- ✅ `supabase-schema.sql` - Updated schema
- ✅ `supabase-schema-production.sql` - Updated production schema
- ✅ `supabase-schema-safe.sql` - Updated safe schema
- ✅ `01-tables-only.sql` - Updated table definitions
- ✅ Application code - All status handling updated
