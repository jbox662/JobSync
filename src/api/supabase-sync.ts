import { supabase, isSupabaseAvailable } from './supabase';
import type { ChangeEvent, SyncConfig } from '../types';
import type { 
  Customer, 
  Part, 
  LaborItem, 
  Job, 
  Quote, 
  Invoice 
} from '../types';

export type PushPayload = {
  workspaceId: string;
  deviceId: string;
  changes: ChangeEvent[];
};

export type PullResponse = {
  changes: ChangeEvent[];
  serverTime: string;
};

// Entity mapping helpers
const mapEntityToTable = (entity: string) => {
  const mapping: Record<string, string> = {
    'customers': 'customers',
    'parts': 'parts',
    'laborItems': 'labor_items',
    'jobs': 'jobs',
    'quotes': 'quotes',
    'invoices': 'invoices'
  };
  return mapping[entity] || entity;
};

// Helper function to check if a string is a valid UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Simple hash function for React Native compatibility
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// Helper function to convert non-standard IDs to valid UUIDs
const normalizeUUID = (value: string): string => {
  if (isValidUUID(value)) {
    return value;
  }
  
  // For non-standard IDs, create a deterministic UUID based on the value
  // This ensures the same input always generates the same UUID
  const hash1 = simpleHash(value);
  const hash2 = simpleHash(value + 'salt1');
  const hash3 = simpleHash(value + 'salt2');
  const hash4 = simpleHash(value + 'salt3');
  
  // Create a 32-character hex string
  const fullHash = (hash1 + hash2 + hash3 + hash4).substring(0, 32);
  
  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return [
    fullHash.substring(0, 8),
    fullHash.substring(8, 12),
    fullHash.substring(12, 16),
    fullHash.substring(16, 20),
    fullHash.substring(20, 32)
  ].join('-');
};

const mapRowToSupabaseFormat = (entity: string, row: any) => {
  // Convert camelCase to snake_case for database
  const converted: any = {};
  
  Object.keys(row).forEach(key => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    let value = row[key];
    
    // Handle UUID fields
    if (typeof value === 'string') {
      if (value === '') {
        // Convert empty strings to null for UUID fields
        if (key.endsWith('Id') || key === 'id' || snakeKey.endsWith('_id') || snakeKey === 'id') {
          value = null;
        }
      } else if (key.endsWith('Id') || key === 'id' || snakeKey.endsWith('_id') || snakeKey === 'id') {
        // Normalize non-standard UUIDs to valid format
        if (!isValidUUID(value)) {
          console.warn(`Converting non-standard UUID ${key}: ${value} -> normalized UUID`);
          value = normalizeUUID(value);
        }
      }
    }
    
    converted[snakeKey] = value;
  });
  
  // Handle special cases
  if (entity === 'laborItems') {
    if (converted.hourly_rate !== undefined) {
      converted.hourly_rate = converted.hourly_rate;
    }
  }
  
  if (entity === 'parts') {
    if (converted.unit_price !== undefined) {
      converted.unit_price = converted.unit_price;
    }
  }
  
  return converted;
};

const mapRowFromSupabaseFormat = (entity: string, row: any) => {
  // Convert snake_case to camelCase for app
  const converted: any = {};
  
  Object.keys(row).forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    converted[camelKey] = row[key];
  });
  
  return converted;
};

// Business/Workspace management
export async function createBusiness(name: string, ownerEmail: string): Promise<{ workspaceId: string; inviteCode: string } | null> {
  // Require Supabase configuration for production
  if (!isSupabaseAvailable() || !supabase) {
    return null;
  }

  try {
    const inviteCode = `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_email: ownerEmail,
        invite_code: inviteCode
      })
      .select()
      .single();

    if (workspaceError) {
      return null;
    }

    // Add owner as member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        email: ownerEmail,
        role: 'owner',
        device_id: 'owner-device'
      });

    if (memberError) {
      return null;
    }

    return {
      workspaceId: workspace.id,
      inviteCode: workspace.invite_code
    };
  } catch (error) {
    return null;
  }
}

export async function createInvites(workspaceId: string, emails: string[]): Promise<Array<{ email: string; inviteCode: string }>> {
  // Return mock response if Supabase is not configured
  if (!isSupabaseAvailable() || !supabase) {
    return emails.map((e) => ({ 
      email: e, 
      inviteCode: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}` 
    }));
  }

  try {
    // Get workspace invite code
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('invite_code')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error fetching workspace:', workspaceError);
      return [];
    }

    // Return the same invite code for all emails (simplified approach)
    return emails.map(email => ({
      email,
      inviteCode: workspace.invite_code
    }));
  } catch (error) {
    // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error in createInvites:', error);
    return [];
  }
}

export async function acceptInvite(email: string, inviteCode: string, deviceId: string): Promise<{ workspaceId: string; role: "owner" | "member" } | null> {
  // Return mock response if Supabase is not configured - ALWAYS SUCCESS for demo
  if (!isSupabaseAvailable() || !supabase) {
    // In demo mode, accept any invite code that looks reasonable
    if (inviteCode && inviteCode.length >= 3 && inviteCode.trim()) {
      return { workspaceId: `demo-workspace-${inviteCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`, role: "member" };
    }
    return null;
  }

  try {
    // Find workspace by invite code
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (workspaceError || !workspace) {
      return null;
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspace.id)
      .eq('email', email)
      .single();

    if (existingMember) {
      // User is already a member, return success
      return {
        workspaceId: workspace.id,
        role: existingMember.role as "owner" | "member"
      };
    }

    // Add member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        email,
        role: 'member',
        device_id: deviceId
      });

    if (memberError) {
      return null;
    }

    return {
      workspaceId: workspace.id,
      role: 'member'
    };
  } catch (error) {
    return null;
  }
}

export async function listMembers(workspaceId: string): Promise<Array<{ email: string; role: string; createdAt: string }>> {
  // Return empty array if Supabase is not configured
  if (!isSupabaseAvailable() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('email, role, created_at')
      .eq('workspace_id', workspaceId);

    if (error) {
      // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error listing members:', error);
      return [];
    }

    return data.map(member => ({
      email: member.email,
      role: member.role,
      createdAt: member.created_at
    }));
  } catch (error) {
    // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error in listMembers:', error);
    return [];
  }
}

// Sync operations
export async function pushChanges(payload: PushPayload): Promise<boolean> {
  console.log('🔄 pushChanges v3.0 called with:', {
    workspaceId: payload.workspaceId,
    deviceId: payload.deviceId,
    changeCount: payload.changes.length,
    supabaseAvailable: isSupabaseAvailable()
  });
  
  // Return success if Supabase is not configured (offline mode)
  if (!isSupabaseAvailable() || !supabase) {
    console.log('❌ Supabase not available, returning true (offline mode)');
    return true;
  }

  try {
    // First, record sync events - filter out invalid changes
    const validChanges = payload.changes.filter(change => {
      if (!change.row) {
        console.warn('Filtering out change with missing row:', change);
        return false;
      }
      if (!change.row.id) {
        console.warn('Filtering out change with missing row ID:', change);
        return false;
      }
      return true;
    });
    
    console.log(`Filtered ${payload.changes.length} changes to ${validChanges.length} valid changes`);
    
    if (validChanges.length === 0) {
      console.log('No valid changes to sync');
      return true;
    }
    
    const syncEvents = validChanges.map(change => {
      if (!change.row || !change.row.id) {
        throw new Error(`Invalid change in validChanges: ${JSON.stringify(change)}`);
      }
      return {
        workspace_id: payload.workspaceId,
        device_id: payload.deviceId,
        entity: change.entity,
        operation: change.operation,
        entity_id: change.row.id,
        row_data: change.row
      };
    });

    const { error: syncError } = await supabase
      .from('sync_events')
      .insert(syncEvents);

    if (syncError) {
      console.error('Sync events insert error:', syncError);
      throw new Error(`Failed to record sync events: ${syncError.message}`);
    }

    // Sort changes by dependency order to avoid foreign key violations
    const dependencyOrder = ['customers', 'parts', 'laborItems', 'jobs', 'quotes', 'invoices'];
    const sortedChanges = validChanges.sort((a, b) => {
      const aIndex = dependencyOrder.indexOf(a.entity);
      const bIndex = dependencyOrder.indexOf(b.entity);
      return aIndex - bIndex;
    });
    
    console.log(`Sorted ${validChanges.length} changes by dependency order`);
    
    // Apply changes to actual tables
    for (const change of sortedChanges) {
      const tableName = mapEntityToTable(change.entity);
      const row = mapRowToSupabaseFormat(change.entity, change.row);
      
      // Add workspace_id to all rows
      row.workspace_id = payload.workspaceId;

      try {
        if (change.operation === 'create') {
          console.log('Processing change:', {
            entity: change.entity,
            operation: change.operation,
            rowId: change.row.id
          });
          
          const { error } = await supabase
            .from(tableName)
            .insert(row);

          if (error && error.code !== '23505') { // Ignore unique constraint violations
            console.error(`Insert error for ${tableName}:`, error);
            
            // Provide more helpful error messages for common issues
            if (error.code === '23503') { // Foreign key violation
              console.warn(`Skipping ${change.entity} due to missing dependency:`, error.message);
              // Skip this record instead of failing the entire sync
              continue;
            } else {
              throw new Error(`Failed to insert ${change.entity}: ${error.message}`);
            }
          }
        } else if (change.operation === 'update') {
          const { error } = await supabase
            .from(tableName)
            .update(row)
            .eq('id', change.row.id)
            .eq('workspace_id', payload.workspaceId);

          if (error) {
            console.error(`Update error for ${tableName}:`, error);
            throw new Error(`Failed to update ${change.entity}: ${error.message}`);
          }
        } else if (change.operation === 'delete') {
          // Soft delete by setting deleted_at
          const { error } = await supabase
            .from(tableName)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', change.row.id)
            .eq('workspace_id', payload.workspaceId);

          if (error) {
            console.error(`Delete error for ${tableName}:`, error);
            throw new Error(`Failed to delete ${change.entity}: ${error.message}`);
          }
        }
      } catch (entityError) {
        // Re-throw the error so we can see what's failing
        throw entityError;
      }
    }

    console.log('✅ pushChanges completed successfully');
    return true;
  } catch (error) {
    console.error('❌ pushChanges failed:', error);
    return false;
  }
}

export async function pullChanges(workspaceId: string, since: string | null): Promise<PullResponse | null> {
  // Return empty changes if Supabase is not configured (offline mode)
  if (!isSupabaseAvailable() || !supabase) {
    return { changes: [], serverTime: new Date().toISOString() };
  }

  try {
    const serverTime = new Date().toISOString();
    
    // If no since timestamp, do full sync
    if (!since) {
      return await performFullSync(workspaceId, serverTime);
    }

    // Get incremental changes from sync_events
    let query = supabase
      .from('sync_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (since) {
      query = query.gt('created_at', since);
    }

    const { data: syncEvents, error } = await query;

    if (error) {
      // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error fetching sync events:', error);
      return null;
    }

    const changes: ChangeEvent[] = syncEvents.map(event => ({
      id: event.id,
      entity: event.entity as any,
      operation: event.operation as any,
      row: mapRowFromSupabaseFormat(event.entity, event.row_data),
      updatedAt: event.created_at,
      deletedAt: event.operation === 'delete' ? event.created_at : null
    }));

    return {
      changes,
      serverTime
    };
  } catch (error) {
    // Removed console.error to reduce development noise - sync status shown in UI instead: ('Error in pullChanges:', error);
    return null;
  }
}

async function performFullSync(workspaceId: string, serverTime: string): Promise<PullResponse> {
  const changes: ChangeEvent[] = [];
  
  const entities = ['customers', 'parts', 'labor_items', 'jobs', 'quotes', 'invoices'];
  
  for (const table of entities) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null);

      if (error) {
        // Removed console.error to reduce development noise - sync status shown in UI instead: (`Error fetching ${table}:`, error);
        continue;
      }

      const entityName = table === 'labor_items' ? 'laborItems' : table;
      
      data.forEach(row => {
        changes.push({
          id: `${row.id}-sync`,
          entity: entityName as any,
          operation: 'create',
          row: mapRowFromSupabaseFormat(entityName, row),
          updatedAt: row.updated_at || row.created_at,
          deletedAt: null
        });
      });
    } catch (entityError) {
      // Removed console.error to reduce development noise - sync status shown in UI instead: (`Error processing ${table}:`, entityError);
      continue;
    }
  }

  return {
    changes,
    serverTime
  };
}