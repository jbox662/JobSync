import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Customer, Part, LaborItem, Job, JobItem, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface JobStore extends AppState {
  // Multi-user
  users: User[];
  currentUserId: string | null;
  dataByUser: Record<string, AppState>;
  createUser: (name: string) => string;
  switchUser: (id: string) => void;
  renameUser: (id: string, name: string) => void;
  deleteUser: (id: string) => void;

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
      // Helper: sync top-level arrays from active user bucket
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

      // Initialize with a default user
      const now = new Date().toISOString();
      const defaultId = uuidv4();

      return {
        // Active user view (kept in sync)
        customers: [],
        parts: [],
        laborItems: [],
        jobs: [],

        // Multi-user state
        users: [{ id: defaultId, name: 'Default', createdAt: now, updatedAt: now }],
        currentUserId: defaultId,
        dataByUser: {
          [defaultId]: { customers: [], parts: [], laborItems: [], jobs: [] },
        },

        // User actions
        createUser: (name: string) => {
          const id = uuidv4();
          const ts = new Date().toISOString();
          set((state) => ({
            users: [...state.users, { id, name: name.trim() || 'User', createdAt: ts, updatedAt: ts }],
            dataByUser: { ...state.dataByUser, [id]: { customers: [], parts: [], laborItems: [], jobs: [] } },
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
            const remaining = state.users.filter((u) => u.id !== id);
            let nextId = state.currentUserId;
            if (state.currentUserId === id) {
              nextId = remaining[0]?.id || null;
            }
            return {
              users: remaining,
              dataByUser: rest,
              currentUserId: nextId,
            } as Partial<JobStore>;
          });
          // Ensure always at least one user exists
          const s = get();
          if (!s.currentUserId || s.users.length === 0) {
            const nid = (get().createUser('Default'));
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
          syncTopLevel();
        },
        updateCustomer: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = {
            ...slice,
            customers: slice.customers.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
          };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          syncTopLevel();
        },
        deleteCustomer: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = { ...slice, customers: slice.customers.filter((c) => c.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
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
          syncTopLevel();
        },
        updatePart: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = {
            ...slice,
            parts: slice.parts.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
          };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          syncTopLevel();
        },
        deletePart: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = { ...slice, parts: slice.parts.filter((p) => p.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
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
          syncTopLevel();
        },
        updateLaborItem: (id, updates) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = {
            ...slice,
            laborItems: slice.laborItems.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: new Date().toISOString() } : it)),
          };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          syncTopLevel();
        },
        deleteLaborItem: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = { ...slice, laborItems: slice.laborItems.filter((it) => it.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
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
          syncTopLevel();
        },
        deleteJob: (id) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updated = { ...slice, jobs: slice.jobs.filter((j) => j.id !== id) };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
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
          syncTopLevel();
        },
        removeJobItem: (jobId, itemId) => {
          const state = get();
          const uid = state.currentUserId!;
          const slice = state.dataByUser[uid];
          const updatedJobs = slice.jobs.map((job) => {
            if (job.id === jobId) {
              const items = job.items.filter((it) => it.id !== itemId);
              const totals = calculateJobTotals(items, job.taxRate);
              return { ...job, items, ...totals, updatedAt: new Date().toISOString() };
            }
            return job;
          });
          const updated = { ...slice, jobs: updatedJobs };
          set({ dataByUser: { ...state.dataByUser, [uid]: updated } });
          syncTopLevel();
        },

        // Utility functions
        getCustomerById: (id) => {
          const state = get();
          return state.customers.find((c) => c.id === id);
        },
        getPartById: (id) => {
          const state = get();
          return state.parts.find((p) => p.id === id);
        },
        getLaborItemById: (id) => {
          const state = get();
          return state.laborItems.find((it) => it.id === id);
        },
        getJobById: (id) => {
          const state = get();
          return state.jobs.find((j) => j.id === id);
        },
        calculateJobTotal: (job) => calculateJobTotals(job.items, job.taxRate),
      };
    },
    {
      name: 'job-management-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (state: any, version) => {
        if (version < 2) {
          // If coming from v1 shape without multi-user, migrate into default user bucket
          const hasBuckets = state && state.dataByUser;
          if (!hasBuckets) {
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
            };
          }
        }
        return state as any;
      },
    }
  )
);
