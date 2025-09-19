import { useJobStore } from '../state/store';
import { Customer, Part, LaborItem, Job, Quote, Invoice } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export interface ExportData {
  customers: Customer[];
  parts: Part[];
  laborItems: LaborItem[];
  jobs: Job[];
  quotes: Quote[];
  invoices: Invoice[];
  exportedAt: string;
  workspaceName?: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    customers: number;
    parts: number;
    laborItems: number;
    jobs: number;
    quotes: number;
    invoices: number;
  };
}

class ImportExportService {
  private static instance: ImportExportService;
  
  static getInstance(): ImportExportService {
    if (!ImportExportService.instance) {
      ImportExportService.instance = new ImportExportService();
    }
    return ImportExportService.instance;
  }

  /**
   * Export all business data to JSON file
   */
  async exportAllData(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const store = useJobStore.getState();
      const { customers, parts, laborItems, jobs, quotes, invoices, workspaceName } = store;

      const exportData: ExportData = {
        customers,
        parts,
        laborItems,
        jobs,
        quotes,
        invoices,
        exportedAt: new Date().toISOString(),
        workspaceName: workspaceName || 'Unknown Workspace',
        version: '1.0'
      };

      const fileName = `business-data-export-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(exportData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Business Data'
        });
      }

      return {
        success: true,
        message: `Successfully exported all business data to ${fileName}`,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export specific data type to CSV
   */
  async exportToCSV(dataType: 'customers' | 'parts' | 'laborItems' | 'jobs' | 'quotes' | 'invoices'): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const store = useJobStore.getState();
      const data = store[dataType];

      if (!data || data.length === 0) {
        return {
          success: false,
          message: `No ${dataType} data to export`
        };
      }

      const csv = this.convertToCSV(data, dataType);
      const fileName = `${dataType}-export-${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        filePath,
        csv,
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`
        });
      }

      return {
        success: true,
        message: `Successfully exported ${data.length} ${dataType} records to ${fileName}`,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'CSV export failed'
      };
    }
  }

  /**
   * Import data from JSON file
   */
  async importFromFile(): Promise<ImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user'
        };
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const importData: ExportData = JSON.parse(fileContent);

      // Validate import data structure
      if (!this.validateImportData(importData)) {
        return {
          success: false,
          message: 'Invalid file format. Please select a valid business data export file.'
        };
      }

      return await this.processImportData(importData);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Import failed'
      };
    }
  }

  /**
   * Import data from CSV file
   */
  async importFromCSV(dataType: 'customers' | 'parts' | 'laborItems' | 'jobs' | 'quotes' | 'invoices'): Promise<ImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user'
        };
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const records = this.parseCSV(fileContent, dataType);

      if (records.length === 0) {
        return {
          success: false,
          message: 'No valid records found in CSV file'
        };
      }

      // Import records
      const store = useJobStore.getState();
      const importCount = await this.importRecords(dataType, records, store);

      return {
        success: true,
        message: `Successfully imported ${importCount} ${dataType} records`,
        imported: { [dataType]: importCount } as any
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'CSV import failed'
      };
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[], dataType: string): string {
    if (data.length === 0) return '';

    const headers = this.getCSVHeaders(dataType);
    const rows = data.map(item => this.formatCSVRow(item, dataType));
    
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get CSV headers for each data type
   */
  private getCSVHeaders(dataType: string): string[] {
    switch (dataType) {
      case 'customers':
        return ['ID', 'Name', 'Email', 'Phone', 'Company', 'Address', 'Created At', 'Updated At'];
      case 'parts':
        return ['ID', 'Name', 'Description', 'Unit Price', 'Stock', 'SKU', 'Category', 'Created At', 'Updated At'];
      case 'laborItems':
        return ['ID', 'Description', 'Hourly Rate', 'Category', 'Created At', 'Updated At'];
      case 'jobs':
        return ['ID', 'Customer ID', 'Title', 'Description', 'Status', 'Notes', 'Start Date', 'Due Date', 'Completed At', 'Estimated Hours', 'Actual Hours', 'Created At', 'Updated At'];
      case 'quotes':
        return ['ID', 'Job ID', 'Customer ID', 'Quote Number', 'Title', 'Description', 'Status', 'Subtotal', 'Tax', 'Tax Rate', 'Total', 'Notes', 'Valid Until', 'Sent At', 'Approved At', 'Created At', 'Updated At'];
      case 'invoices':
        return ['ID', 'Job ID', 'Customer ID', 'Quote ID', 'Invoice Number', 'Title', 'Description', 'Status', 'Subtotal', 'Tax', 'Tax Rate', 'Total', 'Notes', 'Due Date', 'Payment Terms', 'Sent At', 'Paid At', 'Paid Amount', 'Created At', 'Updated At'];
      default:
        return [];
    }
  }

  /**
   * Format a row for CSV export
   */
  private formatCSVRow(item: any, dataType: string): string {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    switch (dataType) {
      case 'customers':
        return [
          escapeCSV(item.id),
          escapeCSV(item.name),
          escapeCSV(item.email),
          escapeCSV(item.phone),
          escapeCSV(item.company),
          escapeCSV(item.address),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      case 'parts':
        return [
          escapeCSV(item.id),
          escapeCSV(item.name),
          escapeCSV(item.description),
          escapeCSV(item.unitPrice),
          escapeCSV(item.stock),
          escapeCSV(item.sku),
          escapeCSV(item.category),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      case 'laborItems':
        return [
          escapeCSV(item.id),
          escapeCSV(item.description),
          escapeCSV(item.hourlyRate),
          escapeCSV(item.category),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      case 'jobs':
        return [
          escapeCSV(item.id),
          escapeCSV(item.customerId),
          escapeCSV(item.title),
          escapeCSV(item.description),
          escapeCSV(item.status),
          escapeCSV(item.notes),
          escapeCSV(item.startDate),
          escapeCSV(item.dueDate),
          escapeCSV(item.completedAt),
          escapeCSV(item.estimatedHours),
          escapeCSV(item.actualHours),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      case 'quotes':
        return [
          escapeCSV(item.id),
          escapeCSV(item.jobId),
          escapeCSV(item.customerId),
          escapeCSV(item.quoteNumber),
          escapeCSV(item.title),
          escapeCSV(item.description),
          escapeCSV(item.status),
          escapeCSV(item.subtotal),
          escapeCSV(item.tax),
          escapeCSV(item.taxRate),
          escapeCSV(item.total),
          escapeCSV(item.notes),
          escapeCSV(item.validUntil),
          escapeCSV(item.sentAt),
          escapeCSV(item.approvedAt),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      case 'invoices':
        return [
          escapeCSV(item.id),
          escapeCSV(item.jobId),
          escapeCSV(item.customerId),
          escapeCSV(item.quoteId),
          escapeCSV(item.invoiceNumber),
          escapeCSV(item.title),
          escapeCSV(item.description),
          escapeCSV(item.status),
          escapeCSV(item.subtotal),
          escapeCSV(item.tax),
          escapeCSV(item.taxRate),
          escapeCSV(item.total),
          escapeCSV(item.notes),
          escapeCSV(item.dueDate),
          escapeCSV(item.paymentTerms),
          escapeCSV(item.sentAt),
          escapeCSV(item.paidAt),
          escapeCSV(item.paidAmount),
          escapeCSV(item.createdAt),
          escapeCSV(item.updatedAt)
        ].join(',');
      default:
        return '';
    }
  }

  /**
   * Parse CSV content into records
   */
  private parseCSV(content: string, dataType: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record = this.createRecordFromCSV(headers, values, dataType);
        if (record) records.push(record);
      }
    }

    return records;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Create a record object from CSV data
   */
  private createRecordFromCSV(headers: string[], values: string[], dataType: string): any {
    const record: any = {};
    
    // Skip if required fields are missing
    if (dataType === 'customers' && !values[headers.indexOf('Name')]) return null;
    if (dataType === 'parts' && !values[headers.indexOf('Name')]) return null;
    if (dataType === 'laborItems' && !values[headers.indexOf('Description')]) return null;
    if (dataType === 'jobs' && !values[headers.indexOf('Title')]) return null;

    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Map header to property name
      const prop = this.getPropertyName(header, dataType);
      if (prop) {
        record[prop] = this.parseValue(value, prop);
      }
    });

    // Generate new ID if not provided
    if (!record.id) {
      record.id = require('uuid').v4();
    }

    // Set timestamps if not provided
    const now = new Date().toISOString();
    if (!record.createdAt) record.createdAt = now;
    if (!record.updatedAt) record.updatedAt = now;

    return record;
  }

  /**
   * Map CSV header to property name
   */
  private getPropertyName(header: string, dataType: string): string | null {
    const headerMap: Record<string, string> = {
      'ID': 'id',
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Company': 'company',
      'Address': 'address',
      'Description': 'description',
      'Unit Price': 'unitPrice',
      'Stock': 'stock',
      'SKU': 'sku',
      'Category': 'category',
      'Hourly Rate': 'hourlyRate',
      'Customer ID': 'customerId',
      'Title': 'title',
      'Status': 'status',
      'Notes': 'notes',
      'Start Date': 'startDate',
      'Due Date': 'dueDate',
      'Completed At': 'completedAt',
      'Estimated Hours': 'estimatedHours',
      'Actual Hours': 'actualHours',
      'Job ID': 'jobId',
      'Quote Number': 'quoteNumber',
      'Subtotal': 'subtotal',
      'Tax': 'tax',
      'Tax Rate': 'taxRate',
      'Total': 'total',
      'Valid Until': 'validUntil',
      'Sent At': 'sentAt',
      'Approved At': 'approvedAt',
      'Quote ID': 'quoteId',
      'Invoice Number': 'invoiceNumber',
      'Payment Terms': 'paymentTerms',
      'Paid At': 'paidAt',
      'Paid Amount': 'paidAmount',
      'Created At': 'createdAt',
      'Updated At': 'updatedAt'
    };

    return headerMap[header] || null;
  }

  /**
   * Parse value based on property type
   */
  private parseValue(value: string, property: string): any {
    if (!value) return undefined;

    // Numeric fields
    if (['unitPrice', 'stock', 'hourlyRate', 'estimatedHours', 'actualHours', 'subtotal', 'tax', 'taxRate', 'total', 'paidAmount'].includes(property)) {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }

    // Date fields
    if (['startDate', 'dueDate', 'completedAt', 'validUntil', 'sentAt', 'approvedAt', 'paidAt', 'createdAt', 'updatedAt'].includes(property)) {
      return value ? new Date(value).toISOString() : undefined;
    }

    return value;
  }

  /**
   * Validate import data structure
   */
  private validateImportData(data: any): data is ExportData {
    return (
      typeof data === 'object' &&
      Array.isArray(data.customers) &&
      Array.isArray(data.parts) &&
      Array.isArray(data.laborItems) &&
      Array.isArray(data.jobs) &&
      Array.isArray(data.quotes) &&
      Array.isArray(data.invoices) &&
      typeof data.exportedAt === 'string'
    );
  }

  /**
   * Process import data and add to store
   */
  private async processImportData(importData: ExportData): Promise<ImportResult> {
    const store = useJobStore.getState();
    const imported = {
      customers: 0,
      parts: 0,
      laborItems: 0,
      jobs: 0,
      quotes: 0,
      invoices: 0
    };

    try {
      // Import customers
      importData.customers.forEach(customer => {
        if (customer.name) {
          store.addCustomer(customer);
          imported.customers++;
        }
      });

      // Import parts
      importData.parts.forEach(part => {
        if (part.name) {
          store.addPart(part);
          imported.parts++;
        }
      });

      // Import labor items
      importData.laborItems.forEach(labor => {
        if (labor.description) {
          store.addLaborItem(labor);
          imported.laborItems++;
        }
      });

      // Import jobs
      importData.jobs.forEach(job => {
        if (job.title && job.customerId) {
          store.addJob(job);
          imported.jobs++;
        }
      });

      // Import quotes
      importData.quotes.forEach(quote => {
        if (quote.title && quote.customerId) {
          store.addQuote(quote);
          imported.quotes++;
        }
      });

      // Import invoices
      importData.invoices.forEach(invoice => {
        if (invoice.title && invoice.customerId) {
          store.addInvoice(invoice);
          imported.invoices++;
        }
      });

      const total = Object.values(imported).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        message: `Successfully imported ${total} records`,
        imported
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Import processing failed'
      };
    }
  }

  /**
   * Import records for a specific data type
   */
  private async importRecords(dataType: string, records: any[], store: any): Promise<number> {
    let imported = 0;

    records.forEach(record => {
      try {
        switch (dataType) {
          case 'customers':
            if (record.name) {
              store.addCustomer(record);
              imported++;
            }
            break;
          case 'parts':
            if (record.name) {
              store.addPart(record);
              imported++;
            }
            break;
          case 'laborItems':
            if (record.description) {
              store.addLaborItem(record);
              imported++;
            }
            break;
          case 'jobs':
            if (record.title && record.customerId) {
              store.addJob(record);
              imported++;
            }
            break;
          case 'quotes':
            if (record.title && record.customerId) {
              store.addQuote(record);
              imported++;
            }
            break;
          case 'invoices':
            if (record.title && record.customerId) {
              store.addInvoice(record);
              imported++;
            }
            break;
        }
      } catch (error) {
        // Skip invalid records
        console.warn(`Failed to import record:`, error);
      }
    });

    return imported;
  }
}

export const importExportService = ImportExportService.getInstance();
