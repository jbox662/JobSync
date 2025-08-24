import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Customer, Part, LaborItem, Job, JobItem, User, ChangeEvent, SyncConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createWorkspace, joinWorkspace, pushChanges, pullChanges } from '../api/sync-service';

interface JobStore extends AppState {
  // Multi-user local profiles (treated as workspaces for sync)
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
  createRemoteWorkspace: (name: string) => Promise<boolean>;
  joinRemoteWorkspace: (inviteCode: string) => Promise<boolean>;
  syncNow: () => Promise<void>;

  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  // Part actions
  addPart: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void;
  
  // Labor item actions
  addLaborItem: (item: Omit<LaborItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLaborItem: (id: string, updates: Partial<LaborItem>) => void;
  deleteLaborItem: (id: string) => void;
  
  // Job actions
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'total'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  addJobItem: (jobId: string, item: Omit<JobItem, 'id' | 'total'>) => void;
  updateJobItem: (jobId: string, itemId: string, updates: Partial<JobItem>) => void;
  removeJobItem: (jobId: string, itemId: string) => void;
  
  // Utility functions
  getCustomerById: (id: string) => Customer | undefined;
  getPartById: (id: string) => Part | undefined;
  getLaborItemById: (id: string) => LaborItem | undefined;
  getJobById: (id: string) => Job | undefined;
  calculateJobTotal: (job: Job) => { subtotal: number; total: number };
}

const calculateJobTotals = (items: JobItem[], taxRate: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
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
        set({
          customers: slice.customers,
          parts: slice.parts,
          laborItems: slice.laborItems,
          jobs: slice.jobs,
        } as Partial<JobStore>);
      };

      const now = new Date().toISOString();
      const defaultId = uuidv4();

      return {
        // Active view
        customers: [],
        parts: [],
        laborItems: [],
        jobs: [],

        // Profiles
        users: [{ id: defaultId, name: 'Default', createdAt: now, updatedAt: now }],
        currentUserId: defaultId,
        dataByUser: { [defaultId]: { customers: [], parts: [], laborItems: [], jobs: [] } },

        // Sync
        deviceId: uuidv4(),
        syncConfig: undefined,
        setSyncConfig: (cfg) => set({ syncConfig: cfg }),
        outboxByUser: { [defaultId]: [] },
        lastSyncByUser: { [defaultId]: null },
        isSyncing: false,
        syncError: null,

        // Remote workspace helpers
        createRemoteWorkspace: async (name: string) => {
          const res = await createWorkspace(name, get().syncConfig);
          if (!res) return false;
          const uid = get().currentUserId!;
          set((state) => ({
            users: state.users.map((u) => (u.id === uid ? { ...u, remoteWorkspaceId: res.workspaceId, inviteCode: res.inviteCode, updatedAt: new Date().toISOString() } : u)),
          }));
          return true;
        },
        joinRemoteWorkspace: async (inviteCode: string) => {
          const res = await joinWorkspace(inviteCode, get().syncConfig);
          if (!res) return false;
          const uid = get().currentUserId!;
          set((state) => ({
            users: state.users.map((u) => (u.id === uid ? { ...u, remoteWorkspaceId: res.workspaceId, inviteCode, updatedAt: new Date().toISOString() } : u)),
          }));
          return true;
        },
        syncNow: async () => {
          const uid = get().currentUserId!;
          const user = get().users.find((u) => u.id === uid);
          if (!user?.remoteWorkspaceId) {
            set({ syncError: 'Workspace not linked' });
            return;
          }
          set({ isSyncing: true, syncError: null });
          const cfg = get().syncConfig;
          const outbox = get().outboxByUser[uid] || [];
          const okPush = await pushChanges({ workspaceId: user.remoteWorkspaceId, deviceId: get().deviceId, changes: outbox }, cfg);
          if (okPush) {
            set({ outboxByUser: { ...get().outboxByUser, [uid]: [] } });
          }
          const since = get().lastSyncByUser[uid] || null;
          const pull = await pullChanges(user.remoteWorkspaceId, since, cfg);
          if (pull && pull.changes.length > 0) {
            // naive merge LWW by updatedAt at entity level
            const slice = get().dataByUser[uid];
            let { customers, parts, laborItems, jobs } = slice;
            const byId = {
              customers: new Map(customers.map((r) => [r.id, r])),
              parts: new Map(parts.map((r) => [r.id, r])),
              laborItems: new Map(laborItems.map((r) => [r.id, r])),
              jobs: new Map(jobs.map((r) => [r.id, r])),
            } as any;
            for (const ch of pull.changes) {
              if (ch.operation === 'delete') {
                byId[ch.entity].delete(ch.row.id);
                continue;
              }
              const cur = byId[ch.entity].get(ch.row.id);
              if (!cur || (cur.updatedAt || '') < (ch.updatedAt || '')) {
                byId[ch.entity].set(ch.row.id, ch.row);
              }
            }
            customers = Array.from(byId.customers.values());
            parts = Array.from(byId.parts.values());
            laborItems = Array.from(byId.laborItems.values());
            jobs = Array.from(byId.jobs.values());
            set({ dataByUser: { ...get().dataByUser, [uid]: { customers, parts, laborItems, jobs } }, lastSyncByUser: { ...get().lastSyncByUser, [uid]: pull.serverTime } });
            syncTopLevel();
          } else if (pull) {
            set({ lastSyncByUser: { ...get().lastSyncByUser, [uid]: pull.serverTime } });
          }
          set({ isSyncing: false });
        },

        // Profile actions
        createUser: (name: string) => {
          const id = uuidv4();
          const ts = new Date().toISOString();
          set((state) => ({
            users: [...state.users, { id, name: name.trim() || 'User', createdAt: ts, updatedAt: ts }],
            dataByUser: { ...state.dataByUser, [id]: { customers: [], parts: [], laborItems: [], jobs: [] } },
            outboxByUser: { ...state.outboxByUser, [id]: [] },
            lastSyncByUser: { ...state.lastSyncByUser, [id]: null },
          }));
          return id;
        },
        switchUser: (id: string) => {
          set({ currentUserId: id });
          syncTopLevel();
        },
        renameUser: (id: string, name: string) => {
          set((state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, name: name.trim() || u.name, updatedAt: new Date().toISOString() } : u)),
          }));
        },
        deleteUser: (id: string) => {
          set((state) => {
            const { [id]: _, ...rest } = state.dataByUser;
            const outbox = { ...state.outboxByUser };
            delete outbox[id];
            const remaining = state.users.filter((u) => u.id !== id);
            let nextId = state.currentUserId;
            if (state.currentUserId === id) {
              nextId = remaining[0]?.id || null;
            }
            return {
              users: remaining,
              dataByUser: rest,
              currentUserId: nextId,
              outboxByUser: outbox,
            } as Partial<JobStore>;
          });
          const s = get();
          if (!s.currentUserId || s.users.length === 0) {
            const nid = get().createUser('Default');
            get().switchUser(nid);
          } else {
            syncTopLevel();
          }
        },

        // Customer actions
        addCustomer: (customerData) => {
          const state = get();
          const uid = state.currentUserId!;
          const customer: Customer = {
            ...customerData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const slice = state.dataByUser[uid];
          const updated = { ...slice, customers: [...slice.customers, customer] };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          appendChange('customers', 'create', customer);
          syncTopLevel();
        },
        updateCustomer: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updatedList = slice.customers.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
          const updated = { ...slice, customers: updatedList };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          const row = updatedList.find((c) => c.id === id)!;
          appendChange('customers', 'update', row);
          syncTopLevel();
        },
        deleteCustomer: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const row = slice.customers.find((c) => c.id === id);
          const updated = { ...slice, customers: slice.customers.filter((c) => c.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          if (row) appendChange('customers', 'delete', row);
          syncTopLevel();
        },

        // Part actions
        addPart: (partData) => {
          const state = get();
          const uid = state.currentUserId!;
          const part: Part = {
            ...partData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const slice = state.dataByUser[uid];
          const updated = { ...slice, parts: [...slice.parts, part] };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          appendChange('parts', 'create', part);
          syncTopLevel();
        },
        updatePart: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updatedList = slice.parts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
          const updated = { ...slice, parts: updatedList };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          const row = updatedList.find((p) => p.id === id)!;
          appendChange('parts', 'update', row);
          syncTopLevel();
        },
        deletePart: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const row = slice.parts.find((p) => p.id === id);
          const updated = { ...slice, parts: slice.parts.filter((p) => p.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          if (row) appendChange('parts', 'delete', row);
          syncTopLevel();
        },

        // Labor item actions
        addLaborItem: (itemData) => {
          const state = get();
          const uid = state.currentUserId!;
          const item: LaborItem = {
            ...itemData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const slice = state.dataByUser[uid];
          const updated = { ...slice, laborItems: [...slice.laborItems, item] };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          appendChange('laborItems', 'create', item);
          syncTopLevel();
        },
        updateLaborItem: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updatedList = slice.laborItems.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it));
          const updated = { ...slice, laborItems: updatedList };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          const row = updatedList.find((it) => it.id === id)!;
          appendChange('laborItems', 'update', row);
          syncTopLevel();
        },
        deleteLaborItem: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const row = slice.laborItems.find((it) => it.id === id);
          const updated = { ...slice, laborItems: slice.laborItems.filter((it) => it.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          if (row) appendChange('laborItems', 'delete', row);
          syncTopLevel();
        },

        // Job actions
        addJob: (jobData) => {
          const state = get();
          const uid = state.currentUserId!;
          const { subtotal, tax, total } = calculateJobTotals(jobData.items, jobData.taxRate);
          const job: Job = {
            ...jobData,
            id: uuidv4(),
            subtotal,
            tax,
            total,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
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
          const updatedJobs = slice.jobs.map((job) => {
            if (job.id === id) {
              const updatedJob = { ...job, ...updates, updatedAt: new Date().toISOString() };
              if (updates.items || updates.taxRate !== undefined) {
                const totals = calculateJobTotals(updatedJob.items, updatedJob.taxRate);
                return { ...updatedJob, ...totals };
              }
              return updatedJob;
            }
            return job;
          });
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
        addJobItem: (jobId, itemData) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const item: JobItem = { ...itemData, id: uuidv4(), total: itemData.quantity * itemData.unitPrice };
          const updatedJobs = slice.jobs.map((job) => {
            if (job.id === jobId) {
              const items = [...job.items, item];
              const totals = calculateJobTotals(items, job.taxRate);
              return { ...job, items, ...totals, updatedAt: new Date().toISOString() };
            }
            return job;
          });
          const updated = { ...slice, jobs: updatedJobs };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          appendChange('jobItems', 'create', item);
          syncTopLevel();
        },
        updateJobItem: (jobId, itemId, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updatedJobs = slice.jobs.map((job) => {
            if (job.id === jobId) {
              const items = job.items.map((it) => {
                if (it.id === itemId) {
                  const updatedItem = { ...it, ...updates } as JobItem;
                  updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
                  return updatedItem;
                }
                return it;
              });
              const totals = calculateJobTotals(items, job.taxRate);
              return { ...job, items, ...totals, updatedAt: new Date().toISOString() };
            }
            return job;
          });
          const updated = { ...slice, jobs: updatedJobs };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          const changedItem = updatedJobs.find((j) => j.id === jobId)?.items.find((it) => it.id === itemId);
          if (changedItem) appendChange('jobItems', 'update', changedItem);
          syncTopLevel();
        },
        removeJobItem: (jobId, itemId) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          let removed: JobItem | undefined;
          const updatedJobs = slice.jobs.map((job) => {
            if (job.id === jobId) {
              const items = job.items.filter((it) => {
                const keep = it.id !== itemId;
                if (!keep) removed = it;
                return keep;
              });
              const totals = calculateJobTotals(items, job.taxRate);
              return { ...job, items, ...totals, updatedAt: new Date().toISOString() };
            }
            return job;
          });
          const updated = { ...slice, jobs: updatedJobs };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          if (removed) appendChange('jobItems', 'delete', removed);
          syncTopLevel();
        },

        // Utility
        getCustomerById: (id) => get().customers.find((c) => c.id === id),
        getPartById: (id) => get().parts.find((p) => p.id === id),
        getLaborItemById: (id) => get().laborItems.find((it) => it.id === id),
        getJobById: (id) => get().jobs.find((j) => j.id === id),
        calculateJobTotal: (job) => calculateJobTotals(job.items, job.taxRate),
      };
    },
    {
      name: 'job-management-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (state: any, version) => {
        if (version < 2) {
          const now = new Date().toISOString();
          const id = uuidv4();
          const customers = state?.customers || [];
          const parts = state?.parts || [];
          const laborItems = state?.laborItems || [];
          const jobs = state?.jobs || [];
          return {
            ...state,
            users: [{ id, name: 'Default', createdAt: now, updatedAt: now }],
            currentUserId: id,
            dataByUser: {
              [id]: { customers, parts, laborItems, jobs },
            },
            customers,
            parts,
            laborItems,
            jobs,
            outboxByUser: { [id]: [] },
            lastSyncByUser: { [id]: null },
          };
        }
        if (version < 3) {
          const uid = state.currentUserId || (state.users && state.users[0]?.id) || uuidv4();
          return {
            ...state,
            deviceId: state.deviceId || uuidv4(),
            outboxByUser: state.outboxByUser || { [uid]: [] },
            lastSyncByUser: state.lastSyncByUser || { [uid]: null },
            isSyncing: false,
            syncError: null,
          };
        }
        return state as any;
      },
    }
  )
);
