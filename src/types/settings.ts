export interface BusinessSettings {
  // Tax Configuration
  enableTax: boolean;
  defaultTaxRate: number;
  
  // Business Information  
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  
  // Invoice/Quote Defaults
  defaultPaymentTerms?: string;
  defaultValidityDays?: number; // For quotes
  
  // Display Preferences
  currencySymbol: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  
  // System
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BUSINESS_SETTINGS: Omit<BusinessSettings, 'createdAt' | 'updatedAt'> = {
  enableTax: false,
  defaultTaxRate: 0,
  defaultPaymentTerms: 'Net 30 days',
  defaultValidityDays: 30,
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY'
};