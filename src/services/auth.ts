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
        // Handle specific Supabase auth errors
        if (authError.message.toLowerCase().includes('already') || 
            authError.message.toLowerCase().includes('exist') ||
            authError.message.toLowerCase().includes('registered') ||
            authError.message.includes('user_already_exists') ||
            authError.status === 422) {
          return { 
            user: null, 
            error: 'An account with this email already exists. Please sign in instead or use a different email address.' 
          };
        }
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user account' };
      }

      // Check if user was actually created or if this is an existing user
      if (!authData.session && authData.user && !authData.user.email_confirmed_at) {
        // This might be a duplicate signup attempt - user exists but not confirmed
        return { 
          user: null, 
          error: 'An account with this email may already exist. Please check your email for a confirmation link, or try signing in.' 
        };
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
   * Clear stale session and authentication state
   */
  async clearStaleSession(): Promise<void> {
    if (!supabase) return;
    
    try {
      // Clear Supabase session
      await supabase.auth.signOut({ scope: 'local' });
      console.log('🧹 Cleared stale Supabase session');
    } catch (error) {
      console.log('Note: Session was already cleared or invalid');
    }
    
    // Clear app authentication state
    const store = useJobStore.getState();
    store.clearAuthentication();
  }

  /**
   * Validate current session without triggering refresh
   */
  async validateSession(): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      // Get session without triggering auto-refresh
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('📄 No active session found');
        return false;
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('⏰ Session expired, needs refresh');
        return false;
      }

      // Check if refresh token exists
      if (!session.refresh_token) {
        console.log('🔄 No refresh token available');
        return false;
      }

      return true;
    } catch (error) {
      console.log('❌ Session validation failed:', error);
      return false;
    }
  }

  /**
   * Get current authenticated user with robust error handling
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!supabase) {
      return null;
    }

    try {
      // First validate the session
      const hasValidSession = await this.validateSession();
      
      if (!hasValidSession) {
        console.log('🚫 Invalid session detected, clearing authentication state');
        await this.clearStaleSession();
        return null;
      }

      // Try to get user (this may trigger token refresh)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.log('👤 Error getting user:', userError.message);
        
        // Handle specific authentication errors
        if (userError.message?.includes('refresh') || 
            userError.message?.includes('token') || 
            userError.message?.includes('Invalid')) {
          console.log('🔑 Token/refresh error detected, clearing stale session');
          await this.clearStaleSession();
        }
        return null;
      }
      
      if (!user) {
        console.log('👤 No user found in valid session');
        return null;
      }

      // Get workspace info
      try {
        const { data: memberData, error: memberError } = await supabase
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

        if (memberError && !memberError.message?.includes('No rows')) {
          console.log('🏢 Error getting workspace info:', memberError.message);
        }

        const authUser: AuthUser = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name,
          role: memberData?.role as 'owner' | 'member' || undefined,
          workspaceId: memberData?.workspace_id || undefined,
          workspaceName: (memberData?.workspaces as any)?.name || undefined
        };

        console.log('✅ Successfully retrieved authenticated user');
        return authUser;

      } catch (workspaceError) {
        console.log('🏢 Workspace query failed, but user is valid:', workspaceError);
        
        // Return user without workspace info if workspace query fails
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name,
          role: undefined,
          workspaceId: undefined,
          workspaceName: undefined
        };
      }

    } catch (error: any) {
      console.error('❌ Failed to get current user:', error);
      
      // Handle specific Supabase auth errors
      if (error.message?.includes('Invalid Refresh Token') || 
          error.message?.includes('refresh_token') ||
          error.message?.includes('Refresh Token Not Found')) {
        console.log('🔄 Refresh token error detected, clearing stale session');
        await this.clearStaleSession();
      } else if (error.message?.includes('JWT') || 
                 error.message?.includes('token')) {
        console.log('🎟️ Token error detected, clearing authentication state');
        await this.clearStaleSession();
      }
      
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

