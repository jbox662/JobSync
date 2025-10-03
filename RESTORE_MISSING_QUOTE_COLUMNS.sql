-- Migration: Add missing enhanced quote fields to quotes table
-- These fields are used by the Smart AI import to store detailed quote information

-- Add enhanced quote detail columns
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
ADD COLUMN IF NOT EXISTS specifications TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS delivery_terms TEXT,
ADD COLUMN IF NOT EXISTS warranty TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT,
ADD COLUMN IF NOT EXISTS company_info JSONB;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN quotes.scope_of_work IS 'Detailed description of work to be performed';
COMMENT ON COLUMN quotes.specifications IS 'Technical specifications and requirements';
COMMENT ON COLUMN quotes.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN quotes.delivery_terms IS 'Delivery terms and timeline';
COMMENT ON COLUMN quotes.warranty IS 'Warranty information and terms';
COMMENT ON COLUMN quotes.additional_notes IS 'Additional notes and terms';
COMMENT ON COLUMN quotes.company_info IS 'Company information extracted from quote (JSON: {name, address, contact})';

-- Create index on company_info for faster queries
CREATE INDEX IF NOT EXISTS idx_quotes_company_info ON quotes USING GIN (company_info);

-- Update the database schema version (if you have a version tracking system)
-- INSERT INTO schema_versions (version, description, applied_at) 
-- VALUES ('2024_01_quote_enhanced_fields', 'Add enhanced quote detail fields for Smart AI import', NOW());

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
  AND column_name IN ('scope_of_work', 'specifications', 'payment_terms', 'delivery_terms', 'warranty', 'additional_notes', 'company_info')
ORDER BY column_name;