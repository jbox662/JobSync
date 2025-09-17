import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Customer, Part, LaborItem, Job, JobItem, Quote, Invoice, User, ChangeEvent, SyncConfig, BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createBusiness, createInvites, acceptInvite, listMembers, pushChanges, pullChanges } from '../api/sync-service';

interface JobStore extends AppState {
  // Business settings
  settings: BusinessSettings;
  
  // Business auth/link
  userEmail: string | null;
  workspaceId: string | null;
  workspaceName?: string | null;
  role: 'owner' | 'member' | null;
  linkBusinessOwner: (name: string, ownerEmail: string) => Promise<{ inviteCode?: string } | null>;
  inviteMembers: (emails: string[]) => Promise<Array<{ email: string; inviteCode: string }>>;
  acceptBusinessInvite: (email: string, inviteCode: string) => Promise<boolean>;
  listWorkspaceMembers: () => Promise<Array<{ email: string; role: string; createdAt: string }>>;
  logout: () => void;

  // Multi-profile local slices (kept for data scoping and persistence)
  users: User[];
  currentUserId: string | null;
  dataByUser: Record<string, AppState>;
  createUser: (name: string) => string;
  switchUser: (id: string) => void;
  renameUser: (id: string, name: string) => void;
  deleteUser: (id: string) => void;

  // Sync
  deviceId: string;
  syncConfig?: SyncConfig;
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
      const appendChange = (entity: ChangeEvent['entity'], operation: ChangeEvent['operation'], row: any) => {
        const uid = get().currentUserId!;
        const ev: ChangeEvent = {
          id: uuidv4(),
          entity,
          operation,
          row,
          updatedAt: new Date().toISOString(),
          deletedAt: operation === 'delete' ? new Date().toISOString() : null,
        };
        const cur = get().outboxByUser[uid] || [];
        set({ outboxByUser: { ...get().outboxByUser, [uid]: [...cur, ev] } });
      };

      const syncTopLevel = () => {
        const state = get();
        const uid = state.currentUserId;
        if (!uid || !state.dataByUser[uid]) return;
        const slice = state.dataByUser[uid];
        set({ customers: slice.customers, parts: slice.parts, laborItems: slice.laborItems, jobs: slice.jobs, quotes: slice.quotes || [], invoices: slice.invoices || [] } as Partial<JobStore>);
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

        // Business link
        userEmail: null,
        workspaceId: null,
        workspaceName: null,
        role: null,

        // Profiles
        users: [{ id: defaultId, name: 'Default', createdAt: now, updatedAt: now }],
        currentUserId: defaultId,
        dataByUser: { [defaultId]: { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] } },

        // Sync
        deviceId: uuidv4(),
        syncConfig: undefined,
        setSyncConfig: (cfg) => set({ syncConfig: cfg }),
        outboxByUser: { [defaultId]: [] },
        lastSyncByUser: { [defaultId]: null },
        isSyncing: false,
        syncError: null,

        // Business actions
        linkBusinessOwner: async (name: string, ownerEmail: string) => {
          const res = await createBusiness(name, ownerEmail, get().syncConfig);
          if (!res) return null;
          set({ workspaceId: res.workspaceId, role: 'owner', userEmail: ownerEmail, workspaceName: name });
          return { inviteCode: res.inviteCode };
        },
        inviteMembers: async (emails: string[]) => {
          const ws = get().workspaceId;
          if (!ws) return [];
          return await createInvites(ws, emails, get().syncConfig);
        },
        acceptBusinessInvite: async (email: string, inviteCode: string) => {
          const res = await acceptInvite(email, inviteCode, get().deviceId, get().syncConfig);
          if (!res) return false;
          set({ workspaceId: res.workspaceId, role: res.role, userEmail: email });
          return true;
        },
        listWorkspaceMembers: async () => {
          const ws = get().workspaceId;
          if (!ws) return [];
          return await listMembers(ws, get().syncConfig);
        },
        logout: () => {
          set({ userEmail: null, role: null, workspaceId: null });
        },

        // Sync Now
        syncNow: async () => {
          const ws = get().workspaceId;
          if (!ws) {
            set({ syncError: 'Workspace not linked' });
            return;
          }
          const uid = get().currentUserId!;
          set({ isSyncing: true, syncError: null });
          const cfg = get().syncConfig;
          const outbox = get().outboxByUser[uid] || [];
          const okPush = await pushChanges({ workspaceId: ws, deviceId: get().deviceId, changes: outbox }, cfg);
          if (okPush) set({ outboxByUser: { ...get().outboxByUser, [uid]: [] } });
          const since = get().lastSyncByUser[uid] || null;
          const pull = await pullChanges(ws, since, cfg);
          if (pull && pull.changes.length > 0) {
            const slice = get().dataByUser[uid];
            let { customers, parts, laborItems, jobs } = slice;
            const byId = {
              customers: new Map(customers.map((r) => [r.id, r])),
              parts: new Map(parts.map((r) => [r.id, r])),
              laborItems: new Map(laborItems.map((r) => [r.id, r])),
              jobs: new Map(jobs.map((r) => [r.id, r])),
            } as any;
            for (const ch of pull.changes) {
              if (ch.operation === 'delete') { byId[ch.entity].delete(ch.row.id); continue; }
              const cur = byId[ch.entity].get(ch.row.id);
              if (!cur || (cur.updatedAt || '') < (ch.updatedAt || '')) byId[ch.entity].set(ch.row.id, ch.row);
            }
            customers = Array.from(byId.customers.values());
            parts = Array.from(byId.parts.values());
            laborItems = Array.from(byId.laborItems.values());
            jobs = Array.from(byId.jobs.values());
            set({ dataByUser: { ...get().dataByUser, [uid]: { customers, parts, laborItems, jobs, quotes: slice.quotes || [], invoices: slice.invoices || [] } }, lastSyncByUser: { ...get().lastSyncByUser, [uid]: pull.serverTime } });
            syncTopLevel();
          } else if (pull) {
            set({ lastSyncByUser: { ...get().lastSyncByUser, [uid]: pull.serverTime } });
          }
          set({ isSyncing: false });
        },

        // Profile actions (kept)
        createUser: (name: string) => {
          const id = uuidv4();
          const ts = new Date().toISOString();
          set((state) => ({
            users: [...state.users, { id, name: name.trim() || 'User', createdAt: ts, updatedAt: ts }],
            dataByUser: { ...state.dataByUser, [id]: { customers: [], parts: [], laborItems: [], jobs: [], quotes: [], invoices: [] } },
            outboxByUser: { ...state.outboxByUser, [id]: [] },
            lastSyncByUser: { ...state.lastSyncByUser, [id]: null },
          }));
          return id;
        },
        switchUser: (id: string) => { set({ currentUserId: id }); syncTopLevel(); },
        renameUser: (id: string, name: string) => { set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, name: name.trim() || u.name, updatedAt: new Date().toISOString() } : u)) })); },
        deleteUser: (id: string) => {
          set((state) => {
            const { [id]: _, ...rest } = state.dataByUser;
            const outbox = { ...state.outboxByUser }; delete outbox[id];
            const remaining = state.users.filter((u) => u.id !== id);
            let nextId = state.currentUserId; if (state.currentUserId === id) nextId = remaining[0]?.id || null;
            return { users: remaining, dataByUser: rest, currentUserId: nextId, outboxByUser: outbox } as Partial<JobStore>;
          });
          const s = get(); if (!s.currentUserId || s.users.length === 0) { const nid = get().createUser('Default'); get().switchUser(nid); } else { syncTopLevel(); }
        },

        // CRUD
        addCustomer: (customerData) => { const state = get(); const uid = state.currentUserId!; const customer: Customer = { ...customerData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; const slice = state.dataByUser[uid]; const updated = { ...slice, customers: [...slice.customers, customer] }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); appendChange('customers', 'create', customer); syncTopLevel(); },
        updateCustomer: (id, updates) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const updatedList = slice.customers.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)); const updated = { ...slice, customers: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((c) => c.id === id)!; appendChange('customers', 'update', row); syncTopLevel(); },
        deleteCustomer: (id) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const row = slice.customers.find((c) => c.id === id); const updated = { ...slice, customers: slice.customers.filter((c) => c.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('customers', 'delete', row); syncTopLevel(); },

        addPart: (partData) => { const state = get(); const uid = state.currentUserId!; const part: Part = { ...partData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; const slice = state.dataByUser[uid]; const updated = { ...slice, parts: [...slice.parts, part] }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); appendChange('parts', 'create', part); syncTopLevel(); },
        updatePart: (id, updates) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const updatedList = slice.parts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)); const updated = { ...slice, parts: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((p) => p.id === id)!; appendChange('parts', 'update', row); syncTopLevel(); },
        deletePart: (id) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const row = slice.parts.find((p) => p.id === id); const updated = { ...slice, parts: slice.parts.filter((p) => p.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('parts', 'delete', row); syncTopLevel(); },

        addLaborItem: (itemData) => { const state = get(); const uid = state.currentUserId!; const item: LaborItem = { ...itemData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; const slice = state.dataByUser[uid]; const updated = { ...slice, laborItems: [...slice.laborItems, item] }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); appendChange('laborItems', 'create', item); syncTopLevel(); },
        updateLaborItem: (id, updates) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const updatedList = slice.laborItems.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it)); const updated = { ...slice, laborItems: updatedList }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); const row = updatedList.find((it) => it.id === id)!; appendChange('laborItems', 'update', row); syncTopLevel(); },
        deleteLaborItem: (id) => { const state = get(); const uid = state.currentUserId!; const slice = state.dataByUser[uid]; const row = slice.laborItems.find((it) => it.id === id); const updated = { ...slice, laborItems: slice.laborItems.filter((it) => it.id !== id) }; set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); if (row) appendChange('laborItems', 'delete', row); syncTopLevel(); },

        // Job CRUD (simplified - no pricing)
        addJob: (jobData) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const job: Job = { ...jobData, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          const slice = state.dataByUser[uid]; 
          const updated = { ...slice, jobs: [...slice.jobs, job] }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          appendChange('jobs', 'create', job); 
          syncTopLevel(); 
        },
        updateJob: (id, updates) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
          const updatedJobs = slice.jobs.map((job) => (job.id === id ? { ...job, ...updates, updatedAt: new Date().toISOString() } : job)); 
          const updated = { ...slice, jobs: updatedJobs }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          const row = updatedJobs.find((j) => j.id === id)!; 
          appendChange('jobs', 'update', row); 
          syncTopLevel(); 
        },
        deleteJob: (id) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
          const row = slice.jobs.find((j) => j.id === id); 
          const updated = { ...slice, jobs: slice.jobs.filter((j) => j.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('jobs', 'delete', row); 
          syncTopLevel(); 
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
          appendChange('quotes', 'create', quote); 
          syncTopLevel(); 
        },
        updateQuote: (id, updates) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
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
          appendChange('quotes', 'update', row); 
          syncTopLevel(); 
        },
        deleteQuote: (id) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
          const row = (slice.quotes || []).find((q) => q.id === id); 
          const updated = { ...slice, quotes: (slice.quotes || []).filter((q) => q.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('quotes', 'delete', row); 
          syncTopLevel(); 
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
          appendChange('invoices', 'create', invoice); 
          syncTopLevel(); 
        },
        updateInvoice: (id, updates) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
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
          appendChange('invoices', 'update', row); 
          syncTopLevel(); 
        },
        deleteInvoice: (id) => { 
          const state = get(); 
          const uid = state.currentUserId!; 
          const slice = state.dataByUser[uid]; 
          const row = (slice.invoices || []).find((i) => i.id === id); 
          const updated = { ...slice, invoices: (slice.invoices || []).filter((i) => i.id !== id) }; 
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } }); 
          if (row) appendChange('invoices', 'delete', row); 
          syncTopLevel(); 
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
