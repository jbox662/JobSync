import { supabase } from '../api/supabase';
import { useJobStore } from '../state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: 'owner' | 'member';
  workspaceId?: string;
  workspaceName?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  businessName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign up a new user and optionally create a business workspace
   */
  async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!supabase) {
      return { user: null, error: 'Authentication service not available' };
    }

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          }
        }
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user account' };
      }

      // If business name provided, create workspace
      let workspaceId: string | undefined;
      let workspaceName: string | undefined;
      let inviteCode: string | undefined;

      if (data.businessName) {
        const inviteCodeGenerated = `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            name: data.businessName,
            owner_email: data.email,
            invite_code: inviteCodeGenerated
          })
          .select()
          .single();

        if (!workspaceError && workspace) {
          workspaceId = workspace.id;
          workspaceName = workspace.name;
          inviteCode = workspace.invite_code;

          // Add user as workspace owner
          await supabase
            .from('workspace_members')
            .insert({
              workspace_id: workspace.id,
              email: data.email,
              role: 'owner',
              device_id: useJobStore.getState().deviceId
            });
        }
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: workspaceId ? 'owner' : undefined,
        workspaceId,
        workspaceName
      };

      // Update app state
      const store = useJobStore.getState();
      store.setAuthenticatedUser(user);

      return { user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!supabase) {
      return { user: null, error: 'Authentication service not available' };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Authentication failed' };
      }

      // Get user's workspace information
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace_id,
          workspaces (
            id,
            name
          )
        `)
        .eq('email', data.email)
        .single();

      const user: AuthUser = {
        id: authData.user.id,
        email: data.email,
        name: authData.user.user_metadata?.name,
        role: memberData?.role as 'owner' | 'member',
        workspaceId: memberData?.workspace_id,
        workspaceName: (memberData?.workspaces as any)?.name
      };

      // Update app state
      const store = useJobStore.getState();
      store.setAuthenticatedUser(user);

      return { user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Authentication service not available' };
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      // Clear app state
      const store = useJobStore.getState();
      store.clearAuthentication();
      
      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Get workspace info
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace_id,
          workspaces (
            id,
            name
          )
        `)
        .eq('email', user.email)
        .single();

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name,
        role: memberData?.role as 'owner' | 'member',
        workspaceId: memberData?.workspace_id,
        workspaceName: (memberData?.workspaces as any)?.name
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Join existing business with invite code
   */
  async joinBusiness(email: string, inviteCode: string): Promise<{ success: boolean; error: string | null }> {
    if (!supabase) {
      return { success: false, error: 'Authentication service not available' };
    }

    try {
      // Find workspace by invite code
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (workspaceError || !workspace) {
        return { success: false, error: 'Invalid invite code' };
      }

      // Add user as workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          email: email,
          role: 'member',
          device_id: useJobStore.getState().deviceId
        });

      if (memberError) {
        return { success: false, error: 'Failed to join workspace' };
      }

      // Update current user's workspace info
      const store = useJobStore.getState();
      const currentUser = store.authenticatedUser;
      
      if (currentUser) {
        store.setAuthenticatedUser({
          ...currentUser,
          role: 'member',
          workspaceId: workspace.id,
          workspaceName: workspace.name
        });
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to join business' };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Authentication service not available' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password'
      });

      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Password reset failed' };
    }
  }
}

export const authService = AuthService.getInstance();
