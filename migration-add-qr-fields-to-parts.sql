-- Migration: Add QR Code Detection Fields to Parts Table
-- This migration adds the brand and low_stock_threshold columns needed for QR code scanning
-- Run this in your Supabase SQL Editor

-- Add brand column to parts table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parts' AND column_name = 'brand'
  ) THEN
    ALTER TABLE parts ADD COLUMN brand TEXT;
    COMMENT ON COLUMN parts.brand IS 'Brand name from QR code scanning';
  END IF;
END $$;

-- Add low_stock_threshold column to parts table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parts' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE parts ADD COLUMN low_stock_threshold INTEGER DEFAULT 0;
    COMMENT ON COLUMN parts.low_stock_threshold IS 'Alert threshold when stock falls below this value';
  END IF;
END $$;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parts' 
  AND column_name IN ('brand', 'low_stock_threshold')
ORDER BY column_name;

-- Success message
SELECT 'SUCCESS: Parts table updated with QR code fields (brand, low_stock_threshold)' as status;

