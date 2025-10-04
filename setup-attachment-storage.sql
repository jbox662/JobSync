-- Setup Supabase Storage for Attachments
-- Run this in your Supabase SQL Editor

-- 1. Create the attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments', 
  true, 
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/html',
    'text/rtf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/tiff'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policies for the attachments bucket

-- Policy 1: Allow workspace members to upload attachments
CREATE POLICY "Allow workspace members to upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'email' IN (
    SELECT email 
    FROM workspace_members 
    WHERE workspace_id = (storage.foldername(name))[1]::uuid
  )
);

-- Policy 2: Allow workspace members to view attachments
CREATE POLICY "Allow workspace members to view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'email' IN (
    SELECT email 
    FROM workspace_members 
    WHERE workspace_id = (storage.foldername(name))[1]::uuid
  )
);

-- Policy 3: Allow workspace members to update attachments
CREATE POLICY "Allow workspace members to update attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'email' IN (
    SELECT email 
    FROM workspace_members 
    WHERE workspace_id = (storage.foldername(name))[1]::uuid
  )
);

-- Policy 4: Allow workspace members to delete attachments
CREATE POLICY "Allow workspace members to delete attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'email' IN (
    SELECT email 
    FROM workspace_members 
    WHERE workspace_id = (storage.foldername(name))[1]::uuid
  )
);

-- 3. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

SELECT 'Attachment storage setup completed successfully!' as status;
