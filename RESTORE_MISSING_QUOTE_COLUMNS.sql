-- URGENT: Restore missing quote columns that were accidentally removed
-- Run this in your Supabase SQL editor to restore all enhanced quote functionality

-- Add all missing quote columns
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_info JSONB DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS scope_of_work TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS specifications TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_terms TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT NULL;

-- Add column comments
COMMENT ON COLUMN quotes.company_info IS 'JSON object containing company information (name, address, contact)';
COMMENT ON COLUMN quotes.scope_of_work IS 'Detailed description of work to be performed';
COMMENT ON COLUMN quotes.specifications IS 'Technical specifications and requirements';
COMMENT ON COLUMN quotes.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN quotes.delivery_terms IS 'Delivery terms and timeline';
COMMENT ON COLUMN quotes.warranty IS 'Warranty information and terms';
COMMENT ON COLUMN quotes.additional_notes IS 'Additional notes and comments';

-- Verify columns were added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'quotes'
AND column_name IN ('company_info', 'scope_of_work', 'specifications', 'payment_terms', 'delivery_terms', 'warranty', 'additional_notes');

SELECT 'SUCCESS: All missing quote columns restored!' as status;
