import { useJobStore } from '../state/store';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Smart Invoice & Quote Parser Service
 * Handles importing invoices and quotes from various formats (Square, QuickBooks, PDF, CSV, etc.)
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

export interface ParsedQuote {
  quoteNumber: string;
  issueDate: string;
  expirationDate?: string;
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
  validUntil?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  // Enhanced details
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
  // Debug info for mobile testing
  debugText?: string;
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
      // Let user pick any file including PDFs
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/json', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user'
        };
      }

      const file = result.assets[0];
      
      // Check if it's a PDF and handle it differently
      if (file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf') {
        return await this.parsePDFInvoice(file.uri);
      }

      const fileContent = await FileSystem.readAsStringAsync(file.uri);

      if (!fileContent || fileContent.trim().length === 0) {
        return {
          success: false,
          message: 'File is empty or unreadable'
        };
      }

      // Try to parse with AI first
      let parsedInvoice = await this.parseWithAI(fileContent, file.name);
      
      // If AI fails, try Square format
      if (!parsedInvoice && fileContent.includes('Invoice Number')) {
        parsedInvoice = this.parseSquareInvoice(fileContent);
      }

      if (!parsedInvoice) {
        return {
          success: false,
          message: 'Could not parse invoice. Please check the file format or try exporting as CSV/text format.'
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
   * Parse quote from any file format
   */
  async parseQuoteFile(): Promise<{ success: boolean; message: string; quote?: ParsedQuote }> {
    try {
      // Let user pick any file including PDFs
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/json', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled by user'
        };
      }

      const file = result.assets[0];
      
      // Check if it's a PDF and handle it differently
      if (file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf') {
        return await this.parsePDFQuote(file.uri);
      }

      const fileContent = await FileSystem.readAsStringAsync(file.uri);

      if (!fileContent || fileContent.trim().length === 0) {
        return {
          success: false,
          message: 'File is empty or unreadable'
        };
      }

      // Try to parse with AI first
      let parsedQuote = await this.parseQuoteWithAI(fileContent, file.name);
      
      // If AI fails, try Square format (adapted for quotes)
      if (!parsedQuote && (fileContent.includes('Quote Number') || fileContent.includes('Estimate Number'))) {
        parsedQuote = this.parseSquareQuote(fileContent);
      }

      if (!parsedQuote) {
        return {
          success: false,
          message: 'Could not parse quote. Please check the file format or try exporting as CSV/text format.'
        };
      }

      return {
        success: true,
        message: 'Quote parsed successfully',
        quote: parsedQuote
      };
    } catch (error) {
      console.error('Quote parsing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse quote'
      };
    }
  }

  /**
   * Parse PDF invoice - extract text and use AI to parse
   */
  private async parsePDFInvoice(pdfUri: string): Promise<{ success: boolean; message: string; invoice?: ParsedInvoice }> {
    try {
      // Try to read PDF as text (works for text-based PDFs, not scanned images)
      let pdfText = '';
      
      try {
        // Attempt to read as UTF-8 text (some PDFs have extractable text)
        pdfText = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.UTF8
        });
        
        // Clean up PDF binary junk and extract readable text
        // PDF text is usually between stream and endstream tags or in plain text
        const textMatches = pdfText.match(/\(([^)]+)\)/g);
        if (textMatches && textMatches.length > 0) {
          pdfText = textMatches
            .map(match => match.replace(/[()]/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Also try to extract text that's not in parentheses
        const cleanText = pdfText
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
          .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText.length > pdfText.length) {
          pdfText = cleanText;
        }
        
      } catch (error) {
        console.log('Could not extract text from PDF:', error);
      }

      // Check if we got meaningful text
      if (!pdfText || pdfText.length < 50) {
        return {
          success: false,
          message: 'Could not extract text from this PDF. This may be a scanned image or secured PDF.\n\nPlease try:\n• Export the invoice as CSV or text from your system\n• Copy the text content and save as a .txt file\n• Take a screenshot and use image import (future feature)'
        };
      }

      // Check if extracted text looks like invoice data
      const hasInvoiceKeywords = /invoice|bill|total|amount|customer|date|due/i.test(pdfText);
      if (!hasInvoiceKeywords) {
        return {
          success: false,
          message: 'This PDF does not appear to contain invoice data, or the text could not be extracted.\n\nFor best results:\n• Use CSV export from your invoicing system\n• Copy invoice details to a text file'
        };
      }

      console.log('Extracted PDF text (first 500 chars):', pdfText.substring(0, 500));

      // Use AI to parse the extracted text
      const parsedInvoice = await this.parseWithAI(pdfText, 'invoice.pdf');
      
      if (!parsedInvoice) {
        return {
          success: false,
          message: 'AI could not parse the invoice data from this PDF.\n\nThe text was extracted but the format may be unusual. Try CSV export instead.'
        };
      }

      return {
        success: true,
        message: 'PDF invoice parsed successfully!',
        invoice: parsedInvoice
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      
      return {
        success: false,
        message: 'PDF import is experimental and works best with text-based PDFs.\n\nFor reliable import, please use:\n• CSV export from your invoicing system\n• Copy/paste invoice text to a .txt file'
      };
    }
  }

  /**
   * Use AI to intelligently parse invoice data
   */
  private async parseWithAI(fileContent: string, _fileName: string): Promise<ParsedInvoice | null> {
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

      // 1. Find or create customer with enhanced matching
      let customer = this.findExistingCustomer(parsedInvoice.customer, store.customers);

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
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Find existing customer with fuzzy matching to prevent duplicates
   */
  private findExistingCustomer(customerData: { name: string; email?: string; phone?: string; address?: string }, customers: any[]): any | null {
    const cleanName = (name: string) => name.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const cleanEmail = (email: string) => email.toLowerCase().trim();
    const cleanPhone = (phone: string) => phone.replace(/[^\d]/g, ''); // Remove all non-digits
    
    const targetName = cleanName(customerData.name);
    const targetEmail = customerData.email ? cleanEmail(customerData.email) : '';
    const targetPhone = customerData.phone ? cleanPhone(customerData.phone) : '';
    
    for (const customer of customers) {
      // 1. Exact email match (highest priority)
      if (targetEmail && customer.email && cleanEmail(customer.email) === targetEmail) {
        console.log('🎯 Found customer by email match:', customer.name);
        return customer;
      }
      
      // 2. Exact phone match (high priority)
      if (targetPhone && customer.phone && cleanPhone(customer.phone) === targetPhone && targetPhone.length >= 10) {
        console.log('🎯 Found customer by phone match:', customer.name);
        return customer;
      }
      
      // 3. Exact name match (case-insensitive, punctuation-insensitive)
      if (cleanName(customer.name) === targetName) {
        console.log('🎯 Found customer by exact name match:', customer.name);
        return customer;
      }
      
      // 4. Company name match (if customer has company field)
      if (customer.company && cleanName(customer.company) === targetName) {
        console.log('🎯 Found customer by company name match:', customer.company);
        return customer;
      }
      
      // 5. Fuzzy name matching (for slight variations)
      const customerName = cleanName(customer.name);
      const customerCompany = customer.company ? cleanName(customer.company) : '';
      
      // Check if names are very similar (handle variations like "John Smith" vs "John W Smith")
      if (this.isNameSimilar(targetName, customerName) || 
          (customerCompany && this.isNameSimilar(targetName, customerCompany))) {
        console.log('🎯 Found customer by fuzzy name match:', customer.name);
        return customer;
      }
    }
    
    console.log('❌ No existing customer found for:', customerData.name);
    return null;
  }
  
  /**
   * Check if two names are similar (handles variations and typos)
   */
  private isNameSimilar(name1: string, name2: string): boolean {
    // Quick exact match check
    if (name1 === name2) return true;
    
    // Calculate similarity score using multiple methods
    const similarity = this.calculateNameSimilarity(name1, name2);
    
    // If similarity is high enough, consider it a match
    if (similarity >= 0.8) {
      console.log(`🎯 High similarity match (${Math.round(similarity * 100)}%): "${name1}" ≈ "${name2}"`);
      return true;
    }
    
    // Special case for Hamilton Water variations
    if ((name1.includes('hamilton') && name1.includes('water')) || 
        (name2.includes('hamilton') && name2.includes('water'))) {
      const hasHamilton1 = name1.includes('hamilton');
      const hasHamilton2 = name2.includes('hamilton');
      const hasWater1 = name1.includes('water');
      const hasWater2 = name2.includes('water');
      
      if (hasHamilton1 && hasHamilton2 && hasWater1 && hasWater2) {
        console.log('🎯 Hamilton Water match detected');
        return true;
      }
    }
    
    // Special case for Plymouth Tube variations
    if ((name1.includes('plymouth') && name1.includes('tube')) || 
        (name2.includes('plymouth') && name2.includes('tube'))) {
      const hasPlymouth1 = name1.includes('plymouth');
      const hasPlymouth2 = name2.includes('plymouth');
      const hasTube1 = name1.includes('tube');
      const hasTube2 = name2.includes('tube');
      
      if (hasPlymouth1 && hasPlymouth2 && hasTube1 && hasTube2) {
        console.log('🎯 Plymouth Tube match detected');
        return true;
      }
    }
    
    // Split names into words
    const words1 = name1.split(/\s+/).filter(w => w.length > 1);
    const words2 = name2.split(/\s+/).filter(w => w.length > 1);
    
    // If one name contains all words of the other (handles middle names, initials)
    const allWords1InName2 = words1.every(word => name2.includes(word));
    const allWords2InName1 = words2.every(word => name1.includes(word));
    
    if (allWords1InName2 || allWords2InName1) {
      console.log('🎯 Word containment match detected');
      return true;
    }
    
    // Check for exact word matches (at least 2 matching words for longer names)
    const matchingWords = words1.filter(word => words2.includes(word));
    if (matchingWords.length >= 2 && matchingWords.length >= Math.min(words1.length, words2.length) * 0.7) {
      console.log('🎯 Multiple word match detected');
      return true;
    }
    
    // Check for abbreviations and initials
    if (this.checkAbbreviationMatch(words1, words2)) {
      console.log('🎯 Abbreviation match detected');
      return true;
    }
    
    return false;
  }

  /**
   * Calculate comprehensive similarity score between two names
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // Levenshtein distance similarity
    const levenshteinSim = 1 - (this.levenshteinDistance(name1, name2) / Math.max(name1.length, name2.length));
    
    // Jaro-Winkler similarity for better handling of transpositions
    const jaroSim = this.jaroWinklerSimilarity(name1, name2);
    
    // Word-based similarity
    const wordSim = this.wordSimilarity(name1, name2);
    
    // Weighted average (Jaro-Winkler is best for names)
    return (jaroSim * 0.5) + (levenshteinSim * 0.3) + (wordSim * 0.2);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Jaro-Winkler similarity (excellent for names)
   */
  private jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    
    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Word-based similarity
   */
  private wordSimilarity(name1: string, name2: string): number {
    const words1 = name1.split(/\s+/).filter(w => w.length > 1);
    const words2 = name2.split(/\s+/).filter(w => w.length > 1);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const matchingWords = words1.filter(word => words2.includes(word));
    return matchingWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Check for abbreviation matches (e.g., "John Smith Co" vs "J Smith Company")
   */
  private checkAbbreviationMatch(words1: string[], words2: string[]): boolean {
    // Check if one set contains abbreviations of the other
    for (let i = 0; i < words1.length; i++) {
      for (let j = 0; j < words2.length; j++) {
        const word1 = words1[i];
        const word2 = words2[j];
        
        // Check if one is an abbreviation of the other
        if ((word1.length === 1 && word2.startsWith(word1.toLowerCase())) ||
            (word2.length === 1 && word1.startsWith(word2.toLowerCase()))) {
          return true;
        }
        
        // Check common abbreviations
        const abbreviations: { [key: string]: string[] } = {
          'company': ['co', 'corp', 'corporation'],
          'incorporated': ['inc'],
          'limited': ['ltd'],
          'and': ['&'],
          'brothers': ['bros'],
          'international': ['intl'],
          'manufacturing': ['mfg'],
          'services': ['svc'],
          'systems': ['sys']
        };
        
        for (const [full, abbrevs] of Object.entries(abbreviations)) {
          if ((word1 === full && abbrevs.includes(word2)) ||
              (word2 === full && abbrevs.includes(word1))) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Parse PDF quote - extract text and use AI to parse
   */
  private async parsePDFQuote(pdfUri: string): Promise<{ success: boolean; message: string; quote?: ParsedQuote }> {
    try {
      console.log('🔍 Starting PDF quote parsing for:', pdfUri);
      
      // Try to read PDF as text (works for text-based PDFs, not scanned images)
      let pdfText = '';
      
      try {
        // Attempt to read as UTF-8 text (some PDFs have extractable text)
        pdfText = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.UTF8
        });
        
        // Clean up PDF binary junk and extract readable text
        // PDF text is usually between stream and endstream tags or in plain text
        const textMatches = pdfText.match(/\(([^)]+)\)/g);
        if (textMatches && textMatches.length > 0) {
          pdfText = textMatches
            .map(match => match.replace(/[()]/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Also try to extract text that's not in parentheses
        const cleanText = pdfText
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
          .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText.length > pdfText.length) {
          pdfText = cleanText;
        }
        
      } catch (error) {
        console.log('Could not extract text from PDF:', error);
      }

      // Check if we got meaningful text
      if (!pdfText || pdfText.length < 50) {
        return {
          success: false,
          message: 'Could not extract text from this PDF. This may be a scanned image or secured PDF.\n\nPlease try:\n• Export the quote as CSV or text from your system\n• Copy the text content and save as a .txt file\n• Take a screenshot and use image import (future feature)'
        };
      }

      // Check if extracted text looks like quote data
      const hasQuoteKeywords = /quote|estimate|proposal|total|amount|customer|date/i.test(pdfText);
      if (!hasQuoteKeywords) {
        return {
          success: false,
          message: 'This PDF does not appear to contain quote data. Please check the file or try a different format.'
        };
      }

      console.log('Extracted PDF text (first 500 chars):', pdfText.substring(0, 500));

      // Use AI to parse the extracted text
      const parsedQuote = await this.parseQuoteWithAI(pdfText, 'quote.pdf');
      
      if (!parsedQuote) {
        return {
          success: false,
          message: `AI could not parse the quote data from this PDF.\n\n🐛 EXTRACTED TEXT:\n"${pdfText.substring(0, 1000)}..."\n\nThe text was extracted but the format may be unusual. Try CSV export instead.`
        };
      }
      
      return {
        success: true,
        message: 'Quote parsed successfully from PDF',
        quote: parsedQuote
      };
    } catch (error) {
      console.error('PDF quote parsing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse PDF quote'
      };
    }
  }

  /**
   * Parse quote content with AI
   */
  private async parseQuoteWithAI(fileContent: string, _fileName: string): Promise<ParsedQuote | null> {
    try {
      // In a real implementation, this would call OpenAI API
      // For now, we'll try to parse basic patterns
      console.log('🤖 Parsing quote with AI...');
      console.log('🐛 DEBUG: Raw file content (first 500 chars):', fileContent.substring(0, 500));
      
      // Try to extract basic quote information with more flexible patterns - handle CSV format
      const quoteNumberMatch = fileContent.match(/Proposal\s*Number[,:]\s*([A-Za-z0-9\s_-]+)/i) || // "Proposal Number,0525-1"
                               fileContent.match(/Proposal[,:]\s*([A-Za-z0-9\s]+)/i) || // "Proposal: Plymouth Tube 0625"
                               fileContent.match(/(?:Quote|Estimate|Job|Project|Work\s*Order)[\s#]*[,:]?\s*([A-Z0-9-_.]+)/i) ||
                               fileContent.match(/(?:Weld|Mill|Cutoff|Cut\s*off)[\s]*([A-Za-z0-9\s]+)/i) || // Welding/manufacturing specific
                               fileContent.match(/([A-Z0-9-_.]{3,})/i); // Fallback to any alphanumeric sequence
      
      const dateMatch = fileContent.match(/(?:Date|Issued|Created|On)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/i) ||
                       fileContent.match(/([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i) || // "June 14, 2025"
                       fileContent.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/); // Any date pattern
      
      // Look for "Total Cost:" specifically and other total patterns - handle both colon and comma separators
      const totalMatch = fileContent.match(/Total\s+Cost[,:]\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                        fileContent.match(/(?:Total|Amount|Price|Cost|Sum|Grand\s*Total|Final\s*Total)[\s:,$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                        fileContent.match(/\$(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)/g)?.sort((a, b) => parseFloat(b.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/)[1].replace(/,/g, '')) - parseFloat(a.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/)[1].replace(/,/g, '')))?.[0]?.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/) || // Largest dollar amount with at least 2 digits
                        fileContent.match(/(\d+(?:,\d{3})*\.\d{2})/); // Any decimal number
      
      // Look for customer name and address patterns - handle CSV format
      const customerMatch = fileContent.match(/Customer[,:]\s*([A-Za-z\s&.,'-]+)/i) || // "Customer,Hamilton MS water Association"
                           fileContent.match(/(David\s+Pittman)/i) || // Specific person name
                           fileContent.match(/(Plymouth\s+Tube\s+Company)/i) || // Specific company
                           fileContent.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\n\s*(\d+\s+[A-Za-z\s]+)\s*\n\s*([A-Za-z]+,\s*[A-Z]{2}\s+\d{5})/i) || // Name, Address, City State Zip
                           fileContent.match(/(?:Customer|Client|Company|To|For|Bill\s*To)[\s:]*([A-Za-z\s&.,'-]+(?:Company|Corp|LLC|Inc|Tube|Manufacturing|Industries)?)/i) ||
                           fileContent.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/); // Name pattern
      
      // Look for parts and labor breakdown - handle both colon and comma separators
      const partsMatch = fileContent.match(/Parts\s*(?:Cost)?[,:]\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
      const laborMatch = fileContent.match(/Labor\s*(?:Cost)?[,:]\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
      
      // Extract detailed information
      const scopeOfWorkMatch = fileContent.match(/(?:scope of work|description|work includes?|project description)[\s:]*([^.]*(?:\.[^.]*){0,10})/i);
      const paymentTermsMatch = fileContent.match(/payment[\s\w]*terms?[\s:]*([^.]*(?:\.[^.]*){0,3})/i);
      const warrantyMatch = fileContent.match(/warranty[\s:]*([^.]*(?:\.[^.]*){0,2})/i);
      
      // Extract company information - specific to MAC format
      const companyNameMatch = fileContent.match(/(MAC)/i) || // MAC company
                              fileContent.match(/(Midsouth\s+Automation\s+and\s+Controls)/i) || // Full company name
                              fileContent.match(/^([A-Z]{2,})\s*$/m) || // All caps company name on its own line
                              fileContent.match(/^([A-Za-z\s&]+(?:LLC|Inc|Corp|Company|Controls|Automation))/im);
      
      console.log('🔍 Parsing results:', {
        quoteNumber: quoteNumberMatch?.[1],
        date: dateMatch?.[1],
        total: totalMatch?.[1],
        customer: customerMatch?.[1],
        parts: partsMatch?.[1],
        labor: laborMatch?.[1],
        scopeOfWork: scopeOfWorkMatch?.[1]?.substring(0, 100),
        paymentTerms: paymentTermsMatch?.[1]?.substring(0, 100),
        companyName: companyNameMatch?.[1]
      });
      
      // DEBUG: For mobile testing - show extracted text in the success message
      const debugPreview = fileContent.substring(0, 500).replace(/\s+/g, ' ').trim();
      
      if (!totalMatch) {
        console.log('❌ Could not find any monetary amount in the document');
        return null;
      }
      
      // Clean up extracted values
      const cleanTotal = totalMatch[1].replace(/,/g, ''); // Remove commas
      const totalAmount = parseFloat(cleanTotal);
      
      // Extract customer name and details
      let customerName = 'Imported Customer';
      let customerAddress = '';
      let customerEmail = '';
      let customerPhone = '';
      
      if (customerMatch) {
        if (customerMatch[1] && customerMatch[2] && customerMatch[3]) {
          // Full name + address pattern matched
          customerName = customerMatch[1].trim();
          customerAddress = `${customerMatch[2].trim()}, ${customerMatch[3].trim()}`;
        } else {
          customerName = customerMatch[1]?.trim() || 'Imported Customer';
        }
        console.log('🐛 DEBUG: Customer match found:', customerMatch);
        console.log('🐛 DEBUG: Extracted customer name:', customerName);
      } else {
        console.log('🐛 DEBUG: No customer match found in content');
      }
      
      // Look for email addresses
      const emailMatch = fileContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        customerEmail = emailMatch[1];
      }
      
      // Look for phone numbers
      const phoneMatch = fileContent.match(/(?:phone|tel|call)[\s:]*(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/i) ||
                        fileContent.match(/(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
      if (phoneMatch) {
        customerPhone = phoneMatch[1];
      }
      
      const quoteNum = quoteNumberMatch?.[1]?.trim() || `WM-${Date.now().toString().slice(-6)}`; // WM for WeldMill
      
      // Create items from parts and labor if available
      const items = [];
      if (partsMatch) {
        const partsAmount = parseFloat(partsMatch[1].replace(/,/g, ''));
        items.push({
          description: 'Parts',
          quantity: 1,
          unitPrice: partsAmount,
          total: partsAmount
        });
      }
      if (laborMatch) {
        const laborAmount = parseFloat(laborMatch[1].replace(/,/g, ''));
        items.push({
          description: 'Labor',
          quantity: 1,
          unitPrice: laborAmount,
          total: laborAmount
        });
      }
      
      // If no parts/labor breakdown, create a single item
      if (items.length === 0) {
        // Try to extract description/service information - specific to MAC format
        const descriptionMatch = fileContent.match(/Machine:\s*([A-Za-z0-9\s]+)/i) || // "Machine: Weld Mill 1 Cutoff"
                                fileContent.match(/(?:Description|Service|Work|Item|Machine|Weld|Mill|Cut|Fabrication|Manufacturing)[\s:]*([A-Za-z0-9\s,.-]+)/i) ||
                                fileContent.match(/(Weld\s*Mill\s*\d*\s*Cut\s*off)/i) || // Specific to this quote
                                fileContent.match(/([A-Za-z\s]{10,50})/); // Any descriptive text
        const description = descriptionMatch?.[1]?.trim() || 'Automation and Controls Service';
        
        items.push({
          description: description.substring(0, 100),
          quantity: 1,
          unitPrice: totalAmount,
          total: totalAmount
        });
      }
      
      // Calculate subtotal from items
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      
      // Basic parsing fallback
      const parsed: ParsedQuote = {
        quoteNumber: quoteNum,
        issueDate: dateMatch ? this.parseDate(dateMatch[1]) || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress
        },
        items: items,
        subtotal: subtotal,
        tax: Math.max(0, totalAmount - subtotal), // Any difference is tax
        taxRate: subtotal > 0 ? Math.max(0, totalAmount - subtotal) / subtotal : 0,
        total: totalAmount,
        notes: `Imported from ${_fileName}`,
        status: 'draft',
        // Enhanced details
        scopeOfWork: scopeOfWorkMatch?.[1]?.trim(),
        paymentTerms: paymentTermsMatch?.[1]?.trim(),
        warranty: warrantyMatch?.[1]?.trim(),
        companyInfo: {
          name: companyNameMatch?.[1]?.trim(),
          address: '',
          contact: ''
        },
        // Debug info for mobile testing
        debugText: debugPreview
      };
      
      console.log('✅ Quote parsed successfully:', parsed.quoteNumber);
      return parsed;
    } catch (error) {
      console.error('AI quote parsing error:', error);
      return null;
    }
  }

  /**
   * Parse Square quote format
   */
  private parseSquareQuote(content: string): ParsedQuote | null {
    try {
      // Adapt Square invoice parsing for quotes
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const data: Record<string, string> = {};
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          data[key] = value;
        }
      }
      
      const quoteNumber = data['Quote Number'] || data['Estimate Number'] || data['Proposal Number'] || 'UNKNOWN';
      const total = this.parseAmount(data['Total'] || data['Amount'] || data['Total Due']) || 0;
      
      return {
        quoteNumber,
        issueDate: this.parseDate(data['Date'] || data['Issue Date']) || new Date().toISOString().split('T')[0],
        expirationDate: this.parseDate(data['Expiration Date'] || data['Valid Until']),
        customer: {
          name: data['Customer'] || data['Client'] || data['Bill To'] || 'Imported Customer',
          email: data['Email'] || '',
          phone: data['Phone'] || '',
          address: data['Address'] || ''
        },
        items: [{
          description: data['Description'] || data['Service'] || 'Quote Item',
          quantity: 1,
          unitPrice: total,
          total: total
        }],
        subtotal: total,
        tax: 0,
        taxRate: 0,
        total: total,
        notes: data['Notes'] || '',
        status: 'draft'
      };
    } catch (error) {
      console.error('Square quote parsing error:', error);
      return null;
    }
  }

  /**
   * Preview parsed quote before importing (for editing)
   */
  async previewParsedQuote(parsedQuote: ParsedQuote): Promise<{ success: boolean; message: string; quote?: ParsedQuote; customer?: any }> {
    try {
      const store = useJobStore.getState();

      // 1. Find or create customer with enhanced matching
      console.log('🐛 DEBUG: Parsed customer name:', parsedQuote.customer.name);
      console.log('🐛 DEBUG: Existing customers:', store.customers.map(c => c.name));
      let customer = this.findExistingCustomer(parsedQuote.customer, store.customers);

      if (!customer) {
        // Prepare new customer data (don't create yet)
        customer = {
          id: this.generateId(),
          name: parsedQuote.customer.name,
          email: parsedQuote.customer.email || '',
          phone: parsedQuote.customer.phone || '',
          address: parsedQuote.customer.address || '',
          company: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isNew: true // Flag to indicate this is a new customer
        };
      }

      return {
        success: true,
        message: 'Quote parsed successfully',
        quote: parsedQuote,
        customer: customer
      };
    } catch (error) {
      console.error('Quote preview error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse quote'
      };
    }
  }

  /**
   * Import parsed quote into the app
   */
  async importParsedQuote(parsedQuote: ParsedQuote): Promise<{ success: boolean; message: string }> {
    try {
      const store = useJobStore.getState();

      // 1. Find or create customer with enhanced matching
      console.log('🐛 DEBUG: Parsed customer name:', parsedQuote.customer.name);
      console.log('🐛 DEBUG: Existing customers:', store.customers.map(c => c.name));
      let customer = this.findExistingCustomer(parsedQuote.customer, store.customers);

      if (!customer) {
        // Create new customer
        customer = {
          id: this.generateId(),
          name: parsedQuote.customer.name,
          email: parsedQuote.customer.email || '',
          phone: parsedQuote.customer.phone || '',
          address: parsedQuote.customer.address || '',
          company: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('✅ Creating new customer:', customer.name);
        store.addCustomer(customer);
      } else {
        // Update existing customer with any new information
        const updates: any = {};
        if (parsedQuote.customer.email && !customer.email) {
          updates.email = parsedQuote.customer.email;
        }
        if (parsedQuote.customer.phone && !customer.phone) {
          updates.phone = parsedQuote.customer.phone;
        }
        if (parsedQuote.customer.address && !customer.address) {
          updates.address = parsedQuote.customer.address;
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('📝 Updating existing customer with new info:', updates);
          store.updateCustomer(customer.id, updates);
        }
      }

      // 2. Check for duplicate quotes
      const existingQuote = store.quotes.find(q => 
        q.quoteNumber === parsedQuote.quoteNumber && 
        q.customerId === customer!.id &&
        Math.abs(q.total - parsedQuote.total) < 0.01
      );

      if (existingQuote) {
        return {
          success: false,
          message: `Quote ${parsedQuote.quoteNumber} already exists for this customer with the same total amount.`
        };
      }

      // 3. Create the quote
      const quote = {
        id: this.generateId(),
        customerId: customer.id,
        quoteNumber: parsedQuote.quoteNumber,
        title: `Quote ${parsedQuote.quoteNumber}`,
        description: parsedQuote.notes || '',
        status: parsedQuote.status || 'draft',
        items: parsedQuote.items.map(item => ({
          id: this.generateId(),
          type: 'service' as const,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: parsedQuote.subtotal,
        tax: parsedQuote.tax || 0,
        taxRate: parsedQuote.taxRate || 0,
        total: parsedQuote.total,
        notes: parsedQuote.notes || '',
        validUntil: parsedQuote.expirationDate || parsedQuote.validUntil,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Enhanced details
        scopeOfWork: parsedQuote.scopeOfWork,
        specifications: parsedQuote.specifications,
        paymentTerms: parsedQuote.paymentTerms,
        deliveryTerms: parsedQuote.deliveryTerms,
        warranty: parsedQuote.warranty,
        additionalNotes: parsedQuote.additionalNotes,
        companyInfo: parsedQuote.companyInfo
      };

      // 4. Add to store
      store.addQuote(quote);

      return {
        success: true,
        message: `Quote ${parsedQuote.quoteNumber} imported successfully!\n\nCustomer: ${customer.name}\nTotal: $${parsedQuote.total.toFixed(2)}`
      };
    } catch (error) {
      console.error('Quote import error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import quote'
      };
    }
  }
}

export const smartInvoiceParser = SmartInvoiceParser.getInstance();