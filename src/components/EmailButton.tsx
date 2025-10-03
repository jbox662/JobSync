import React, { useState } from 'react';
import { Pressable, Text, Alert, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { emailService } from '../services/emailService';
import { useJobStore } from '../state/store';
import { Quote, Invoice } from '../types';
import ReminderSettingsModal, { ReminderSettings } from './ReminderSettings';
import { reminderService } from '../services/reminderService';

interface EmailButtonProps {
  type: 'quote' | 'invoice';
  document: Quote | Invoice;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onEmailSent?: () => void;
}

const EmailButton: React.FC<EmailButtonProps> = ({
  type,
  document,
  variant = 'primary',
  size = 'medium',
  onEmailSent
}) => {
  const [loading, setLoading] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const { getCustomerById, updateInvoice } = useJobStore();

  const handleEmailDocument = async () => {
    const customer = getCustomerById(document.customerId);
    
    if (!customer) {
      Alert.alert('Error', 'Customer not found');
      return;
    }

    if (!customer.email) {
      Alert.alert(
        'No Email Address',
        `${customer.name} doesn't have an email address. Would you like to add one?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Email', 
            onPress: () => {
              // Navigate to edit customer screen
              Alert.alert('Add Email', 'Please edit the customer profile to add an email address.');
            }
          }
        ]
      );
      return;
    }

    // Check if email is available
    const isEmailAvailable = await emailService.isEmailAvailable();
    if (!isEmailAvailable) {
      // Offer alternative sharing option
      Alert.alert(
        'Email Not Available',
        'Email is not set up on this device. Would you like to share the document instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Share Document', 
            onPress: () => handleShareDocument()
          }
        ]
      );
      return;
    }

    // For invoices, show reminder settings first
    if (type === 'invoice') {
      setShowReminderSettings(true);
      return;
    }

    // For quotes, send directly
    await sendEmail();
  };

  const sendEmail = async () => {
    const customer = getCustomerById(document.customerId);
    if (!customer) return;

    setLoading(true);
    
    try {
      let result;
      if (type === 'quote') {
        result = await emailService.sendQuoteEmail(document as Quote, customer);
      } else {
        result = await emailService.sendInvoiceEmail(document as Invoice, customer);
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        onEmailSent?.();
      } else {
        Alert.alert('Email Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while sending email');
    } finally {
      setLoading(false);
    }
  };

  const handleShareDocument = async () => {
    const customer = getCustomerById(document.customerId);
    
    if (!customer) {
      Alert.alert('Error', 'Customer not found');
      return;
    }

    setLoading(true);
    
    try {
      const result = await emailService.shareDocument(type, document, customer);
      
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Share Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while sharing document');
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    const iconName = 'mail-outline';
    const label = `Email ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    if (variant === 'icon') {
      return (
        <Ionicons 
          name={iconName} 
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
          color="#2563EB" 
        />
      );
    }

    return (
      <>
        <Ionicons 
          name={iconName} 
          size={size === 'small' ? 14 : size === 'large' ? 20 : 16} 
          color={variant === 'primary' ? 'white' : '#2563EB'} 
        />
        <Text className={`ml-2 font-medium ${
          size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
        } ${variant === 'primary' ? 'text-white' : 'text-blue-600'}`}>
          {label}
        </Text>
      </>
    );
  };

  const getButtonStyle = () => {
    let baseStyle = 'flex-row items-center justify-center rounded-lg';
    
    // Size styles
    if (size === 'small') {
      baseStyle += ' px-3 py-2';
    } else if (size === 'large') {
      baseStyle += ' px-6 py-4';
    } else {
      baseStyle += ' px-4 py-3';
    }

    // Variant styles
    if (variant === 'icon') {
      baseStyle += ' p-2 bg-blue-50';
    } else if (variant === 'primary') {
      baseStyle += ' bg-blue-600';
    } else {
      baseStyle += ' bg-blue-50 border border-blue-200';
    }

    return baseStyle;
  };

  return (
    <>
      <Pressable
        onPress={handleEmailDocument}
        className={getButtonStyle()}
        disabled={loading}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? (
          <View className="flex-row items-center">
            <ActivityIndicator 
              size="small" 
              color={variant === 'primary' ? 'white' : '#2563EB'} 
            />
            <Text className={`ml-2 font-medium ${
              variant === 'primary' ? 'text-white' : 'text-blue-600'
            }`}>
              Sending...
            </Text>
          </View>
        ) : (
          getButtonContent()
        )}
      </Pressable>
      
      {/* Reminder Settings Modal for Invoices */}
      {type === 'invoice' && (
        <ReminderSettingsModal
          visible={showReminderSettings}
          onClose={() => setShowReminderSettings(false)}
          onConfirm={async (settings) => {
            setShowReminderSettings(false);
            
            // Save reminder settings to the invoice
            if (type === 'invoice') {
              const invoice = document as Invoice;
              const nextReminderDate = settings.enabled 
                ? reminderService.calculateNextReminderDate(settings.frequency)
                : undefined;
              
              updateInvoice(invoice.id, {
                reminderEnabled: settings.enabled,
                reminderFrequency: settings.frequency,
                nextReminderDue: nextReminderDate?.toISOString()
              });
            }
            
            // Now send the email
            await sendEmail();
          }}
          initialSettings={{
            enabled: (document as Invoice).reminderEnabled || false,
            frequency: (document as Invoice).reminderFrequency || 'weekly'
          }}
        />
      )}
    </>
  );
};

export default EmailButton;

