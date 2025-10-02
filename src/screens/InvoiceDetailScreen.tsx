import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, Linking } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';
import EmailButton from '../components/EmailButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = {
  key: string;
  name: 'InvoiceDetail';
  params: { invoiceId: string };
};

const InvoiceDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { invoiceId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    getInvoiceById,
    getCustomerById,
    getJobById,
    getQuoteById,
    getPartById,
    getLaborItemById,
    updateInvoice,
    deleteInvoice,
    invoices
  } = useJobStore();

  const [invoice, setInvoice] = useState(() => getInvoiceById(invoiceId));

  // Refresh invoice data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedInvoice = getInvoiceById(invoiceId);
      setInvoice(updatedInvoice);
    }, [invoiceId, invoices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedInvoice = getInvoiceById(invoiceId);
    setInvoice(updatedInvoice);
    setRefreshing(false);
  }, [invoiceId]);

  const customer = invoice ? getCustomerById(invoice.customerId) : null;
  const job = invoice?.jobId ? getJobById(invoice.jobId) : null;
  const quote = invoice?.quoteId ? getQuoteById(invoice.quoteId) : null;

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${invoice?.invoiceNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoiceId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditInvoice', { invoiceId });
  };

  const handleViewJob = () => {
    if (invoice?.jobId && job) {
      navigation.navigate('JobDetail', { jobId: invoice.jobId });
    }
  };

  const handleViewQuote = () => {
    if (invoice?.quoteId && quote) {
      navigation.navigate('QuoteDetail', { quoteId: invoice.quoteId });
    }
  };

  const handleViewCustomer = () => {
    if (invoice?.customerId && customer) {
      navigation.navigate('CustomerDetail', { customerId: invoice.customerId });
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    subtitle?: string;
  }) => (
    <View className="bg-white rounded-xl p-4 flex-1 mx-1 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-gray-600 text-sm font-medium">{title}</Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1" numberOfLines={1}>{value}</Text>
          {subtitle && (
            <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>
          )}
        </View>
        <View className={`w-12 h-12 rounded-full items-center justify-center ${color}`}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
      </View>
    </View>
  );

  const ItemCard = ({ item, index }: { item: any; index: number }) => {
    const itemData = item.type === 'part' ? getPartById(item.id) : getLaborItemById(item.id);
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                item.type === 'part' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <Ionicons 
                  name={item.type === 'part' ? 'hardware-chip-outline' : 'person-outline'} 
                  size={16} 
                  color={item.type === 'part' ? '#3B82F6' : '#10B981'} 
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                  {itemData?.name || 'Unknown Item'}
                </Text>
                <Text className="text-gray-500 text-sm capitalize">
                  {item.type}
                </Text>
              </View>
            </View>
            
            {itemData?.description && (
              <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
                {itemData.description}
              </Text>
            )}
            
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-sm">
                Qty: {item.quantity}
              </Text>
              <Text className="text-gray-300 mx-2">•</Text>
              <Text className="text-gray-500 text-sm">
                {formatCurrency(item.rate)} each
              </Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(item.quantity * item.rate)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!invoice) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="receipt-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Invoice not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The invoice you're looking for doesn't exist or has been deleted.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Invoice Header Card */}
        <View className="px-4 pt-4">
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 mr-4">
                <Text className="text-xs text-gray-500 font-medium mb-1">INVOICE</Text>
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {invoice.invoiceNumber}
                </Text>
                <Text className="text-base text-gray-700 font-medium mb-2">
                  {invoice.title}
                </Text>
                {invoice.description && (
                  <Text className="text-gray-600 text-sm mb-3">
                    {invoice.description}
                  </Text>
                )}
                
                <View className={`self-start px-3 py-1.5 rounded-full ${getStatusColor(invoice.status)}`}>
                  <Text className="text-xs font-semibold">
                    {getStatusLabel(invoice.status)}
                  </Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className="text-3xl font-bold text-gray-900">
                  {formatCurrency(invoice.total)}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Total Amount
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Invoice Details Card */}
        <View className="px-4 pt-4">
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</Text>
            
            {/* Customer */}
            <Pressable
              onPress={handleViewCustomer}
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 font-medium">CUSTOMER</Text>
                  <Text className="text-gray-900 font-semibold">{customer?.company || customer?.name || 'Unknown Customer'}</Text>
                  {customer?.company && customer?.name && (
                    <Text className="text-gray-500 text-xs">{customer.name}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>

            {/* Job (if linked) */}
            {job && (
              <Pressable
                onPress={handleViewJob}
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Ionicons name="briefcase-outline" size={20} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 font-medium">LINKED JOB</Text>
                    <Text className="text-gray-900 font-semibold">{job.title}</Text>
                    <Text className="text-gray-500 text-xs capitalize">{job.status}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Dates */}
            <View className="border-t border-gray-100 pt-3 mt-1">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-600 text-sm">Created</Text>
                <Text className="text-gray-900 font-medium text-sm">
                  {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>

              {invoice.dueDate && (
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-600 text-sm">Due Date</Text>
                  <Text className="text-gray-900 font-medium text-sm">
                    {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              {invoice.sentAt && (
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-600 text-sm">Sent</Text>
                  <Text className="text-gray-900 font-medium text-sm">
                    {format(new Date(invoice.sentAt), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              {invoice.paidAt && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-green-600 text-sm font-medium">Paid</Text>
                  <Text className="text-green-600 font-semibold text-sm">
                    {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Invoice Items Card */}
        <View className="px-4 pt-4">
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Line Items</Text>
            
            {invoice.items.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="list-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 text-base font-medium mt-3">No items</Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">
                  This invoice has no line items
                </Text>
              </View>
            ) : (
              <>
                {invoice.items.map((item, index) => (
                  <View key={`${item.type}-${item.id}-${index}`} className={index < invoice.items.length - 1 ? "mb-3 pb-3 border-b border-gray-100" : "mb-3"}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-gray-900 font-semibold text-base mb-1">
                          {item.description || item.type}
                        </Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 text-sm">
                            Qty: {item.quantity}
                          </Text>
                          <Text className="text-gray-300 mx-2">•</Text>
                          <Text className="text-gray-500 text-sm">
                            {formatCurrency(item.rate)} each
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-900 font-bold text-lg">
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Totals Card */}
        <View className="px-4 pt-4 pb-6">
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Summary</Text>
            
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-600 text-base">Subtotal</Text>
              <Text className="text-gray-900 font-semibold text-base">{formatCurrency(invoice.subtotal)}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-600 text-base">Tax ({invoice.taxRate}%)</Text>
              <Text className="text-gray-900 font-semibold text-base">{formatCurrency(invoice.tax)}</Text>
            </View>

            <View className="flex-row justify-between items-center py-3 border-t-2 border-gray-200 mt-2">
              <Text className="text-gray-900 font-bold text-lg">Total</Text>
              <Text className="text-gray-900 font-bold text-xl">{formatCurrency(invoice.total)}</Text>
            </View>

            {invoice.status === 'paid' && invoice.paidAmount !== undefined && (
              <View className="bg-green-50 rounded-lg p-3 mt-3 border border-green-200">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text className="text-green-700 font-semibold ml-2">Paid</Text>
                  </View>
                  <Text className="text-green-700 font-bold text-base">{formatCurrency(invoice.paidAmount)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View className="px-4 pb-6">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Notes</Text>
              <Text className="text-gray-700 leading-6">{invoice.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex-row"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {customer?.email && (
          <View className="mr-3">
            <EmailButton
              type="invoice"
              document={invoice}
              variant="primary"
              size="medium"
              onEmailSent={() => {
                console.log('Invoice emailed successfully');
              }}
            />
          </View>
        )}
        
        <Pressable
          onPress={handleEdit}
          className="px-4 py-4 bg-gray-100 rounded-xl mr-3"
        >
          <Ionicons name="create-outline" size={24} color="#6B7280" />
        </Pressable>
        
        <Pressable
          onPress={handleDelete}
          className="px-4 py-4 bg-red-100 rounded-xl"
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
};

export default InvoiceDetailScreen;
