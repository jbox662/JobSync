export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Part {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  stock: number;
  sku?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaborItem {
  id: string;
  description: string;
  hourlyRate: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobItem {
  id: string;
  type: 'part' | 'labor';
  itemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
}

export interface Job {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: 'quote' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  items: JobItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completedAt?: string;
}

export interface User {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  remoteWorkspaceId?: string;
  inviteCode?: string;
  lastSyncAt?: string;
}

export type SyncEntity = 'customers' | 'parts' | 'laborItems' | 'jobs' | 'jobItems';

export interface ChangeEvent {
  id: string;
  entity: SyncEntity;
  operation: 'create' | 'update' | 'delete';
  row: any;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SyncConfig {
  baseUrl: string;
  apiKey: string;
}

export interface AppState {
  customers: Customer[];
  parts: Part[];
  laborItems: LaborItem[];
  jobs: Job[];
}
