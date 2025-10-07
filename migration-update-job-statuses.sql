-- Migration: Update job status constraint to support new workflow statuses
-- Date: 2025-10-07
-- Description: Adds new job statuses for better workflow management

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

-- Update any existing jobs with 'active' status to 'not-started' if they were just created
-- (This is optional - you may want to keep existing active jobs as active)
-- UPDATE jobs SET status = 'not-started' WHERE status = 'active' AND created_at > NOW() - INTERVAL '1 day';

-- Verify the constraint was applied
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'jobs_status_check';
