import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Customer, Part, LaborItem, Job, JobItem, Quote, Invoice, User, ChangeEvent, SyncConfig, BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from '../types';
import { getSupabaseConfigFromEnv } from '../utils/supabase-config';
import { v4 as uuidv4 } from 'uuid';
import { createBusiness, createInvites, acceptInvite, listMembers, pushChanges, pullChanges } from '../api/supabase-sync';
import type { AuthUser } from '../services/auth';

interface JobStore extends AppState {
  // Business settings
  settings: BusinessSettings;
  
  // Authentication
  authenticatedUser: AuthUser | null;
  isAuthenticated: boolean;
  setAuthenticatedUser: (user: AuthUser) => void;
  clearAuthentication: () => void;
  
  // Legacy business auth/link (deprecated but kept for compatibility)
  userEmail: string | null;
  workspaceId: string | null;
  workspaceName?: string | null;
  role: 'owner' | 'member' | null;
  linkBusinessOwner: (name: string, ownerEmail: string) => Promise<{ inviteCode?: string } | null>;
  inviteMembers: (emails: string[]) => Promise<Array<{ email: string; inviteCode: string }>>;
  acceptBusinessInvite: (email: string, inviteCode: string) => Promise<boolean>;
  listWorkspaceMembers: () => Promise<Array<{ email: string; role: string; createdAt: string }>>;
  logout: () => void;

  // Multi-profile local slices (deprecated - kept for data structure compatibility)
  users: User[];
  currentUserId: string | null;
  dataByUser: Record<string, AppState>; // Legacy - being migrated to dataByWorkspace
  
  // NEW: Workspace-based storage (shared across all users in same workspace)
  dataByWorkspace: Record<string, AppState>;

  // Sync
  deviceId: string;
  syncConfig?: SyncConfig;
  isSupabaseConfigured: boolean;
  supabaseConfigError?: string;
  setSyncConfig: (cfg: SyncConfig) => void;
  outboxByUser: Record<string, ChangeEvent[]>;
  lastSyncByUser: Record<string, string | null>;
  isSyncing: boolean;
  syncError: string | null;
  syncNow: () => Promise<void>;

  // CRUD actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addPart: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void;
  addLaborItem: (item: Omit<LaborItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLaborItem: (id: string, updates: Partial<LaborItem>) => void;
  deleteLaborItem: (id: string) => void;
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  // Quote CRUD actions
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'quoteNumber' | 'subtotal' | 'tax' | 'total'>) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  
  // Invoice CRUD actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'subtotal' | 'tax' | 'total'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Utility functions
  getCustomerById: (id: string) => Customer | undefined;
  getPartById: (id: string) => Part | undefined;
  getPartBySku: (sku: string) => Part | undefined;
  getLaborItemById: (id: string) => LaborItem | undefined;
  getJobById: (id: string) => Job | undefined;
  getQuoteById: (id: string) => Quote | undefined;
  getInvoiceById: (id: string) => Invoice | undefined;
  getJobQuotes: (jobId: string) => Quote[];
  getJobInvoices: (jobId: string) => Invoice[];
  generateQuoteNumber: () => string;
  generateInvoiceNumber: () => string;
  calculateQuoteTotal: (items: JobItem[], taxRate?: number) => { subtotal: number; tax: number; total: number };
  calculateInvoiceTotal: (items: JobItem[], taxRate?: number) => { subtotal: number; tax: number; total: number };
  
  // Settings management
  getSettings: () => BusinessSettings;
  updateSettings: (updates: Partial<BusinessSettings>) => void;
  resetSettings: () => void;
  
  // Sample data generation
  
}

const calculateJobTotals = (items: JobItem[], taxRate: number, enableTax: boolean = true) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = enableTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => {
      // Helper function to get current user ID (authenticated user preferred)
      const getCurrentUserId = () => {
        try {
          const state = get();
          return state?.authenticatedUser?.id || state?.currentUserId || null;
        } catch (error) {
          console.warn('Store context lost in getCurrentUserId, returning null');
          return null;
        }
      };
      
      // Helper function to get/set workspace data (shared across all users in workspace)
      const getWorkspaceData = () => {
        const state = get();
        const ws = state.workspaceId;
        if (!ws) return null;
        return state.dataByWorkspace?.[ws] || { 
          customers: [], 
          parts: [], 
          laborItems: [], 
          jobs: [], 
          quotes: [], 
          invoices: [] 
        };
      };
      
      const setWorkspaceData = (data: AppState) => {
        const state = get();
        const ws = state.workspaceId;
        if (!ws) {
          console.error('Cannot set workspace data: No workspace ID');
          return;
        }
        set({
          dataByWorkspace: {
            ...state.dataByWorkspace,
            [ws]: data
          }
        });
      };

      const appendChange = (
        entity: ChangeEvent['entity'], 
        operation: ChangeEvent['operation'], 
        row: any, 
        getStore?: () => any, 
        setState?: (state: any) => void, 
        getUserId?: () => string | null
      ) => {
        try {
          // Use provided store references or fallback to original get/set
          const getRef = getStore || get;
          const setRef = setState || set;
          const getUidRef = getUserId || getCurrentUserId;
          
          const uid = getUidRef();
          if (!uid) {
            console.warn('[appendChange] No user authenticated, skipping change tracking');
            return;
          }
          
          const ev: ChangeEvent = {
            id: uuidv4(),
            entity,
            operation,
            row,
            updatedAt: new Date().toISOString(),
            deletedAt: operation === 'delete' ? new Date().toISOString() : null,
          };
          
          const currentState = getRef();
          const cur = currentState.outboxByUser?.[uid] || [];
          setRef({ outboxByUser: { ...currentState.outboxByUser, [uid]: [...cur, ev] } });
        } catch (error) {
          console.error('[appendChange] Store context lost, skipping change tracking:', error);
        }
      };

      // Auto-sync helper - triggers immediate background sync after changes
      const triggerAutoSync = () => {
        const state = get();
        if (state.isAuthenticated && state.workspaceId && !state.isSyncing) {
          // Immediate sync - no delay
          state.syncNow().catch(() => {
            // Silent failure - user can manually sync if needed
          });
        }
      };

      const syncTopLevel = (getStore?: () => any, setState?: (state: any) => void, getUserId?: (() => string | null) | string) => {
        try {
          if (!getStore && !get) {
            console.error('[syncTopLevel] No store getter available');
            return;
          }
          if (!setState && !set) {
            console.error('[syncTopLevel] No state setter available');
            return;
          }
          
          const getRef = getStore || get;
          const setRef = setState || set;
          
          // Safely get state first
          let state: any;
          try {
            state = getRef();
          } catch (stateError) {
            console.error('[syncTopLevel] Error getting state:', stateError);
            return;
          }
          
          // USE WORKSPACE-BASED STORAGE (shared across all users/devices in same workspace)
          const workspaceId = state.workspaceId;
          if (!workspaceId) {
            console.warn('[syncTopLevel] No workspace ID available');
            return;
          }
          
          // Try workspace storage first, fallback to legacy user storage for migration
          let slice;
          if (state.dataByWorkspace?.[workspaceId]) {
            slice = state.dataByWorkspace[workspaceId];
          } else {
            // Migration path: try to get from old user-based storage
            let uid: string | null = null;
            if (typeof getUserId === 'string') {
              uid = getUserId;
            } else if (typeof getUserId === 'function') {
              try {
                uid = getUserId();
              } catch (uidError) {
                console.warn('[syncTopLevel] Error getting uid:', uidError);
              }
            } else {
              try {
                uid = getCurrentUserId();
              } catch (uidError) {
                console.warn('[syncTopLevel] Error getting getCurrentUserId:', uidError);
              }
            }
            
            if (uid && state.dataByUser?.[uid]) {
              slice = state.dataByUser[uid];
              // Automatically migrate to workspace storage
              try {
                setRef({
                  dataByWorkspace: {
                    ...state.dataByWorkspace,
                    [workspaceId]: slice
                  }
                } as Partial<JobStore>);
              } catch (migrationError) {
                console.error('[syncTopLevel] Failed to migrate data:', migrationError);
              }
            } else {
              // Initialize empty workspace storage
              slice = {
                customers: [],
                parts: [],
                laborItems: [],
                jobs: [],
                quotes: [],
                invoices: []
              };
            }
          }
          
          // Safely update state
          try {
            setRef({ 
              customers: slice.customers || [], 
              parts: slice.parts || [], 
              laborItems: slice.laborItems || [], 
              jobs: slice.jobs || [], 
              quotes: slice.quotes || [], 
              invoices: slice.invoices || [] 
            } as Partial<JobStore>);
          } catch (setError) {
            console.error('[syncTopLevel] Error setting state:', setError);
          }
        } catch (error) {
          console.error('[syncTopLevel] Store context lost, skipping top-level sync:', error);
        }
      };

      const now = new Date().toISOString();
      const defaultId = uuidv4();

      return {
        // Business settings
        settings: {
          ...DEFAULT_BUSINESS_SETTINGS,
          createdAt: now,
          updatedAt: now
        },

        // Active view
        customers: [],
        parts: [],
        laborItems: [],
        jobs: [],
        quotes: [],
        invoices: [],

        // Authentication
        authenticatedUser: null,
        isAuthenticated: false,

        // Legacy business link (deprecated)
        userEmail: null,
        workspaceId: null,
        workspaceName: null,
        role: null,

        // Profiles (deprecated in favor of authentication)
        users: [],
        currentUserId: null,
        dataByUser: {}, // Legacy - being migrated to dataByWorkspace
        dataByWorkspace: {}, // NEW: Workspace-based storage

        // Sync
        deviceId: uuidv4(),
        ...(() => {
          const envConfig = getSupabaseConfigFromEnv();
          return {
            syncConfig: envConfig.isValid ? { baseUrl: envConfig.url, apiKey: envConfig.anonKey } : undefined,
            isSupabaseConfigured: envConfig.isValid,
            supabaseConfigError: envConfig.error,
          };
        })(),
        setSyncConfig: (cfg) => set({ syncConfig: cfg, isSupabaseConfigured: true, supabaseConfigError: undefined }),
        outboxByUser: {},
        lastSyncByUser: {},
        isSyncing: false,
        syncError: null,

        // Authentication methods
        setAuthenticatedUser: (user: AuthUser) => {
          console.log('🔐 Setting authenticated user:', user.email);
          
          const currentSettings = get().settings;
          const currentState = get();
          const workspaceId = user.workspaceId;
          
          // Initialize workspace storage if it doesn't exist
          const existingWorkspaceData = workspaceId ? currentState.dataByWorkspace?.[workspaceId] : null;
          const defaultWorkspaceData = { 
            customers: [], 
            parts: [], 
            laborItems: [], 
            jobs: [], 
            quotes: [], 
            invoices: [] 
          };
          
          set({ 
            authenticatedUser: user, 
            isAuthenticated: true,
            isSupabaseConfigured: true, // If authenticated, Supabase is definitely working
            userEmail: user.email,
            workspaceId: workspaceId || null,
            workspaceName: user.workspaceName || null,
            role: user.role || null,
            // Clear any authentication errors
            syncError: null,
            // Update business settings with workspace info
            settings: {
              ...currentSettings,
              businessName: user.workspaceName || currentSettings.businessName,
              businessEmail: user.email || currentSettings.businessEmail,
              updatedAt: new Date().toISOString()
            },
            // Initialize workspace storage (shared across all users in workspace)
            dataByWorkspace: {
              ...currentState.dataByWorkspace,
              ...(workspaceId ? { [workspaceId]: existingWorkspaceData || defaultWorkspaceData } : {})
            },
            // Initialize user-specific sync tracking
            outboxByUser: { ...get().outboxByUser, [user.id]: get().outboxByUser[user.id] || [] },
            lastSyncByUser: { ...get().lastSyncByUser, [user.id]: get().lastSyncByUser[user.id] || null },
            currentUserId: user.id,
            dataByUser: { 
              ...get().dataByUser, 
              [user.id]: get().dataByUser[user.id] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] } 
            }
          });
          syncTopLevel(get, set, getCurrentUserId);
          
          // Note: Manual sync should be triggered after authentication when needed
          console.log('[Store] User authenticated - sync can be triggered manually via syncNow()');
        },
        
        clearAuthentication: () => {
          console.log('[Store] Clearing authentication state...');
          const { isSupabaseConfigured } = get();
          
          set({ 
            authenticatedUser: null, 
            isAuthenticated: false,
            // Preserve environment-based Supabase config
            isSupabaseConfigured: isSupabaseConfigured,
            userEmail: null,
            workspaceId: null,
            workspaceName: null,
            role: null,
            currentUserId: null,
            customers: [],
            parts: [],
            laborItems: [],
            jobs: [],
            quotes: [],
            invoices: []
          });
          
          console.log('[Store] Authentication state cleared');
        },

        // Business actions
        linkBusinessOwner: async (name: string, ownerEmail: string) => {
          const res = await createBusiness(name, ownerEmail);
          if (!res) return null;
          set({ workspaceId: res.workspaceId, role: 'owner', userEmail: ownerEmail, workspaceName: name });
          return { inviteCode: res.inviteCode };
        },
        inviteMembers: async (emails: string[]) => {
          try {
            const state = get();
            const ws = state.workspaceId;
            if (!ws) return [];
            return await createInvites(ws, emails);
          } catch (error) {
            console.error('Store context lost in inviteMembers:', error);
            return [];
          }
        },
        acceptBusinessInvite: async (email: string, inviteCode: string) => {
          try {
            const getStore = get;
            const setState = set;
            const state = getStore();
            const res = await acceptInvite(email, inviteCode, state.deviceId);
            if (!res) {
              console.log('acceptInvite returned null for:', { email, inviteCode });
              return false;
            }
            console.log('acceptInvite success:', res);
            setState({ 
              workspaceId: res.workspaceId, 
              role: res.role, 
              userEmail: email 
            });
            return true;
          } catch (error) {
            console.error('Store context lost in acceptBusinessInvite:', error);
            return false;
          }
        },
        listWorkspaceMembers: async () => {
          try {
            const state = get();
            const ws = state.workspaceId;
            if (!ws) return [];
            return await listMembers(ws);
          } catch (error) {
            console.error('Store context lost in listWorkspaceMembers:', error);
            return [];
          }
        },
        logout: () => {
          set({ userEmail: null, role: null, workspaceId: null });
        },

        // Sync Now with robust error handling
        syncNow: async () => {
          // Capture store references at the start to prevent context loss during async operations
          const getStore = get;
          const setState = set;
          const getCurrentUserIdRef = getCurrentUserId;
          
          let state;
          try {
            state = getStore();
          } catch (storeError) {
            console.error('🚨 Store context lost during sync initialization:', storeError);
            return;
          }
          
          // Check if user is authenticated (which means Supabase is working)
          if (!state.isAuthenticated) {
            setState({ syncError: 'User not authenticated. Please sign in.' });
            return;
          }
          
          // Check if workspace is linked
          const ws = state.workspaceId;
          if (!ws) {
            setState({ syncError: 'Workspace not linked. Create or join a business first.' });
            return;
          }
          
          // Get current user ID safely and capture it as a constant
          let uid: string | null = null;
          try {
            uid = state.authenticatedUser?.id || state.currentUserId;
          } catch (uidError) {
            uid = null;
          }
          
          if (!uid) {
            setState({ syncError: 'No authenticated user' });
            return;
          }
          
          // Capture uid as const to prevent closure context loss
          const capturedUid = uid;
          
          try {
            setState({ isSyncing: true, syncError: null });
            
            // Get current state safely before async operations
            let currentState;
            try {
              currentState = getStore();
            } catch (storeError) {
              console.error('🚨 Store context lost during sync:', storeError);
              setState({ isSyncing: false, syncError: 'Store context error during sync' });
              return;
            }
            
            const outbox = currentState.outboxByUser[uid] || [];
            const deviceId = currentState.deviceId;
            
            // Try to push changes
            const okPush = await pushChanges({ workspaceId: ws, deviceId, changes: outbox });
            if (okPush) {
              try {
                // Validate store references before push cleanup
                if (!getStore || typeof getStore !== 'function') {
                  throw new Error('getStore reference is invalid during push cleanup');
                }
                if (!setState || typeof setState !== 'function') {
                  throw new Error('setState reference is invalid during push cleanup');
                }
                
                const latestState = getStore();
                if (!latestState) {
                  throw new Error('latestState is null during push cleanup');
                }
                
                setState({ 
                  outboxByUser: { 
                    ...latestState.outboxByUser, 
                    [capturedUid]: [] 
                  } 
                });
              } catch (storeError: any) {
                console.error('🚨 Store context lost during push cleanup:', storeError);
                console.error('Push cleanup error details:', {
                  hasGetStore: !!getStore,
                  hasSetState: !!setState,
                  capturedUid,
                  errorMessage: storeError?.message || 'Unknown error'
                });
              }
            }
            
            // Try to pull changes
            let since;
            try {
              // Validate store reference before getting since timestamp
              if (!getStore || typeof getStore !== 'function') {
                throw new Error('getStore reference is invalid when getting since timestamp');
              }
              
              const latestState = getStore();
              if (!latestState) {
                throw new Error('latestState is null when getting since timestamp');
              }
              
              since = latestState.lastSyncByUser?.[capturedUid] || null;
            } catch (storeError: any) {
              console.warn('🚨 Store context lost getting since timestamp:', storeError?.message);
              since = null;
            }
            
            const pull = await pullChanges(ws, since);
            
            if (pull && pull.changes.length > 0) {
              try {
                // Validate store references before proceeding
                if (!getStore || typeof getStore !== 'function') {
                  throw new Error('getStore reference is invalid');
                }
                if (!setState || typeof setState !== 'function') {
                  throw new Error('setState reference is invalid');
                }
                
                const latestState = getStore();
                if (!latestState) {
                  throw new Error('latestState is null or undefined');
                }
                
                // USE WORKSPACE STORAGE (shared across all users in workspace)
                const ws = latestState.workspaceId;
                if (!ws) {
                  throw new Error('No workspace ID available');
                }
                
                // Get workspace data (or fallback to user data for migration)
                let slice = latestState.dataByWorkspace?.[ws];
                if (!slice && latestState.dataByUser?.[capturedUid]) {
                  // Migrate from old user storage
                  slice = latestState.dataByUser[capturedUid];
                }
                if (!slice) {
                  slice = { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] };
                }
                
                let { customers, parts, laborItems, jobs, quotes, invoices } = slice;
                
                // Ensure arrays exist
                customers = customers || [];
                parts = parts || [];
                laborItems = laborItems || [];
                jobs = jobs || [];
                quotes = quotes || [];
                invoices = invoices || [];
                
                const byId = {
                  customers: new Map(customers.map((r) => [r.id, r])),
                  parts: new Map(parts.map((r) => [r.id, r])),
                  laborItems: new Map(laborItems.map((r) => [r.id, r])),
                  jobs: new Map(jobs.map((r) => [r.id, r])),
                  quotes: new Map(quotes.map((r) => [r.id, r])),
                  invoices: new Map(invoices.map((r) => [r.id, r])),
                } as any;
                
                for (const ch of pull.changes) {
                  if (ch.operation === 'delete') { 
                    byId[ch.entity]?.delete(ch.row.id); 
                    continue; 
                  }
                  const cur = byId[ch.entity]?.get(ch.row.id);
                  if (!cur || (cur.updatedAt || '') < (ch.updatedAt || '')) {
                    byId[ch.entity]?.set(ch.row.id, ch.row);
                  }
                }
                
                customers = Array.from(byId.customers.values());
                parts = Array.from(byId.parts.values());
                laborItems = Array.from(byId.laborItems.values());
                jobs = Array.from(byId.jobs.values());
                quotes = Array.from(byId.quotes.values());
                invoices = Array.from(byId.invoices.values());
                
                // Validate store again before final state update
                const finalState = getStore();
                if (!finalState) {
                  throw new Error('finalState is null or undefined');
                }
                
                // Store in WORKSPACE (shared across all users/devices)
                setState({ 
                  dataByWorkspace: { 
                    ...finalState.dataByWorkspace, 
                    [ws]: { customers, parts, laborItems, jobs, quotes, invoices } 
                  }, 
                  lastSyncByUser: { ...finalState.lastSyncByUser, [capturedUid]: pull.serverTime } 
                });
                
                // Use captured uid value to prevent closure context loss
                syncTopLevel(getStore, setState, () => capturedUid);
              } catch (storeError: any) {
                console.log('Store context lost during pull processing');
                console.log('Error:', storeError?.message || 'Unknown error');
              }
            } else if (pull) {
              try {
                // Validate store references
                if (!getStore || typeof getStore !== 'function') {
                  throw new Error('getStore reference is invalid during timestamp update');
                }
                if (!setState || typeof setState !== 'function') {
                  throw new Error('setState reference is invalid during timestamp update');
                }
                
                const latestState = getStore();
                if (!latestState) {
                  throw new Error('latestState is null during timestamp update');
                }
                
                setState({ 
                  lastSyncByUser: { 
                    ...latestState.lastSyncByUser, 
                    [capturedUid]: pull.serverTime 
                  } 
                });
              } catch (storeError: any) {
                console.log('Store context lost during timestamp update');
                console.log('Error:', storeError?.message || 'Unknown error');
              }
            }
            
            // Clear any previous sync errors on successful sync
            setState({ syncError: null });
          } catch (error: any) {
            try {
              console.error('🚨 Sync failed:', error);
              
              // Handle authentication-related sync errors
              if (error.message?.includes('Invalid Refresh Token') || 
                  error.message?.includes('refresh_token') ||
                  error.message?.includes('Refresh Token Not Found') ||
                  error.message?.includes('JWT') ||
                  error.message?.includes('token') ||
                  error.message?.includes('unauthorized') ||
                  error.message?.includes('Unauthorized') ||
                  error.message?.includes('401')) {
                
                console.log('🔄 Authentication error during sync, clearing session');
                
                // Clear authentication state when sync fails due to token issues
                try {
                  // Validate store references before clearing
                  if (!getStore || typeof getStore !== 'function') {
                    throw new Error('getStore reference is invalid during auth clear');
                  }
                  if (!setState || typeof setState !== 'function') {
                    throw new Error('setState reference is invalid during auth clear');
                  }
                  
                  const storeForClear = getStore();
                  // Call clearAuthentication safely
                  if (storeForClear && typeof storeForClear.clearAuthentication === 'function') {
                    storeForClear.clearAuthentication();
                  } else {
                    // Manual authentication clearing if context is lost
                    setState({ 
                      authenticatedUser: null, 
                      isAuthenticated: false,
                      userEmail: null,
                      workspaceId: null,
                      workspaceName: null,
                      role: null,
                      currentUserId: null 
                    });
                  }
                } catch (clearError: any) {
                  console.error('🚨 Error clearing authentication during sync error:', clearError);
                  console.error('Auth clear error details:', {
                    hasGetStore: !!getStore,
                    hasSetState: !!setState,
                    errorMessage: clearError?.message || 'Unknown clear error'
                  });
                  
                  // Last resort: force authentication clear even if store context is lost
                  try {
                    setState({ 
                      authenticatedUser: null, 
                      isAuthenticated: false,
                      userEmail: null,
                      workspaceId: null,
                      workspaceName: null,
                      role: null,
                      currentUserId: null 
                    });
                  } catch (finalClearError: any) {
                    console.error('🚨 Critical: Cannot clear authentication state:', finalClearError);
                  }
                }
                
                setState({ syncError: 'Session expired. Please sign in again.' });
                
                // Try to clear stale session from auth service
                try {
                  const { authService } = require('../services/auth');
                  await authService.clearStaleSession();
                } catch (clearError) {
                  console.log('Note: Could not clear auth service session');
                }
              } else {
                // Other sync errors
                setState({ syncError: error.message || 'Sync failed. Please try again.' });
              }
            } catch (errorHandlingError) {
              console.error('🚨 Error during sync error handling:', errorHandlingError);
              // Last resort error state
              try {
                setState({ syncError: 'Sync failed with context error. Please restart app.' });
              } catch (finalError) {
                console.error('🚨 Critical: Cannot set sync error state');
              }
            }
          } finally {
            try {
              setState({ isSyncing: false });
            } catch (finallyError) {
              console.error('🚨 Error in sync finally block:', finallyError);
            }
          }
        },


        // CRUD
        addCustomer: (customerData) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          
          const customer: Customer = { ...customerData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const updated = { ...slice, customers: [...slice.customers, customer] }; 
          setWorkspaceData(updated); 
          appendChange('customers', 'create', customer, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        updateCustomer: (id, updates) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const updatedList = slice.customers.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)); 
          const updated = { ...slice, customers: updatedList }; 
          setWorkspaceData(updated); 
          const row = updatedList.find((c) => c.id === id); 
          if (row) appendChange('customers', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        deleteCustomer: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const row = slice.customers.find((c) => c.id === id); 
          const updated = { ...slice, customers: slice.customers.filter((c) => c.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) appendChange('customers', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },

        addPart: (partData) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const part: Part = { ...partData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const updated = { ...slice, parts: [...slice.parts, part] }; 
          setWorkspaceData(updated); 
          appendChange('parts', 'create', part, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        updatePart: (id, updates) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const updatedList = slice.parts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)); 
          const updated = { ...slice, parts: updatedList }; 
          setWorkspaceData(updated); 
          const row = updatedList.find((p) => p.id === id); 
          if (row) appendChange('parts', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        deletePart: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const row = slice.parts.find((p) => p.id === id); 
          const updated = { ...slice, parts: slice.parts.filter((p) => p.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) appendChange('parts', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },

        addLaborItem: (itemData) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const item: LaborItem = { ...itemData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const updated = { ...slice, laborItems: [...slice.laborItems, item] }; 
          setWorkspaceData(updated); 
          appendChange('laborItems', 'create', item, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        updateLaborItem: (id, updates) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const updatedList = slice.laborItems.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it)); 
          const updated = { ...slice, laborItems: updatedList }; 
          setWorkspaceData(updated); 
          const row = updatedList.find((it) => it.id === id); 
          if (row) appendChange('laborItems', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        deleteLaborItem: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const row = slice.laborItems.find((it) => it.id === id); 
          const updated = { ...slice, laborItems: slice.laborItems.filter((it) => it.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) appendChange('laborItems', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },

        // Job CRUD (simplified - no pricing)
        addJob: (jobData) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const job: Job = { ...jobData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const updated = { ...slice, jobs: [...slice.jobs, job] }; 
          setWorkspaceData(updated); 
          appendChange('jobs', 'create', job, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        updateJob: (id, updates) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const updatedJobs = slice.jobs.map((job) => (job.id === id ? { ...job, ...updates, updatedAt: new Date().toISOString() } : job)); 
          const updated = { ...slice, jobs: updatedJobs }; 
          setWorkspaceData(updated); 
          const row = updatedJobs.find((j) => j.id === id); 
          if (row) appendChange('jobs', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        deleteJob: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          const row = slice.jobs.find((j) => j.id === id); 
          const updated = { ...slice, jobs: slice.jobs.filter((j) => j.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) appendChange('jobs', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },

        // Quote CRUD
        addQuote: (quoteData) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          
          const quoteNumber = get().generateQuoteNumber();
          const totals = get().calculateQuoteTotal(quoteData.items, quoteData.taxRate);
          const quote: Quote = { 
            ...quoteData, 
            id: uuidv4(), 
            quoteNumber,
            ...totals,
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
          }; 
          const updated = { ...slice, quotes: [...(slice.quotes || []), quote] }; 
          setWorkspaceData(updated); 
          appendChange('quotes', 'create', quote, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync(); // Automatic background sync
        },
        updateQuote: (id, updates) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          
          const updatedQuotes = (slice.quotes || []).map((quote) => {
            if (quote.id === id) {
              const updatedQuote = { ...quote, ...updates, updatedAt: new Date().toISOString() };
              if (updates.items || updates.taxRate !== undefined) {
                const totals = get().calculateQuoteTotal(updatedQuote.items, updatedQuote.taxRate);
                return { ...updatedQuote, ...totals };
              }
              return updatedQuote;
            }
            return quote;
          }); 
          const updated = { ...slice, quotes: updatedQuotes }; 
          setWorkspaceData(updated); 
          const row = updatedQuotes.find((q) => q.id === id); 
          if (row) {
            appendChange('quotes', 'update', row, get, set, getCurrentUserId); 
          }
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync(); // Automatic background sync
        },
        deleteQuote: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          
          const row = (slice.quotes || []).find((q) => q.id === id); 
          const updated = { ...slice, quotes: (slice.quotes || []).filter((q) => q.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) {
            appendChange('quotes', 'delete', row, get, set, getCurrentUserId); 
          }
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync(); // Automatic background sync
        },

        // Invoice CRUD
        addInvoice: (invoiceData) => {
          const slice = getWorkspaceData();
          if (!slice) return;

          const invoiceNumber = get().generateInvoiceNumber();
          const totals = get().calculateInvoiceTotal(invoiceData.items, invoiceData.taxRate);
          const invoice: Invoice = {
            ...invoiceData,
            id: uuidv4(),
            invoiceNumber,
            ...totals,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Reduce stock for parts in the invoice
          const updatedParts = (slice.parts || []).map((part) => {
            const partItem = invoice.items.find(item => item.type === 'part' && item.itemId === part.id);
            if (partItem) {
              const newStock = Math.max(0, part.stock - partItem.quantity);
              return { ...part, stock: newStock, updatedAt: new Date().toISOString() };
            }
            return part;
          });

          const updated = {
            ...slice,
            invoices: [...(slice.invoices || []), invoice],
            parts: updatedParts
          };
          setWorkspaceData(updated);
          appendChange('invoices', 'create', invoice, get, set, getCurrentUserId);

          // Also log part updates as changes
          invoice.items.forEach(item => {
            if (item.type === 'part') {
              const updatedPart = updatedParts.find(p => p.id === item.itemId);
              if (updatedPart) {
                appendChange('parts', 'update', updatedPart, get, set, getCurrentUserId);
              }
            }
          });

          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },
        updateInvoice: (id, updates) => {
          console.log('🔧 updateInvoice called with id:', id, 'updates.items:', !!updates.items);

          const slice = getWorkspaceData();
          if (!slice) return;

          const originalInvoice = (slice.invoices || []).find((i) => i.id === id);
          if (!originalInvoice) {
            console.log('❌ Original invoice not found for id:', id);
            return;
          }

          console.log('📋 Original invoice items count:', originalInvoice.items.length);
          console.log('📋 New items count:', updates.items ? updates.items.length : 'N/A');

          const updatedInvoices = (slice.invoices || []).map((invoice) => {
            if (invoice.id === id) {
              const updatedInvoice = { ...invoice, ...updates, updatedAt: new Date().toISOString() };
              if (updates.items || updates.taxRate !== undefined) {
                const totals = get().calculateInvoiceTotal(updatedInvoice.items, updatedInvoice.taxRate);
                return { ...updatedInvoice, ...totals };
              }
              return updatedInvoice;
            }
            return invoice;
          });

          let updatedParts = slice.parts || [];

          // If items were updated, adjust stock accordingly
          if (updates.items) {
            console.log('🔍 Processing stock updates...');
            const newItems = updates.items;
            const oldItems = originalInvoice.items;

            // Calculate stock changes for each part
            const stockChanges = new Map<string, number>(); // partId -> quantity change

            // Process old items (restore stock)
            oldItems.forEach(item => {
              if (item.type === 'part' && item.itemId) {
                const currentChange = stockChanges.get(item.itemId) || 0;
                stockChanges.set(item.itemId, currentChange + item.quantity);
                console.log(`  Old item: ${item.itemId}, qty: ${item.quantity}, restore: +${item.quantity}`);
              }
            });

            // Process new items (reduce stock)
            newItems.forEach(item => {
              if (item.type === 'part' && item.itemId) {
                const currentChange = stockChanges.get(item.itemId) || 0;
                stockChanges.set(item.itemId, currentChange - item.quantity);
                console.log(`  New item: ${item.itemId}, qty: ${item.quantity}, reduce: -${item.quantity}`);
              }
            });

            console.log(`📊 Stock changes for ${stockChanges.size} parts`);

            // Apply stock changes
            updatedParts = updatedParts.map(part => {
              const change = stockChanges.get(part.id);
              if (change !== undefined && change !== 0) {
                const newStock = Math.max(0, part.stock + change);
                console.log(`📦 Stock update for ${part.name}: ${part.stock} + (${change}) = ${newStock}`);
                return { ...part, stock: newStock, updatedAt: new Date().toISOString() };
              }
              return part;
            });

            // Log part updates as changes
            stockChanges.forEach((change, partId) => {
              if (change !== 0) {
                const updatedPart = updatedParts.find(p => p.id === partId);
                if (updatedPart) {
                  appendChange('parts', 'update', updatedPart, get, set, getCurrentUserId);
                }
              }
            });
          } else {
            console.log('⚠️ No items in updates, skipping stock update');
          }

          const updated = { ...slice, invoices: updatedInvoices, parts: updatedParts };
          setWorkspaceData(updated);
          const row = updatedInvoices.find((i) => i.id === id);
          if (row) {
            appendChange('invoices', 'update', row, get, set, getCurrentUserId);
          }
          syncTopLevel(get, set, getCurrentUserId);
          // Don't auto-sync immediately after invoice update to avoid race condition
          // where pull fetches stale part data before push commits the stock changes
          // Background sync will handle it after a delay
          // triggerAutoSync();
        },
        deleteInvoice: (id) => { 
          const slice = getWorkspaceData();
          if (!slice) return;
          
          const row = (slice.invoices || []).find((i) => i.id === id); 
          const updated = { ...slice, invoices: (slice.invoices || []).filter((i) => i.id !== id) }; 
          setWorkspaceData(updated); 
          if (row) {
            appendChange('invoices', 'delete', row, get, set, getCurrentUserId); 
          }
          syncTopLevel(get, set, getCurrentUserId);
          triggerAutoSync();
        },

        // Utility functions
        getCustomerById: (id) => get().customers.find((c) => c.id === id),
        getPartById: (id) => get().parts.find((p) => p.id === id),
        getPartBySku: (sku) => get().parts.find((p) => p.sku && p.sku.toLowerCase() === sku.toLowerCase()),
        getLaborItemById: (id) => get().laborItems.find((it) => it.id === id),
        getJobById: (id) => get().jobs.find((j) => j.id === id),
        getQuoteById: (id) => get().quotes.find((q) => q.id === id),
        getInvoiceById: (id) => get().invoices.find((i) => i.id === id),
        getJobQuotes: (jobId) => get().quotes.filter((q) => q.jobId === jobId),
        getJobInvoices: (jobId) => get().invoices.filter((i) => i.jobId === jobId),
        generateQuoteNumber: () => {
          const state = get();
          const existingQuotes = state.quotes || [];
          const nextNumber = existingQuotes.length + 1;
          return `Q-${nextNumber.toString().padStart(4, '0')}`;
        },
        generateInvoiceNumber: () => {
          const state = get();
          const existingInvoices = state.invoices || [];
          const nextNumber = existingInvoices.length + 1;
          return `INV-${nextNumber.toString().padStart(4, '0')}`;
        },
        calculateQuoteTotal: (items, taxRate) => {
          const settings = get().settings;
          const rate = taxRate !== undefined ? taxRate : settings.defaultTaxRate;
          return calculateJobTotals(items, rate, settings.enableTax);
        },
        calculateInvoiceTotal: (items, taxRate) => {
          const settings = get().settings;
          const rate = taxRate !== undefined ? taxRate : settings.defaultTaxRate;
          return calculateJobTotals(items, rate, settings.enableTax);
        },

        // Settings management
        getSettings: () => get().settings,
        updateSettings: (updates) => {
          const currentSettings = get().settings;
          const updatedSettings = {
            ...currentSettings,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          set({ settings: updatedSettings });
        },
        resetSettings: () => {
          const now = new Date().toISOString();
          set({
            settings: {
              ...DEFAULT_BUSINESS_SETTINGS,
              createdAt: now,
              updatedAt: now
            }
          });
        },

      };
    },
    {
      name: 'job-management-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 6,
      migrate: (state: any, version) => {
        if (version < 2) {
          const now = new Date().toISOString();
          const id = uuidv4();
          const customers = state?.customers || [];
          const parts = state?.parts || [];
          const laborItems = state?.laborItems || [];
          const jobs = state?.jobs || [];
          return { ...state, users: [{ id, name: 'Default', createdAt: now, updatedAt: now }], currentUserId: id, dataByUser: { [id]: { customers, parts, laborItems, jobs, quotes: [], invoices: [] } }, customers, parts, laborItems, jobs, quotes: [], invoices: [], outboxByUser: { [id]: [] }, lastSyncByUser: { [id]: null } };
        }
        if (version < 3) {
          const uid = state.currentUserId || (state.users && state.users[0]?.id) || uuidv4();
          return { ...state, deviceId: state.deviceId || uuidv4(), outboxByUser: state.outboxByUser || { [uid]: [] }, lastSyncByUser: state.lastSyncByUser || { [uid]: null }, isSyncing: false, syncError: null };
        }
        if (version < 4) {
          return { ...state, userEmail: state.userEmail || null, workspaceId: state.workspaceId || null, role: state.role || null };
        }
        if (version < 5) {
          // Migration to separate jobs from quotes/invoices
          const migratedJobs = (state.jobs || []).map((job: any) => {
            // Remove pricing fields from jobs, keeping only project management fields
            const { items, subtotal, tax, taxRate, total, ...projectFields } = job;
            return {
              ...projectFields,
              status: job.status === 'quote' ? 'active' : job.status === 'approved' ? 'active' : job.status === 'in-progress' ? 'active' : job.status
            };
          });

          // Convert old jobs with pricing to quotes where appropriate  
          const migratedQuotes = (state.jobs || [])
            .filter((job: any) => job.status === 'quote' && job.items && job.items.length > 0)
            .map((job: any, index: number) => ({
              id: uuidv4(),
              jobId: job.id,
              customerId: job.customerId,
              quoteNumber: `Q-${(index + 1).toString().padStart(4, '0')}`,
              title: job.title,
              description: job.description,
              status: 'draft',
              items: job.items || [],
              subtotal: job.subtotal || 0,
              tax: job.tax || 0,
              taxRate: job.taxRate || 0,
              total: job.total || 0,
              notes: job.notes,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt
            }));

          // Update dataByUser for all users
          const updatedDataByUser = { ...state.dataByUser };
          Object.keys(updatedDataByUser).forEach(userId => {
            const userData = updatedDataByUser[userId];
            updatedDataByUser[userId] = {
              ...userData,
              jobs: migratedJobs,
              quotes: migratedQuotes.filter((q: any) => migratedJobs.find((j: any) => j.id === q.jobId)),
              invoices: []
            };
          });

          return { 
            ...state, 
            jobs: migratedJobs,
            quotes: migratedQuotes,
            invoices: [],
            dataByUser: updatedDataByUser
          };
        }
        if (version < 6) {
          // Add business settings with tax disabled by default
          const now = new Date().toISOString();
          return {
            ...state,
            settings: {
              ...DEFAULT_BUSINESS_SETTINGS,
              createdAt: now,
              updatedAt: now
            }
          };
        }
        return state as any;
      },
    }
  )
);
