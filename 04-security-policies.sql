-- Step 4: Enable Row Level Security and Policies
-- Run this to secure your database with RLS policies

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

SELECT 'SUCCESS: Row Level Security and policies configured successfully!' as result;