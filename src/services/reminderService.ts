import { Invoice } from '../types';
import { emailService } from './emailService';

export interface ReminderSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

class ReminderService {
  private static instance: ReminderService;

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  /**
   * Calculate the next reminder date based on frequency
   */
  calculateNextReminderDate(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly', fromDate?: Date): Date {
    const baseDate = fromDate || new Date();
    const nextDate = new Date(baseDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Process reminders for all invoices
   */
  async processReminders(invoices: Invoice[]): Promise<void> {
    const now = new Date();
    
    for (const invoice of invoices) {
      if (
        invoice.reminderEnabled &&
        invoice.status === 'sent' &&
        invoice.nextReminderDue &&
        new Date(invoice.nextReminderDue) <= now
      ) {
        try {
          await this.sendReminderEmail(invoice);
        } catch (error) {
          console.error('Failed to send reminder for invoice:', invoice.id, error);
        }
      }
    }
  }

  /**
   * Send a reminder email for an invoice
   */
  async sendReminderEmail(invoice: Invoice): Promise<void> {
    const template = this.getReminderEmailTemplate(invoice);
    
    try {
      await emailService.sendCustomEmail({
        recipients: [invoice.customerId], // This should be resolved to actual email
        subject: template.subject,
        body: template.body,
        attachments: invoice.attachments || []
      });

      // Update reminder tracking (this would be handled by the store)
      console.log(`Reminder sent for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      console.error('Failed to send reminder email:', error);
      throw error;
    }
  }

  /**
   * Generate email template for reminder
   */
  private getReminderEmailTemplate(invoice: Invoice): { subject: string; body: string } {
    const reminderCount = (invoice.reminderCount || 0) + 1;
    const isFirstReminder = reminderCount === 1;
    
    const subject = isFirstReminder
      ? `Payment Reminder: Invoice ${invoice.invoiceNumber}`
      : `Payment Reminder #${reminderCount}: Invoice ${invoice.invoiceNumber}`;

    const body = `
Dear Customer,

${isFirstReminder 
  ? 'This is a friendly reminder that payment for the following invoice is due:'
  : `This is reminder #${reminderCount} that payment for the following invoice is overdue:`
}

Invoice Number: ${invoice.invoiceNumber}
Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
Amount Due: $${invoice.total.toFixed(2)}

${invoice.description ? `Description: ${invoice.description}` : ''}

${invoice.paymentTerms ? `Payment Terms: ${invoice.paymentTerms}` : ''}

Please remit payment at your earliest convenience. If you have any questions about this invoice, please don't hesitate to contact us.

Thank you for your business!

Best regards,
JobSync Team
    `.trim();

    return { subject, body };
  }

  /**
   * Check if an invoice needs a reminder
   */
  needsReminder(invoice: Invoice): boolean {
    if (!invoice.reminderEnabled || invoice.status !== 'sent') {
      return false;
    }

    if (!invoice.nextReminderDue) {
      return true; // First reminder
    }

    return new Date(invoice.nextReminderDue) <= new Date();
  }

  /**
   * Get reminder status text
   */
  getReminderStatusText(invoice: Invoice): string {
    if (!invoice.reminderEnabled) {
      return 'Reminders disabled';
    }

    if (invoice.status !== 'sent') {
      return 'No reminders (not sent)';
    }

    const count = invoice.reminderCount || 0;
    if (count === 0) {
      return 'No reminders sent yet';
    }

    const lastSent = invoice.lastReminderSent 
      ? new Date(invoice.lastReminderSent).toLocaleDateString()
      : 'Unknown';

    return `${count} reminder${count > 1 ? 's' : ''} sent (last: ${lastSent})`;
  }
}

export const reminderService = ReminderService.getInstance();
