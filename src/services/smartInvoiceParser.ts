import { useJobStore } from '../state/store';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Smart Invoice Parser Service
 * Handles importing invoices from various formats (Square, QuickBooks, etc.)
 */

export interface ParsedInvoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  notes?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentUrl?: string;
}

class SmartInvoiceParser {
  private static instance: SmartInvoiceParser;

  static getInstance(): SmartInvoiceParser {
    if (!SmartInvoiceParser.instance) {
      SmartInvoiceParser.instance = new SmartInvoiceParser();
    }
    return SmartInvoiceParser.instance;
  }

  /**
   * Parse invoice from any file format
   */
  async parseInvoiceFile(): Promise<{ success: boolean; message: string; invoice?: ParsedInvoice }> {
    try {
      // Let user pick any file
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user'
        };
      }

      const file = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(file.uri);

      // Use AI to parse the invoice
      const parsedInvoice = await this.parseWithAI(fileContent, file.name);

      if (!parsedInvoice) {
        return {
          success: false,
          message: 'Could not parse invoice. Please check the file format.'
        };
      }

      return {
        success: true,
        message: 'Invoice parsed successfully',
        invoice: parsedInvoice
      };
    } catch (error) {
      console.error('Invoice parsing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse invoice'
      };
    }
  }

  /**
   * Use AI to intelligently parse invoice data
   */
  private async parseWithAI(fileContent: string, fileName: string): Promise<ParsedInvoice | null> {
    try {
      const prompt = `Parse this invoice data and extract the following information in JSON format:
{
  "invoiceNumber": "string",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD or null",
  "customer": {
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "subtotal": number,
  "tax": number or null,
  "taxRate": number or null,
  "total": number,
  "notes": "string or null",
  "status": "draft|sent|paid|overdue|cancelled",
  "paymentUrl": "string or null"
}

Invoice data:
${fileContent}

Return ONLY the JSON object, no other text.`;

      const { getOpenAIClient } = require('../api/openai');
      const openai = getOpenAIClient();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.1
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as ParsedInvoice;
    } catch (error) {
      console.error('AI parsing error:', error);
      return null;
    }
  }

  /**
   * Import parsed invoice into the app
   */
  async importParsedInvoice(parsedInvoice: ParsedInvoice): Promise<{ success: boolean; message: string }> {
    try {
      const store = useJobStore.getState();

      // 1. Find or create customer
      let customer = store.customers.find(c => 
        c.email === parsedInvoice.customer.email || 
        c.name.toLowerCase() === parsedInvoice.customer.name.toLowerCase()
      );

      if (!customer) {
        // Create new customer
        customer = {
          id: this.generateId(),
          name: parsedInvoice.customer.name,
          email: parsedInvoice.customer.email || '',
          phone: parsedInvoice.customer.phone || '',
          address: parsedInvoice.customer.address || '',
          company: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store.addCustomer(customer);
      }

      // 2. Create invoice items
      const items = parsedInvoice.items.map(item => ({
        id: this.generateId(),
        type: 'labor' as const,
        itemId: '',
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      // 3. Create invoice
      const invoice = {
        id: this.generateId(),
        customerId: customer.id,
        jobId: '',
        quoteId: '',
        invoiceNumber: parsedInvoice.invoiceNumber,
        title: `Invoice ${parsedInvoice.invoiceNumber} - ${customer.name}`,
        description: parsedInvoice.notes || '',
        status: parsedInvoice.status || 'sent',
        items: items,
        subtotal: parsedInvoice.subtotal,
        tax: parsedInvoice.tax || 0,
        taxRate: parsedInvoice.taxRate || 0,
        total: parsedInvoice.total,
        notes: parsedInvoice.notes || '',
        dueDate: parsedInvoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentTerms: 'Net 30',
        sentAt: parsedInvoice.issueDate ? new Date(parsedInvoice.issueDate).toISOString() : undefined,
        paidAt: parsedInvoice.status === 'paid' ? new Date().toISOString() : undefined,
        paidAmount: parsedInvoice.status === 'paid' ? parsedInvoice.total : 0,
        createdAt: parsedInvoice.issueDate || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.addInvoice(invoice);

      return {
        success: true,
        message: `Successfully imported invoice ${parsedInvoice.invoiceNumber} for ${customer.name}`
      };
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import invoice'
      };
    }
  }

  /**
   * Parse invoice from text/CSV data (Square format)
   */
  parseSquareInvoice(content: string): ParsedInvoice | null {
    try {
      const lines = content.split('\n');
      const data: any = {};

      // Parse field-value pairs
      for (const line of lines) {
        const [field, ...valueParts] = line.split(/\t|,/);
        const value = valueParts.join(',').trim();
        if (field && value) {
          data[field.trim()] = value;
        }
      }

      // Extract invoice data
      return {
        invoiceNumber: data['Invoice Number'] || '',
        issueDate: this.parseDate(data['Issue Date']) || new Date().toISOString().split('T')[0],
        dueDate: this.parseDate(data['Due Date']),
        customer: {
          name: data['Customer Name'] || '',
          email: data['Customer Email'] || '',
          phone: data['Customer Phone'] || '',
          address: data['Customer Address'] || ''
        },
        items: [{
          description: data['Item Description'] || data['Item Details'] || 'Service',
          quantity: parseInt(data['Quantity']) || 1,
          unitPrice: this.parseAmount(data['Unit Price']) || 0,
          total: this.parseAmount(data['Line Amount']) || this.parseAmount(data['Total Due']) || 0
        }],
        subtotal: this.parseAmount(data['Subtotal']) || this.parseAmount(data['Total Due']) || 0,
        tax: 0,
        taxRate: 0,
        total: this.parseAmount(data['Total Due']) || 0,
        notes: '',
        status: 'sent',
        paymentUrl: data['Payment URL']
      };
    } catch (error) {
      console.error('Square parsing error:', error);
      return null;
    }
  }

  private parseDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return undefined;
    }
  }

  private parseAmount(amountStr: string | undefined): number {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const smartInvoiceParser = SmartInvoiceParser.getInstance();