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
  price: number; // Alias for unitPrice for compatibility
  stock: number;
  lowStockThreshold?: number; // Alert when stock falls below this
  sku?: string;
  brand?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaborItem {
  id: string;
  name: string;
  description?: string;
  hourlyRate: number;
  price: number; // Alias for hourlyRate for compatibility
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
  rate: number; // Alias for unitPrice for compatibility
  total: number;
  description?: string;
}

// Updated Job interface - focused on project management
export interface Job {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: 'not-started' | 'waiting-quote' | 'quote-sent' | 'quote-approved' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  items?: JobItem[];
}

// New Quote interface
export interface Quote {
  id: string;
  jobId: string;
  customerId: string;
  quoteNumber: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  items: JobItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  approvedAt?: string;
  // Enhanced quote details
  scopeOfWork?: string;
  specifications?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  warranty?: string;
  additionalNotes?: string;
  companyInfo?: {
    name?: string;
    address?: string;
    contact?: string;
  };
  // Attachments
  attachments?: Array<{
    id: string;
    name: string;
    uri: string;
    size: number;
    type: string;
  }>;
}

// New Invoice interface
export interface Invoice {
  id: string;
  jobId: string;
  customerId: string;
  quoteId?: string; // Optional - can be created from quote or standalone
  invoiceNumber: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: JobItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  dueDate: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
  reminderEnabled?: boolean;
  reminderFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  lastReminderSent?: string;
  nextReminderDue?: string;
  reminderCount?: number;
  paidAmount?: number;
  // Attachments
  attachments?: Array<{
    id: string;
    name: string;
    uri: string;
    size: number;
    type: string;
  }>;
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

export type SyncEntity = 'customers' | 'parts' | 'laborItems' | 'jobs' | 'quotes' | 'invoices' | 'jobItems';

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
  quotes: Quote[];
  invoices: Invoice[];
}

// Re-export settings types
export * from './settings';