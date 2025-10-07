-- Migration: Add name column to labor_items table
-- Date: 2025-10-07
-- Description: Adds a name column to labor_items table to separate name from description

-- Add the name column to labor_items table
ALTER TABLE labor_items ADD COLUMN name TEXT;

-- Update existing records to use description as name (temporary)
UPDATE labor_items SET name = description WHERE name IS NULL;

-- Make the name column NOT NULL after populating it
ALTER TABLE labor_items ALTER COLUMN name SET NOT NULL;

-- Update the description column to be nullable since it's now optional
ALTER TABLE labor_items ALTER COLUMN description DROP NOT NULL;

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'labor_items' 
AND column_name IN ('name', 'description')
ORDER BY column_name;
