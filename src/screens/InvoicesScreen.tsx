import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';
import EmailButton from '../components/EmailButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InvoicesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { invoices, getCustomerById, getJobById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter invoices
  const filteredInvoices = invoices
    .filter(invoice => {
      const customer = getCustomerById(invoice.customerId);
      const job = getJobById(invoice.jobId);
      const matchesSearch = !searchQuery || 
        invoice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return 'document-outline';
      case 'sent': return 'send-outline';
      case 'paid': return 'checkmark-circle-outline';
      case 'overdue': return 'warning-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const InvoiceCard = ({ invoice }: { invoice: any }) => {
    const customer = getCustomerById(invoice.customerId);
    const job = getJobById(invoice.jobId);
    const isOverdue = invoice.status === 'sent' && new Date(invoice.dueDate) < new Date();
    
    return (
      <Pressable
        onPress={() => {
          // TODO: Navigate to invoice detail screen
          // For now, navigate to job detail to see the invoice context
          navigation.navigate('JobDetail', { jobId: invoice.jobId });
        }}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="font-bold text-green-600 text-base mr-2">
                {invoice.invoiceNumber}
              </Text>
              <View className={`px-2 py-1 rounded-full border flex-row items-center ${getStatusColor(isOverdue ? 'overdue' : invoice.status)}`}>
                <Ionicons 
                  name={getStatusIcon(isOverdue ? 'overdue' : invoice.status) as keyof typeof Ionicons.glyphMap} 
                  size={12} 
                  color={isOverdue ? '#DC2626' : invoice.status === 'paid' ? '#166534' : invoice.status === 'sent' ? '#1E40AF' : '#6B7280'}
                  style={{ marginRight: 4 }}
                />
                <Text className="text-xs font-medium">
                  {getStatusLabel(isOverdue ? 'overdue' : invoice.status)}
                </Text>
              </View>
            </View>
            
            <Text className="font-semibold text-gray-900 text-lg mb-1" numberOfLines={1}>
              {invoice.title}
            </Text>
            
            <View className="flex-row items-center mb-1">
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                {customer?.name || 'Unknown Customer'}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                {job?.title || 'Unknown Job'}
              </Text>
            </View>
          </View>
          
          <View className="items-end ml-3">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(invoice.total)}
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
            </Text>
            {invoice.paidAt && (
              <Text className="text-green-600 text-xs mt-1 font-medium">
                Paid {format(new Date(invoice.paidAt), 'MMM d')}
              </Text>
            )}
          </View>
        </View>
        
        {invoice.description && (
          <Text className="text-gray-600 text-sm mt-3" numberOfLines={2}>
            {invoice.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">
              {invoice.items.length} items
            </Text>
          </View>
          
          <View className="flex-row items-center">
            {invoice.paymentTerms && (
              <>
                <Ionicons name="card-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1 mr-3">
                  {invoice.paymentTerms}
                </Text>
              </>
            )}
            
            {/* Email Button */}
            <EmailButton
              type="invoice"
              document={invoice}
              variant="icon"
              size="small"
              onEmailSent={() => {
                // Refresh the invoice list or show success feedback
                console.log('Invoice emailed successfully');
              }}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, invoice) => sum + (invoice.paidAmount || invoice.total), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search and Add Button */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2 mr-3">
            <View className="flex-row items-center">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                placeholder="Search invoices..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreateInvoice', {})}
            className="bg-green-600 rounded-lg px-4 py-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Summary Stats */}
      {filteredInvoices.length > 0 && (
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</Text>
              <Text className="text-gray-600 text-sm">Total Invoiced</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</Text>
              <Text className="text-gray-600 text-sm">Total Paid</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</Text>
              <Text className="text-gray-600 text-sm">Outstanding</Text>
            </View>
          </View>
        </View>
      )}

      {/* Invoices List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {filteredInvoices.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? 'No invoices found' : 'No invoices yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Create your first invoice to bill customers'
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => navigation.navigate('CreateInvoice', {})}
                className="bg-green-600 rounded-lg px-6 py-3 mt-6"
              >
                <Text className="text-white font-semibold">Create Invoice</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default InvoicesScreen;