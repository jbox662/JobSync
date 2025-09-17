import { supabase } from './supabase';
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

const mapRowToSupabaseFormat = (entity: string, row: any) => {
  // Convert camelCase to snake_case for database
  const converted: any = {};
  
  Object.keys(row).forEach(key => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snakeKey] = row[key];
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
      console.error('Error creating workspace:', workspaceError);
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
      console.error('Error adding owner as member:', memberError);
      return null;
    }

    return {
      workspaceId: workspace.id,
      inviteCode: workspace.invite_code
    };
  } catch (error) {
    console.error('Error in createBusiness:', error);
    return null;
  }
}

export async function createInvites(workspaceId: string, emails: string[]): Promise<Array<{ email: string; inviteCode: string }>> {
  try {
    // Get workspace invite code
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('invite_code')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Error fetching workspace:', workspaceError);
      return [];
    }

    // Return the same invite code for all emails (simplified approach)
    return emails.map(email => ({
      email,
      inviteCode: workspace.invite_code
    }));
  } catch (error) {
    console.error('Error in createInvites:', error);
    return [];
  }
}

export async function acceptInvite(email: string, inviteCode: string, deviceId: string): Promise<{ workspaceId: string; role: "owner" | "member" } | null> {
  try {
    // Find workspace by invite code
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (workspaceError) {
      console.error('Error finding workspace:', workspaceError);
      return null;
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
      console.error('Error adding member:', memberError);
      return null;
    }

    return {
      workspaceId: workspace.id,
      role: 'member'
    };
  } catch (error) {
    console.error('Error in acceptInvite:', error);
    return null;
  }
}

export async function listMembers(workspaceId: string): Promise<Array<{ email: string; role: string; createdAt: string }>> {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('email, role, created_at')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('Error listing members:', error);
      return [];
    }

    return data.map(member => ({
      email: member.email,
      role: member.role,
      createdAt: member.created_at
    }));
  } catch (error) {
    console.error('Error in listMembers:', error);
    return [];
  }
}

// Sync operations
export async function pushChanges(payload: PushPayload): Promise<boolean> {
  try {
    // First, record sync events
    const syncEvents = payload.changes.map(change => ({
      workspace_id: payload.workspaceId,
      device_id: payload.deviceId,
      entity: change.entity,
      operation: change.operation,
      entity_id: change.row.id,
      row_data: change.row
    }));

    const { error: syncError } = await supabase
      .from('sync_events')
      .insert(syncEvents);

    if (syncError) {
      console.error('Error recording sync events:', syncError);
      return false;
    }

    // Apply changes to actual tables
    for (const change of payload.changes) {
      const tableName = mapEntityToTable(change.entity);
      const row = mapRowToSupabaseFormat(change.entity, change.row);
      
      // Add workspace_id to all rows
      row.workspace_id = payload.workspaceId;

      try {
        if (change.operation === 'create') {
          const { error } = await supabase
            .from(tableName)
            .insert(row);

          if (error && error.code !== '23505') { // Ignore unique constraint violations
            console.error(`Error creating ${change.entity}:`, error);
          }
        } else if (change.operation === 'update') {
          const { error } = await supabase
            .from(tableName)
            .update(row)
            .eq('id', change.row.id)
            .eq('workspace_id', payload.workspaceId);

          if (error) {
            console.error(`Error updating ${change.entity}:`, error);
          }
        } else if (change.operation === 'delete') {
          // Soft delete by setting deleted_at
          const { error } = await supabase
            .from(tableName)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', change.row.id)
            .eq('workspace_id', payload.workspaceId);

          if (error) {
            console.error(`Error deleting ${change.entity}:`, error);
          }
        }
      } catch (entityError) {
        console.error(`Error processing ${change.operation} for ${change.entity}:`, entityError);
        continue; // Continue with other changes
      }
    }

    return true;
  } catch (error) {
    console.error('Error in pushChanges:', error);
    return false;
  }
}

export async function pullChanges(workspaceId: string, since: string | null): Promise<PullResponse | null> {
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
      console.error('Error fetching sync events:', error);
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
    console.error('Error in pullChanges:', error);
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
        console.error(`Error fetching ${table}:`, error);
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
      console.error(`Error processing ${table}:`, entityError);
      continue;
    }
  }

  return {
    changes,
    serverTime
  };
}