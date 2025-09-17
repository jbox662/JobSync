# Supabase Integration Setup Guide

This guide walks you through setting up Supabase synchronization for your business management app.

## Prerequisites

1. A Supabase account (free tier available at [supabase.com](https://supabase.com))
2. Basic understanding of SQL databases

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name and database password
5. Select a region close to your users
6. Click "Create new project"

## Step 2: Get Your Project Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy your **Project URL** (looks like `https://yourproject.supabase.co`)
3. Copy your **anon public** key (long JWT token starting with `eyJ...`)

## Step 3: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase-schema.sql` from your project root
4. Click "Run" to execute the schema

This creates all necessary tables:
- `workspaces` - Business/organization data
- `workspace_members` - Team member management
- `customers`, `parts`, `labor_items` - Core business data
- `jobs`, `quotes`, `invoices` - Work and billing data
- `sync_events` - Change tracking for synchronization

## Step 4: Configure App

### Option A: Use In-App Setup (Recommended)

1. Open your app
2. Go to **Accounts** (drawer menu → account switcher)
3. Tap **"Configure Supabase"**
4. Enter your Project URL and anon key
5. Tap **"Save Configuration"**
6. Restart the app

### Option B: Environment Variables

Update your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 5: Create or Join Business

### Create New Business:
1. Use the business creation screen when first opening the app
2. Enter business name and owner email
3. The app will create a workspace and provide an invite code

### Join Existing Business:
1. Get the invite code from the business owner
2. Use the join business screen
3. Enter your email and the invite code

## Features

### ✅ Real-time Synchronization
- Automatic sync every 30 seconds
- Manual sync via "Sync Now" button
- Background sync when app becomes active

### ✅ Multi-device Support
- Same data across all devices
- Conflict resolution based on timestamps
- Device-specific change tracking

### ✅ Team Collaboration
- Multi-user workspaces
- Role-based access (owner/member)
- Invite system for team members

### ✅ Offline Support
- Local data storage with AsyncStorage
- Offline changes queued for sync
- Automatic sync when reconnected

### ✅ Data Management
- Customers, Parts, Labor Items
- Jobs, Quotes, Invoices
- Full CRUD operations with sync

## Data Sync Behavior

### Push Sync (Local → Supabase):
- Queues all local changes (create, update, delete)
- Batches changes for efficient sync
- Records sync events for audit trail

### Pull Sync (Supabase → Local):
- Fetches changes since last sync timestamp
- Merges remote changes with local data
- Handles conflict resolution automatically

### Conflict Resolution:
- Uses `updated_at` timestamps
- Latest change wins
- Soft deletes preserve data integrity

## Troubleshooting

### Understanding Sync Status Messages:

**"Supabase not configured"**
- The app detected placeholder or invalid credentials
- Use the "Configure Supabase" button or in-app setup screen
- Ensure your Project URL matches format: `https://your-project.supabase.co`
- Ensure your API key is a valid JWT starting with `eyJ`

**"Workspace not linked"**
- Supabase is configured but no business workspace is connected
- Create a new business or join an existing one using invite codes
- Use the onboarding screens when first opening the app

**"Supabase connection failed"**
- Configuration exists but connection test failed
- Check internet connectivity
- Verify Supabase project is active (not paused)
- Test credentials using the "Test Connection" button in setup

**"Sync failed"**
- Temporary network or server issue
- Use "Retry Sync" or manual sync button
- Check Supabase project logs for errors

**Tables don't exist**
- Run the `supabase-schema.sql` script
- Check SQL Editor for any error messages
- Ensure all tables were created successfully

### Database Management:

**Viewing Data:**
1. Go to **Table Editor** in Supabase dashboard
2. Browse all your synced data
3. Make direct edits if needed (advanced users)

**Monitoring:**
1. **API** → **API Logs** to see request activity
2. **Database** → **Activity** for database usage
3. **Auth** → **Users** if you add authentication later

## Security Notes

### Current Setup:
- Uses anonymous access with Row Level Security
- All data is accessible to anyone with credentials
- Suitable for trusted team environments
- Graceful fallback when not configured (offline-only mode)
- Smart error detection with user-friendly status messages

### Production Recommendations:
1. Implement proper authentication
2. Create user-specific RLS policies
3. Use service role key for backend operations only
4. Enable email/password auth for users

## Advanced Configuration

### Custom Sync Intervals:
Edit `App.tsx` line 45-47 to change sync frequency:

```typescript
}, 30000); // Change to desired milliseconds
```

### RLS Policies:
For production, replace the permissive policies in the schema with:

```sql
-- Example: Restrict access by workspace membership
CREATE POLICY "Users can access their workspace data" 
ON customers FOR ALL 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE email = auth.jwt() ->> 'email'
  )
);
```

## Support

If you encounter issues:
1. Check the app logs for error messages
2. Verify Supabase project status
3. Test connection in Supabase API docs
4. Review this guide for missed steps

## Next Steps

Consider implementing:
- User authentication with Supabase Auth
- Real-time subscriptions for live updates
- File storage for job photos/documents
- Push notifications for team updates
- API webhooks for external integrations