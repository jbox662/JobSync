-- Supabase Database Schema for Job Manager App (Safe Version)
-- This version handles existing tables and can be run multiple times safely

-- Create workspaces table (if not exists)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table (if not exists)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'member')) NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- Create customers table (if not exists)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create parts table (if not exists)
CREATE TABLE IF NOT EXISTS parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create labor_items table (if not exists)
CREATE TABLE IF NOT EXISTS labor_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create jobs table (if not exists)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'on-hold', 'completed', 'cancelled')) NOT NULL,
  notes TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create quotes table (if not exists)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')) NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  company_info JSONB DEFAULT NULL,
  scope_of_work TEXT DEFAULT NULL,
  specifications TEXT DEFAULT NULL,
  payment_terms TEXT DEFAULT NULL,
  delivery_terms TEXT DEFAULT NULL,
  warranty TEXT DEFAULT NULL,
  additional_notes TEXT DEFAULT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(workspace_id, quote_number)
);

-- Create invoices table (if not exists)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_terms TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(workspace_id, invoice_number)
);

-- Create sync_events table for change tracking (if not exists)
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  operation TEXT CHECK (operation IN ('create', 'update', 'delete')) NOT NULL,
  entity_id UUID NOT NULL,
  row_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_parts_workspace_id ON parts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_labor_items_workspace_id ON labor_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_workspace_id ON quotes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_workspace_id ON sync_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at);

-- Enable Row Level Security (safe to run multiple times)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (safe to run multiple times with OR REPLACE)
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parts_updated_at ON parts;
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_labor_items_updated_at ON labor_items;
CREATE TRIGGER update_labor_items_updated_at BEFORE UPDATE ON labor_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies (with DROP IF EXISTS for safety)
DROP POLICY IF EXISTS "Allow full access to workspaces" ON workspaces;
CREATE POLICY "Allow full access to workspaces" ON workspaces FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to workspace_members" ON workspace_members;
CREATE POLICY "Allow full access to workspace_members" ON workspace_members FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to customers" ON customers;
CREATE POLICY "Allow full access to customers" ON customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to parts" ON parts;
CREATE POLICY "Allow full access to parts" ON parts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to labor_items" ON labor_items;
CREATE POLICY "Allow full access to labor_items" ON labor_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to jobs" ON jobs;
CREATE POLICY "Allow full access to jobs" ON jobs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to quotes" ON quotes;
CREATE POLICY "Allow full access to quotes" ON quotes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to invoices" ON invoices;
CREATE POLICY "Allow full access to invoices" ON invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access to sync_events" ON sync_events;
CREATE POLICY "Allow full access to sync_events" ON sync_events FOR ALL USING (true);

-- Add comments for enhanced quote columns
COMMENT ON COLUMN quotes.company_info IS 'JSON object containing company information (name, address, contact)';
COMMENT ON COLUMN quotes.scope_of_work IS 'Detailed description of work to be performed';
COMMENT ON COLUMN quotes.specifications IS 'Technical specifications and requirements';
COMMENT ON COLUMN quotes.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN quotes.delivery_terms IS 'Delivery terms and timeline';
COMMENT ON COLUMN quotes.warranty IS 'Warranty information and terms';
COMMENT ON COLUMN quotes.additional_notes IS 'Additional notes and comments';

-- Verification queries to confirm setup
SELECT 'SUCCESS: Database schema setup completed successfully!' as status;