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
  dataByUser: Record<string, AppState>;

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
  generateSampleData: () => void;
  
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

      const syncTopLevel = (getStore?: () => any, setState?: (state: any) => void, getUserId?: (() => string | null) | string) => {
        try {
          // Enhanced null checking and store validation
          if (!getStore && !get) {
            console.error('[syncTopLevel] No store getter available');
            return;
          }
          if (!setState && !set) {
            console.error('[syncTopLevel] No state setter available');
            return;
          }
          
          // Use provided store references or fallback to original get/set
          const getRef = getStore || get;
          const setRef = setState || set;
          
          // Handle uid parameter - can be a function or direct string value
          let uid: string | null = null;
          if (typeof getUserId === 'string') {
            // Direct string value passed
            uid = getUserId;
          } else if (typeof getUserId === 'function') {
            // Function that returns uid
            try {
              uid = getUserId();
            } catch (uidError) {
              console.warn('[syncTopLevel] Error getting uid from function:', uidError);
              uid = null;
            }
          } else {
            // Fallback to getCurrentUserId
            try {
              uid = getCurrentUserId();
            } catch (uidError) {
              console.warn('[syncTopLevel] Error getting uid from getCurrentUserId:', uidError);
              uid = null;
            }
          }
          
          if (!uid) {
            console.warn('[syncTopLevel] No user ID available');
            return;
          }
          
          // Safely get state
          let state: any;
          try {
            state = getRef();
          } catch (stateError) {
            console.error('[syncTopLevel] Error getting state:', stateError);
            return;
          }
          
          if (!state?.dataByUser?.[uid]) {
            console.warn('[syncTopLevel] No user data slice available for uid:', uid);
            return;
          }
          
          const slice = state.dataByUser[uid];
          
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
        dataByUser: {},

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
          const existingData = get().dataByUser[user.id];
          
          set({ 
            authenticatedUser: user, 
            isAuthenticated: true,
            isSupabaseConfigured: true, // If authenticated, Supabase is definitely working
            userEmail: user.email,
            workspaceId: user.workspaceId || null,
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
            // Initialize user-specific data (preserve existing data if it exists)
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
                
                if (!latestState.dataByUser || !latestState.dataByUser[capturedUid]) {
                  throw new Error(`User data slice not found for uid: ${capturedUid}`);
                }
                
                const slice = latestState.dataByUser[capturedUid];
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
                
                setState({ 
                  dataByUser: { 
                    ...finalState.dataByUser, 
                    [capturedUid]: { customers, parts, laborItems, jobs, quotes, invoices } 
                  }, 
                  lastSyncByUser: { ...finalState.lastSyncByUser, [capturedUid]: pull.serverTime } 
                });
                
                // Use captured uid value to prevent closure context loss
                syncTopLevel(getStore, setState, () => capturedUid);
              } catch (storeError: any) {
                console.error('🚨 Store context lost during pull processing:', storeError);
                console.error('Store error details:', {
                  hasGetStore: !!getStore,
                  hasSetState: !!setState,
                  capturedUid,
                  errorMessage: storeError?.message || 'Unknown error',
                  errorStack: storeError?.stack || 'No stack trace available'
                });
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
                console.error('🚨 Store context lost during timestamp update:', storeError);
                console.error('Timestamp update error details:', {
                  hasGetStore: !!getStore,
                  hasSetState: !!setState,
                  capturedUid,
                  errorMessage: storeError?.message || 'Unknown error'
                });
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
          const uid = getCurrentUserId(); 
          if (!uid) return; // No authenticated user
          const customer: Customer = { ...customerData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const state = get();
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const updated = { ...slice, customers: [...slice.customers, customer] }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
           appendChange('customers', 'create', customer, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId);
          // Note: Manual sync can be triggered via syncNow() when needed 
        },
        updateCustomer: (id, updates) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const updatedList = slice.customers.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)); const updated = { ...slice, customers: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((c) => c.id === id)!; appendChange('customers', 'update', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },
        deleteCustomer: (id) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const row = slice.customers.find((c) => c.id === id); const updated = { ...slice, customers: slice.customers.filter((c) => c.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('customers', 'delete', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },

        addPart: (partData) => { const uid = getCurrentUserId(); if (!uid) return; const part: Part = { ...partData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const updated = { ...slice, parts: [...slice.parts, part] }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); appendChange('parts', 'create', part, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },
        updatePart: (id, updates) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const updatedList = slice.parts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)); const updated = { ...slice, parts: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((p) => p.id === id)!; appendChange('parts', 'update', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },
        deletePart: (id) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const row = slice.parts.find((p) => p.id === id); const updated = { ...slice, parts: slice.parts.filter((p) => p.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('parts', 'delete', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },

        addLaborItem: (itemData) => { const uid = getCurrentUserId(); if (!uid) return; const item: LaborItem = { ...itemData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const updated = { ...slice, laborItems: [...slice.laborItems, item] }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); appendChange('laborItems', 'create', item, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },
        updateLaborItem: (id, updates) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const updatedList = slice.laborItems.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it)); const updated = { ...slice, laborItems: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((it) => it.id === id)!; appendChange('laborItems', 'update', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },
        deleteLaborItem: (id) => { const uid = getCurrentUserId(); if (!uid) return; const state = get(); const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; const row = slice.laborItems.find((it) => it.id === id); const updated = { ...slice, laborItems: slice.laborItems.filter((it) => it.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('laborItems', 'delete', row, get, set, getCurrentUserId); syncTopLevel(get, set, getCurrentUserId); },

        // Job CRUD (simplified - no pricing)
        addJob: (jobData) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const job: Job = { ...jobData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const updated = { ...slice, jobs: [...slice.jobs, job] }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          appendChange('jobs', 'create', job, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        updateJob: (id, updates) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const updatedJobs = slice.jobs.map((job) => (job.id === id ? { ...job, ...updates, updatedAt: new Date().toISOString() } : job)); 
          const updated = { ...slice, jobs: updatedJobs }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          const row = updatedJobs.find((j) => j.id === id)!; 
          appendChange('jobs', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        deleteJob: (id) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const row = slice.jobs.find((j) => j.id === id); 
          const updated = { ...slice, jobs: slice.jobs.filter((j) => j.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('jobs', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },

        // Quote CRUD
        addQuote: (quoteData) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
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
          const slice = state.dataByUser[uid]; 
          const updated = { ...slice, quotes: [...(slice.quotes || []), quote] }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          appendChange('quotes', 'create', quote, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        updateQuote: (id, updates) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
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
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          const row = updatedQuotes.find((q) => q.id === id)!; 
          appendChange('quotes', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        deleteQuote: (id) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const row = (slice.quotes || []).find((q) => q.id === id); 
          const updated = { ...slice, quotes: (slice.quotes || []).filter((q) => q.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('quotes', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },

        // Invoice CRUD
        addInvoice: (invoiceData) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
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
          const slice = state.dataByUser[uid]; 
          const updated = { ...slice, invoices: [...(slice.invoices || []), invoice] }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          appendChange('invoices', 'create', invoice, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        updateInvoice: (id, updates) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
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
          const updated = { ...slice, invoices: updatedInvoices }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          const row = updatedInvoices.find((i) => i.id === id)!; 
          appendChange('invoices', 'update', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },
        deleteInvoice: (id) => { 
          const uid = getCurrentUserId(); 
          if (!uid) return; 
          const state = get(); 
          const slice = state.dataByUser[uid] || { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] }; 
          const row = (slice.invoices || []).find((i) => i.id === id); 
          const updated = { ...slice, invoices: (slice.invoices || []).filter((i) => i.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('invoices', 'delete', row, get, set, getCurrentUserId); 
          syncTopLevel(get, set, getCurrentUserId); 
        },

        // Utility functions
        getCustomerById: (id) => get().customers.find((c) => c.id === id),
        getPartById: (id) => get().parts.find((p) => p.id === id),
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

        // Sample data generation
        generateSampleData: () => {
          console.log('[Store] Generating sample data...');
          const store = get();
          const { addCustomer, addPart, addLaborItem, addJob } = store;
          const now = new Date().toISOString();

          try {
            // Add sample customers
            addCustomer({
              name: "ACME Construction",
              email: "contact@acmeconstruction.com",
              phone: "(555) 123-4567",
              address: "123 Main St, Anytown, NY 12345",
              company: "ACME Construction LLC"
            });

            addCustomer({
              name: "Smith Residence", 
              email: "john@smithfamily.com",
              phone: "(555) 987-6543",
              address: "456 Oak Ave, Somewhere, CA 90210"
            });

            // Add sample parts
            addPart({
              name: "Premium Wood Flooring",
              description: "High-quality hardwood flooring planks",
              unitPrice: 8.50,
              price: 8.50,
              stock: 500,
              sku: "WF-001",
              category: "Flooring"
            });

            addPart({
              name: "Paint - Interior White",
              description: "Premium interior paint, 1 gallon",
              unitPrice: 45.00,
              price: 45.00,
              stock: 25,
              sku: "PT-002", 
              category: "Paint"
            });

            // Add sample labor items
            addLaborItem({
              name: "Flooring Installation",
              description: "Professional flooring installation service",
              hourlyRate: 75.00,
              price: 75.00,
              category: "Installation"
            });

            addLaborItem({
              name: "Interior Painting", 
              description: "Professional interior painting service",
              hourlyRate: 55.00,
              price: 55.00,
              category: "Painting"
            });

            // Get updated store state after adding items
            const updatedStore = get();
            const currentCustomers = updatedStore.customers;
            const currentParts = updatedStore.parts;
            const currentLabor = updatedStore.laborItems;

            if (currentCustomers.length >= 2 && currentParts.length >= 2 && currentLabor.length >= 2) {
              const customer1Id = currentCustomers[currentCustomers.length - 2].id; // Second to last (ACME)
              const customer2Id = currentCustomers[currentCustomers.length - 1].id; // Last (Smith)
              const part1Id = currentParts[currentParts.length - 2].id; // Wood flooring
              const part2Id = currentParts[currentParts.length - 1].id; // Paint
              const labor1Id = currentLabor[currentLabor.length - 2].id; // Flooring install
              const labor2Id = currentLabor[currentLabor.length - 1].id; // Interior painting

              // Add sample jobs with items
              const job1Items: JobItem[] = [
                {
                  id: Math.random().toString(36).substring(2),
                  type: 'part',
                  itemId: part1Id,
                  quantity: 100,
                  unitPrice: 8.50,
                  rate: 8.50,
                  total: 850.00,
                  description: "Premium wood flooring for living room"
                },
                {
                  id: Math.random().toString(36).substring(2),
                  type: 'labor',
                  itemId: labor1Id,
                  quantity: 12,
                  unitPrice: 75.00,
                  rate: 75.00,
                  total: 900.00,
                  description: "12 hours flooring installation"
                }
              ];

              addJob({
                customerId: customer1Id,
                title: "Office Renovation",
                description: "Complete office space renovation including new flooring",
                status: 'active',
                notes: "Client wants premium materials throughout",
                startDate: now,
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedHours: 40,
                items: job1Items
              });

              const job2Items: JobItem[] = [
                {
                  id: Math.random().toString(36).substring(2),
                  type: 'part',
                  itemId: part2Id,
                  quantity: 8,
                  unitPrice: 45.00,
                  rate: 45.00,
                  total: 360.00,
                  description: "Interior paint for bedrooms and hallway"
                },
                {
                  id: Math.random().toString(36).substring(2),
                  type: 'labor',
                  itemId: labor2Id,
                  quantity: 16,
                  unitPrice: 55.00,
                  rate: 55.00,
                  total: 880.00,
                  description: "16 hours interior painting"
                }
              ];

              addJob({
                customerId: customer2Id,
                title: "Home Interior Painting",
                description: "Paint bedrooms, hallway, and living areas",
                status: 'active',
                notes: "Customer prefers neutral colors",
                startDate: now,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedHours: 20,
                items: job2Items
              });

              console.log('[Store] Sample data generated successfully');
            } else {
              console.log('[Store] Not enough base data created for jobs');
            }
          } catch (error) {
            console.error('[Store] Error generating sample data:', error);
          }
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
