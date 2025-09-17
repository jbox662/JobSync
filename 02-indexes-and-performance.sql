-- Step 2: Add Performance Indexes
-- Run this after tables are created to improve query performance

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

SELECT 'SUCCESS: All indexes created successfully!' as result;