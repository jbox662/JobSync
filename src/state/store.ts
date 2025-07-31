import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Customer, Part, LaborItem, Job, JobItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface JobStore extends AppState {
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
    (set, get) => ({
      customers: [],
      parts: [],
      laborItems: [],
      jobs: [],

      // Customer actions
      addCustomer: (customerData) => {
        const customer: Customer = {
          ...customerData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          customers: [...state.customers, customer],
        }));
      },

      updateCustomer: (id, updates) => {
        set((state) => ({
          customers: state.customers.map((customer) =>
            customer.id === id
              ? { ...customer, ...updates, updatedAt: new Date().toISOString() }
              : customer
          ),
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((customer) => customer.id !== id),
        }));
      },

      // Part actions
      addPart: (partData) => {
        const part: Part = {
          ...partData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          parts: [...state.parts, part],
        }));
      },

      updatePart: (id, updates) => {
        set((state) => ({
          parts: state.parts.map((part) =>
            part.id === id
              ? { ...part, ...updates, updatedAt: new Date().toISOString() }
              : part
          ),
        }));
      },

      deletePart: (id) => {
        set((state) => ({
          parts: state.parts.filter((part) => part.id !== id),
        }));
      },

      // Labor item actions
      addLaborItem: (itemData) => {
        const item: LaborItem = {
          ...itemData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          laborItems: [...state.laborItems, item],
        }));
      },

      updateLaborItem: (id, updates) => {
        set((state) => ({
          laborItems: state.laborItems.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      deleteLaborItem: (id) => {
        set((state) => ({
          laborItems: state.laborItems.filter((item) => item.id !== id),
        }));
      },

      // Job actions
      addJob: (jobData) => {
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
        set((state) => ({
          jobs: [...state.jobs, job],
        }));
      },

      updateJob: (id, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id === id) {
              const updatedJob = { ...job, ...updates, updatedAt: new Date().toISOString() };
              if (updates.items || updates.taxRate) {
                const totals = calculateJobTotals(updatedJob.items, updatedJob.taxRate);
                return { ...updatedJob, ...totals };
              }
              return updatedJob;
            }
            return job;
          }),
        }));
      },

      deleteJob: (id) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id),
        }));
      },

      addJobItem: (jobId, itemData) => {
        const item: JobItem = {
          ...itemData,
          id: uuidv4(),
          total: itemData.quantity * itemData.unitPrice,
        };
        
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id === jobId) {
              const updatedItems = [...job.items, item];
              const totals = calculateJobTotals(updatedItems, job.taxRate);
              return {
                ...job,
                items: updatedItems,
                ...totals,
                updatedAt: new Date().toISOString(),
              };
            }
            return job;
          }),
        }));
      },

      updateJobItem: (jobId, itemId, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id === jobId) {
              const updatedItems = job.items.map((item) => {
                if (item.id === itemId) {
                  const updatedItem = { ...item, ...updates };
                  updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
                  return updatedItem;
                }
                return item;
              });
              const totals = calculateJobTotals(updatedItems, job.taxRate);
              return {
                ...job,
                items: updatedItems,
                ...totals,
                updatedAt: new Date().toISOString(),
              };
            }
            return job;
          }),
        }));
      },

      removeJobItem: (jobId, itemId) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id === jobId) {
              const updatedItems = job.items.filter((item) => item.id !== itemId);
              const totals = calculateJobTotals(updatedItems, job.taxRate);
              return {
                ...job,
                items: updatedItems,
                ...totals,
                updatedAt: new Date().toISOString(),
              };
            }
            return job;
          }),
        }));
      },

      // Utility functions
      getCustomerById: (id) => {
        return get().customers.find((customer) => customer.id === id);
      },

      getPartById: (id) => {
        return get().parts.find((part) => part.id === id);
      },

      getLaborItemById: (id) => {
        return get().laborItems.find((item) => item.id === id);
      },

      getJobById: (id) => {
        return get().jobs.find((job) => job.id === id);
      },

      calculateJobTotal: (job) => {
        return calculateJobTotals(job.items, job.taxRate);
      },
    }),
    {
      name: 'job-management-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);