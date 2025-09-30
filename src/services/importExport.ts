import { useJobStore } from '../state/store';
import { Customer, Part, LaborItem, Job, Quote, Invoice } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

// Conditional import for expo-print (only available in native builds)
let Print: any = null;
try {
  Print = require('expo-print');
} catch (error) {
  console.log('expo-print not available - PDF export will be disabled');
}

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
   * Export quotes to PDF
   */
  async exportQuotesToPDF(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Check if Print module is available
      if (!Print || !Print.printToFileAsync) {
        return {
          success: false,
          message: 'PDF export is not available in this build. Please use CSV export or rebuild with: bun run build:dev:ios'
        };
      }

      const store = useJobStore.getState();
      const { quotes, getCustomerById, getJobById } = store;

      if (!quotes || quotes.length === 0) {
        return {
          success: false,
          message: 'No quotes data to export'
        };
      }

      const html = this.generateQuotesPDFHTML(quotes, getCustomerById, getJobById);
      const { uri } = await Print.printToFileAsync({ html });
      
      // Create a better filename
      const fileName = `quotes-export-${new Date().toISOString().split('T')[0]}.pdf`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: newPath });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Quotes'
        });
      }

      return {
        success: true,
        message: `Successfully exported ${quotes.length} quotes to PDF`,
        filePath: newPath
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Export invoices to PDF
   */
  async exportInvoicesToPDF(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // Check if Print module is available
      if (!Print || !Print.printToFileAsync) {
        return {
          success: false,
          message: 'PDF export is not available in this build. Please use CSV export or rebuild with: bun run build:dev:ios'
        };
      }

      const store = useJobStore.getState();
      const { invoices, getCustomerById, getJobById } = store;

      if (!invoices || invoices.length === 0) {
        return {
          success: false,
          message: 'No invoices data to export'
        };
      }

      const html = this.generateInvoicesPDFHTML(invoices, getCustomerById, getJobById);
      const { uri } = await Print.printToFileAsync({ html });
      
      // Create a better filename
      const fileName = `invoices-export-${new Date().toISOString().split('T')[0]}.pdf`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: newPath });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Invoices'
        });
      }

      return {
        success: true,
        message: `Successfully exported ${invoices.length} invoices to PDF`,
        filePath: newPath
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Generate HTML for quotes PDF
   */
  private generateQuotesPDFHTML(quotes: Quote[], getCustomerById: any, getJobById: any): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const quoteRows = quotes.map(quote => {
      const customer = getCustomerById(quote.customerId);
      const job = getJobById(quote.jobId);
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${quote.quoteNumber}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${quote.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${customer?.name || 'Unknown'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job?.title || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${quote.status}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(quote.total)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(quote.createdAt)}</td>
        </tr>
      `;
    }).join('');

    const totalAmount = quotes.reduce((sum, q) => sum + q.total, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Quotes Export</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            font-size: 12px;
            color: #1f2937;
          }
          h1 {
            color: #111827;
            margin-bottom: 10px;
            font-size: 24px;
          }
          .header {
            margin-bottom: 30px;
          }
          .export-date {
            color: #6b7280;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          .summary {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .summary-label {
            font-weight: 600;
            color: #374151;
          }
          .summary-value {
            color: #1f2937;
            font-weight: 700;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Quotes Export</h1>
          <p class="export-date">Exported on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Job</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${quoteRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Total Quotes:</span>
            <span class="summary-value">${quotes.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Value:</span>
            <span class="summary-value">${formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for invoices PDF
   */
  private generateInvoicesPDFHTML(invoices: Invoice[], getCustomerById: any, getJobById: any): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const invoiceRows = invoices.map(invoice => {
      const customer = getCustomerById(invoice.customerId);
      const job = getJobById(invoice.jobId);
      const statusColor = invoice.status === 'paid' ? '#10b981' : invoice.status === 'overdue' ? '#ef4444' : '#6b7280';
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${invoice.invoiceNumber}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${invoice.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${customer?.name || 'Unknown'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job?.title || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${invoice.status}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(invoice.total)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(invoice.dueDate)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${invoice.paidAt ? formatDate(invoice.paidAt) : '-'}</td>
        </tr>
      `;
    }).join('');

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.paidAmount || inv.total), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Invoices Export</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            font-size: 12px;
            color: #1f2937;
          }
          h1 {
            color: #111827;
            margin-bottom: 10px;
            font-size: 24px;
          }
          .header {
            margin-bottom: 30px;
          }
          .export-date {
            color: #6b7280;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
          }
          th:nth-child(6), td:nth-child(6) {
            text-align: right;
          }
          .summary {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .summary-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .summary-label {
            font-weight: 600;
            color: #374151;
          }
          .summary-value {
            font-weight: 700;
            font-size: 16px;
          }
          .value-invoiced { color: #1f2937; }
          .value-paid { color: #10b981; }
          .value-outstanding { color: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoices Export</h1>
          <p class="export-date">Exported on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Job</th>
              <th>Status</th>
              <th>Total</th>
              <th>Due Date</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Total Invoices:</span>
            <span class="summary-value value-invoiced">${invoices.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Invoiced:</span>
            <span class="summary-value value-invoiced">${formatCurrency(totalInvoiced)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Paid:</span>
            <span class="summary-value value-paid">${formatCurrency(totalPaid)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Outstanding:</span>
            <span class="summary-value value-outstanding">${formatCurrency(totalOutstanding)}</span>
          </div>
        </div>
      </body>
      </html>
    `;
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
      
      if (!fileContent || fileContent.trim().length === 0) {
        return {
          success: false,
          message: 'CSV file is empty'
        };
      }

      const records = this.parseCSV(fileContent, dataType);

      console.log(`Parsed ${records.length} records from CSV`);
      console.log('Sample record:', records[0]);

      if (records.length === 0) {
        return {
          success: false,
          message: 'No valid records found in CSV file. Please check the CSV format matches the export format.'
        };
      }

      // Import records
      const store = useJobStore.getState();
      const importCount = await this.importRecords(dataType, records, store);

      if (importCount === 0) {
        return {
          success: false,
          message: `Could not import any ${dataType}. Check that:\n• CSV headers match export format\n• Required fields (title, customerId) are present\n• Customer IDs exist in your database`
        };
      }

      return {
        success: true,
        message: `Successfully imported ${importCount} ${dataType} record${importCount !== 1 ? 's' : ''}`,
        imported: { [dataType]: importCount } as any
      };
    } catch (error) {
      console.error('CSV import error:', error);
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
    const errors: string[] = [];

    records.forEach((record, index) => {
      try {
        switch (dataType) {
          case 'customers':
            if (record.name) {
              store.addCustomer(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing name`);
            }
            break;
          case 'parts':
            if (record.name) {
              store.addPart(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing name`);
            }
            break;
          case 'laborItems':
            if (record.description) {
              store.addLaborItem(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing description`);
            }
            break;
          case 'jobs':
            if (record.title && record.customerId) {
              store.addJob(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing ${!record.title ? 'title' : 'customerId'}`);
            }
            break;
          case 'quotes':
            if (record.title && record.customerId) {
              store.addQuote(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing ${!record.title ? 'title' : 'customerId'}`);
            }
            break;
          case 'invoices':
            if (record.title && record.customerId) {
              store.addInvoice(record);
              imported++;
            } else {
              errors.push(`Row ${index + 2}: Missing ${!record.title ? 'title' : 'customerId'}`);
            }
            break;
        }
      } catch (error) {
        // Skip invalid records
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Import failed'}`);
        console.warn(`Failed to import record:`, error);
      }
    });

    // Log errors for debugging
    if (errors.length > 0) {
      console.log('Import errors:', errors.slice(0, 10)); // Log first 10 errors
    }

    return imported;
  }
}

export const importExportService = ImportExportService.getInstance();

