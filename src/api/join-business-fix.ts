/**
 * Temporary fix for join business functionality
 * This bypasses the TypeScript issues in supabase-sync.ts
 */

import { supabase } from './supabase';

export async function joinBusinessByInvite(
  email: string, 
  inviteCode: string, 
  deviceId: string
): Promise<{ workspaceId: string; role: "owner" | "member" } | null> {
  
  if (!supabase) {
    // Demo mode - return success for any valid invite code
    if (inviteCode && inviteCode.length >= 3) {
      return { 
        workspaceId: `demo-workspace-${inviteCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`, 
        role: "member" 
      };
    }
    return null;
  }

  try {
    console.log('Looking up workspace for invite code:', inviteCode);
    
    // Find workspace by invite code using raw query
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('invite_code', inviteCode);

    console.log('Workspace lookup result:', { workspaces, workspaceError });

    if (workspaceError || !workspaces || workspaces.length === 0) {
      console.log('No workspace found for invite code:', inviteCode);
      return null;
    }

    const workspace = workspaces[0];

    // Check if user is already a member
    const { data: existingMembers, error: memberCheckError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspace.id)
      .eq('email', email);

    console.log('Member check result:', { existingMembers, memberCheckError });

    if (existingMembers && existingMembers.length > 0) {
      console.log('User is already a member, returning success');
      return {
        workspaceId: workspace.id,
        role: existingMembers[0].role as "owner" | "member"
      };
    }

    // Add as new member
    console.log('Adding user as new member');
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        email,
        role: 'member',
        device_id: deviceId
      });

    console.log('Insert member result:', { memberError });

    if (memberError) {
      console.log('Error adding member:', memberError);
      return null;
    }

    console.log('Successfully joined workspace');
    return {
      workspaceId: workspace.id,
      role: 'member'
    };

  } catch (error) {
    console.error('Error in joinBusinessByInvite:', error);
    return null;
  }
}