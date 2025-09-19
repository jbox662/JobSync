import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { useJobStore } from '../state/store';
import { Quote, Invoice, Customer } from '../types';

export interface EmailTemplate {
  subject: string;
  body: string;
  attachmentName: string;
}

class EmailService {
  private static instance: EmailService;
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Check if email is available on the device
   */
  async isEmailAvailable(): Promise<boolean> {
    try {
      return await MailComposer.isAvailableAsync();
    } catch (error) {
      return false;
    }
  }

  /**
   * Send quote via email to customer
   */
  async sendQuoteEmail(quote: Quote, customer: Customer): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email is available
      const isAvailable = await this.isEmailAvailable();
      if (!isAvailable) {
        return {
          success: false,
          message: 'Email is not available on this device. Please set up an email account in your device settings.'
        };
      }

      if (!customer.email) {
        return {
          success: false,
          message: 'Customer does not have an email address. Please add an email to the customer profile.'
        };
      }

      // Generate quote PDF/HTML content
      const quotePDF = await this.generateQuotePDF(quote, customer);
      
      // Get email template
      const template = this.getQuoteEmailTemplate(quote, customer);

      // Compose email
      const result = await MailComposer.composeAsync({
        recipients: [customer.email],
        subject: template.subject,
        body: template.body,
        isHtml: true,
        attachments: quotePDF ? [quotePDF] : undefined
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        // Update quote status to 'sent'
        const store = useJobStore.getState();
        store.updateQuote(quote.id, { 
          status: 'sent', 
          sentAt: new Date().toISOString() 
        });

        return {
          success: true,
          message: `Quote successfully sent to ${customer.email}`
        };
      } else if (result.status === MailComposer.MailComposerStatus.SAVED) {
        return {
          success: true,
          message: 'Quote email saved to drafts'
        };
      } else {
        return {
          success: false,
          message: 'Email was cancelled or failed to send'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send quote email'
      };
    }
  }

  /**
   * Send invoice via email to customer
   */
  async sendInvoiceEmail(invoice: Invoice, customer: Customer): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email is available
      const isAvailable = await this.isEmailAvailable();
      if (!isAvailable) {
        return {
          success: false,
          message: 'Email is not available on this device. Please set up an email account in your device settings.'
        };
      }

      if (!customer.email) {
        return {
          success: false,
          message: 'Customer does not have an email address. Please add an email to the customer profile.'
        };
      }

      // Generate invoice PDF/HTML content
      const invoicePDF = await this.generateInvoicePDF(invoice, customer);
      
      // Get email template
      const template = this.getInvoiceEmailTemplate(invoice, customer);

      // Compose email
      const result = await MailComposer.composeAsync({
        recipients: [customer.email],
        subject: template.subject,
        body: template.body,
        isHtml: true,
        attachments: invoicePDF ? [invoicePDF] : undefined
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        // Update invoice status to 'sent'
        const store = useJobStore.getState();
        store.updateInvoice(invoice.id, { 
          status: 'sent', 
          sentAt: new Date().toISOString() 
        });

        return {
          success: true,
          message: `Invoice successfully sent to ${customer.email}`
        };
      } else if (result.status === MailComposer.MailComposerStatus.SAVED) {
        return {
          success: true,
          message: 'Invoice email saved to drafts'
        };
      } else {
        return {
          success: false,
          message: 'Email was cancelled or failed to send'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send invoice email'
      };
    }
  }

  /**
   * Generate quote email template
   */
  private getQuoteEmailTemplate(quote: Quote, customer: Customer): EmailTemplate {
    const store = useJobStore.getState();
    const businessName = store.workspaceName || 'Your Business';
    
    const subject = `Quote #${quote.quoteNumber} from ${businessName}`;
    
    const body = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563EB;">Quote #${quote.quoteNumber}</h2>
            
            <p>Dear ${customer.name},</p>
            
            <p>Thank you for your interest in our services. Please find attached your quote for the following:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">${quote.title}</h3>
              ${quote.description ? `<p style="margin-bottom: 10px;">${quote.description}</p>` : ''}
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #059669;">
                <span>Total Amount:</span>
                <span>$${quote.total.toFixed(2)}</span>
              </div>
            </div>
            
            ${quote.validUntil ? `<p><strong>This quote is valid until:</strong> ${new Date(quote.validUntil).toLocaleDateString()}</p>` : ''}
            
            <p>If you have any questions about this quote, please don't hesitate to contact us. We look forward to working with you!</p>
            
            ${quote.notes ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>Notes:</strong><br>${quote.notes}</div>` : ''}
            
            <p>Best regards,<br>
            <strong>${businessName}</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This quote was generated automatically. Please contact us if you have any questions.
            </p>
          </div>
        </body>
      </html>
    `;

    return {
      subject,
      body,
      attachmentName: `Quote-${quote.quoteNumber}.pdf`
    };
  }

  /**
   * Generate invoice email template
   */
  private getInvoiceEmailTemplate(invoice: Invoice, customer: Customer): EmailTemplate {
    const store = useJobStore.getState();
    const businessName = store.workspaceName || 'Your Business';
    
    const subject = `Invoice #${invoice.invoiceNumber} from ${businessName}`;
    
    const body = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Invoice #${invoice.invoiceNumber}</h2>
            
            <p>Dear ${customer.name},</p>
            
            <p>Thank you for your business. Please find attached your invoice for the following services:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">${invoice.title}</h3>
              ${invoice.description ? `<p style="margin-bottom: 10px;">${invoice.description}</p>` : ''}
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #dc2626;">
                <span>Total Amount Due:</span>
                <span>$${invoice.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">
                <strong>Payment Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}
              </p>
              ${invoice.paymentTerms ? `<p style="margin: 5px 0 0 0; color: #7f1d1d;"><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>` : ''}
            </div>
            
            <p>Please remit payment by the due date to avoid any late fees. If you have any questions about this invoice, please contact us immediately.</p>
            
            ${invoice.notes ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            <strong>${businessName}</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This invoice was generated automatically. Please contact us if you have any questions about your bill.
            </p>
          </div>
        </body>
      </html>
    `;

    return {
      subject,
      body,
      attachmentName: `Invoice-${invoice.invoiceNumber}.pdf`
    };
  }

  /**
   * Generate quote PDF attachment
   */
  private async generateQuotePDF(quote: Quote, customer: Customer): Promise<string | null> {
    try {
      const store = useJobStore.getState();
      const businessName = store.workspaceName || 'Your Business';
      
      // Generate HTML content for the quote
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
              .business-name { font-size: 24px; font-weight: bold; color: #2563EB; }
              .document-title { font-size: 20px; margin-top: 10px; }
              .info-section { margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .total-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; }
              .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; }
              .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .items-table th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${businessName}</div>
              <div class="document-title">QUOTE #${quote.quoteNumber}</div>
            </div>
            
            <div class="info-section">
              <h3>Bill To:</h3>
              <div><strong>${customer.name}</strong></div>
              ${customer.company ? `<div>${customer.company}</div>` : ''}
              ${customer.email ? `<div>${customer.email}</div>` : ''}
              ${customer.phone ? `<div>${customer.phone}</div>` : ''}
              ${customer.address ? `<div>${customer.address}</div>` : ''}
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span><strong>Quote Date:</strong></span>
                <span>${new Date(quote.createdAt).toLocaleDateString()}</span>
              </div>
              ${quote.validUntil ? `
                <div class="info-row">
                  <span><strong>Valid Until:</strong></span>
                  <span>${new Date(quote.validUntil).toLocaleDateString()}</span>
                </div>
              ` : ''}
            </div>
            
            <h3>${quote.title}</h3>
            ${quote.description ? `<p>${quote.description}</p>` : ''}
            
            ${this.generateItemsTable(quote.items)}
            
            <div class="total-section">
              <div class="info-row">
                <span>Subtotal:</span>
                <span>$${quote.subtotal.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span>Tax (${quote.taxRate}%):</span>
                <span>$${quote.tax.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Total:</span>
                <span>$${quote.total.toFixed(2)}</span>
              </div>
            </div>
            
            ${quote.notes ? `
              <div class="info-section">
                <h3>Notes:</h3>
                <p>${quote.notes}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      // Save HTML file
      const fileName = `Quote-${quote.quoteNumber}.html`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      console.warn('Failed to generate quote PDF:', error);
      return null;
    }
  }

  /**
   * Generate invoice PDF attachment
   */
  private async generateInvoicePDF(invoice: Invoice, customer: Customer): Promise<string | null> {
    try {
      const store = useJobStore.getState();
      const businessName = store.workspaceName || 'Your Business';
      
      // Generate HTML content for the invoice
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
              .business-name { font-size: 24px; font-weight: bold; color: #dc2626; }
              .document-title { font-size: 20px; margin-top: 10px; }
              .info-section { margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .total-section { background: #fee2e2; padding: 15px; border-radius: 8px; margin-top: 20px; }
              .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; }
              .due-date { background: #fef2f2; padding: 10px; border-radius: 8px; border-left: 4px solid #dc2626; }
              .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .items-table th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${businessName}</div>
              <div class="document-title">INVOICE #${invoice.invoiceNumber}</div>
            </div>
            
            <div class="info-section">
              <h3>Bill To:</h3>
              <div><strong>${customer.name}</strong></div>
              ${customer.company ? `<div>${customer.company}</div>` : ''}
              ${customer.email ? `<div>${customer.email}</div>` : ''}
              ${customer.phone ? `<div>${customer.phone}</div>` : ''}
              ${customer.address ? `<div>${customer.address}</div>` : ''}
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span><strong>Invoice Date:</strong></span>
                <span>${new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="info-row">
                <span><strong>Due Date:</strong></span>
                <span>${new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              ${invoice.paymentTerms ? `
                <div class="info-row">
                  <span><strong>Payment Terms:</strong></span>
                  <span>${invoice.paymentTerms}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="due-date">
              <strong>Payment Due: ${new Date(invoice.dueDate).toLocaleDateString()}</strong>
            </div>
            
            <h3>${invoice.title}</h3>
            ${invoice.description ? `<p>${invoice.description}</p>` : ''}
            
            ${this.generateItemsTable(invoice.items)}
            
            <div class="total-section">
              <div class="info-row">
                <span>Subtotal:</span>
                <span>$${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span>Tax (${invoice.taxRate}%):</span>
                <span>$${invoice.tax.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Total Due:</span>
                <span>$${invoice.total.toFixed(2)}</span>
              </div>
            </div>
            
            ${invoice.notes ? `
              <div class="info-section">
                <h3>Notes:</h3>
                <p>${invoice.notes}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      // Save HTML file
      const fileName = `Invoice-${invoice.invoiceNumber}.html`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      console.warn('Failed to generate invoice PDF:', error);
      return null;
    }
  }

  /**
   * Generate items table HTML
   */
  private generateItemsTable(items: any[]): string {
    if (!items || items.length === 0) {
      return '<p>No items specified.</p>';
    }

    let tableHTML = `
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach(item => {
      tableHTML += `
        <tr>
          <td>${item.description || item.name || 'Item'}</td>
          <td>${item.quantity || 1}</td>
          <td>$${(item.rate || item.price || 0).toFixed(2)}</td>
          <td>$${((item.quantity || 1) * (item.rate || item.price || 0)).toFixed(2)}</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    return tableHTML;
  }

  /**
   * Share quote/invoice without email (fallback)
   */
  async shareDocument(type: 'quote' | 'invoice', document: Quote | Invoice, customer: Customer): Promise<{ success: boolean; message: string }> {
    try {
      let filePath: string | null = null;
      
      if (type === 'quote') {
        filePath = await this.generateQuotePDF(document as Quote, customer);
      } else {
        filePath = await this.generateInvoicePDF(document as Invoice, customer);
      }

      if (!filePath) {
        return {
          success: false,
          message: `Failed to generate ${type} document`
        };
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/html',
          dialogTitle: `Share ${type.charAt(0).toUpperCase() + type.slice(1)}`
        });

        return {
          success: true,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} shared successfully`
        };
      } else {
        return {
          success: false,
          message: 'Sharing is not available on this device'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : `Failed to share ${type}`
      };
    }
  }
}

export const emailService = EmailService.getInstance();
