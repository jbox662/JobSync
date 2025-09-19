-- Fix quotes table to allow quotes without jobs
-- This allows standalone quotes that aren't linked to specific jobs

-- Make job_id nullable in quotes table
ALTER TABLE quotes ALTER COLUMN job_id DROP NOT NULL;

-- Make job_id nullable in invoices table (for consistency)
ALTER TABLE invoices ALTER COLUMN job_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- (PostgreSQL foreign keys automatically allow NULL values when the column is nullable)

-- This enables:
-- 1. Standalone quotes (not linked to jobs)
-- 2. Standalone invoices (not linked to jobs)  
-- 3. Quotes/invoices can still be linked to jobs when needed
