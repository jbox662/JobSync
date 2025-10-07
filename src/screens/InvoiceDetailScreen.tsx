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
import AttachmentManager from '../components/AttachmentManager';

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
    invoices,
    settings,
    workspaceId
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
  const isOverdue = invoice?.status === 'sent' && 
                   invoice?.dueDate && 
                   typeof invoice.dueDate === 'string' && 
                   new Date(invoice.dueDate) < new Date();

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
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
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
    const itemData = item.type === 'part' ? getPartById(item.itemId) : getLaborItemById(item.itemId);
    
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
                Qty: {item.quantity || 0}
              </Text>
              <Text className="text-gray-300 mx-2">•</Text>
              <Text className="text-gray-500 text-sm">
                {formatCurrency(item.rate || item.price || 0)} each
              </Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency((item.quantity || 0) * (item.rate || item.price || 0))}
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
        {/* Professional Invoice Header */}
        <View className="px-6 pt-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4
          }}>
            {/* Invoice Number and Status */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-3 mr-4" style={{
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}>
                  <Ionicons name="receipt" size={24} color="white" />
                </View>
                <View>
                  <Text className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Invoice Number</Text>
                  <Text className="text-2xl font-bold text-gray-900 mt-1">{invoice.invoiceNumber}</Text>
                </View>
              </View>
              <View className={`px-4 py-2 rounded-xl border-2 ${getStatusColor(invoice.status)}`} style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1
              }}>
                <Text className="text-sm font-bold">{getStatusLabel(invoice.status)}</Text>
              </View>
            </View>

            {/* Invoice Title */}
            <View className="mb-4">
              <Text className="text-sm text-gray-500 font-medium mb-1">Project</Text>
              <Text className="text-xl font-bold text-gray-900">{invoice.title}</Text>
              {invoice.description && (
                <Text className="text-gray-600 mt-2" numberOfLines={3}>
                  {invoice.description}
                </Text>
              )}
            </View>

            {/* Total Amount */}
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-sm text-gray-500 font-medium mb-1">Total Amount</Text>
              <Text className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Professional Invoice Summary */}
        <View className="px-6 pt-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4
          }}>
            <View className="flex-row items-center mb-6">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="calculator" size={20} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Invoice Summary</Text>
            </View>
            
            {/* Items Count */}
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="list" size={16} color="#3B82F6" />
                </View>
                <Text className="text-gray-700 font-semibold">Line Items</Text>
              </View>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-700 font-bold text-sm">{invoice.items.length} items</Text>
              </View>
            </View>

            {/* Subtotal */}
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="calculator" size={16} color="#6B7280" />
                </View>
                <Text className="text-gray-700 font-semibold">Subtotal</Text>
              </View>
              <Text className="text-gray-900 font-bold text-lg">{formatCurrency(invoice.subtotal)}</Text>
            </View>

            {/* Tax */}
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="receipt" size={16} color="#F59E0B" />
                </View>
                <Text className="text-gray-700 font-semibold">Tax ({invoice.taxRate || 0}%)</Text>
              </View>
              <Text className="text-gray-900 font-bold text-lg">{formatCurrency(invoice.tax || 0)}</Text>
            </View>

            {/* Due Date */}
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${isOverdue ? 'bg-red-100' : 'bg-purple-100'}`}>
                  <Ionicons name="calendar" size={16} color={isOverdue ? '#EF4444' : '#8B5CF6'} />
                </View>
                <Text className="text-gray-700 font-semibold">Due Date</Text>
              </View>
              <View className="items-end">
                <Text className={`font-bold text-lg ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                </Text>
                {isOverdue && (
                  <View className="bg-red-100 px-2 py-1 rounded-md mt-1">
                    <Text className="text-red-700 text-xs font-bold">
                      {Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Total */}
            <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mt-4 border border-green-100">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-green-600 rounded-xl items-center justify-center mr-3" style={{
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2
                }}>
                  <Ionicons name="card" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-green-900 font-bold text-lg mb-1">Total</Text>
                  <Text className="text-green-600 font-bold text-2xl" numberOfLines={1}>
                    {formatCurrency(invoice.total)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Customer & Details */}
        <View className="px-6 pt-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4
          }}>
            <View className="flex-row items-center mb-6">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#8B5CF6" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Customer Information</Text>
            </View>
            
            {/* Customer */}
            <Pressable onPress={handleViewCustomer} className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-100 rounded-lg p-3 mr-4">
                  <Ionicons name="person" size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-base">
                    {customer?.name || 'Unknown Customer'}
                  </Text>
                  {customer?.company && (
                    <Text className="text-gray-600 text-sm mt-1">{customer.company}</Text>
                  )}
                  {customer?.email && (
                    <Text className="text-gray-500 text-sm mt-1">{customer.email}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>

            {/* Quote Link */}
            {quote && (
              <Pressable onPress={handleViewQuote} className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                <View className="flex-row items-center flex-1">
                  <View className="bg-purple-100 rounded-lg p-3 mr-4">
                    <Ionicons name="document-text" size={20} color="#7C3AED" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">From Quote</Text>
                    <Text className="text-gray-600 text-sm mt-1">{quote.quoteNumber}</Text>
                    <Text className="text-gray-500 text-sm mt-1">{quote.title}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Job Link */}
            {job && (
              <Pressable onPress={handleViewJob} className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                <View className="flex-row items-center flex-1">
                  <View className="bg-orange-100 rounded-lg p-3 mr-4">
                    <Ionicons name="briefcase" size={20} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">Linked Job</Text>
                    <Text className="text-gray-600 text-sm mt-1">{job.title}</Text>
                    <Text className="text-gray-500 text-sm mt-1 capitalize">{job.status}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Invoice Info */}
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-gray-600 font-medium">Created Date</Text>
                <Text className="text-gray-900 font-semibold">
                  {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>
              
              {invoice.sentAt && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-gray-600 font-medium">Sent Date</Text>
                  <Text className="text-gray-900 font-semibold">
                    {format(new Date(invoice.sentAt), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
              
              {invoice.paidAt && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-gray-600 font-medium">Paid Date</Text>
                  <Text className="text-green-600 font-semibold">
                    {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
              
              {invoice.paymentTerms && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-gray-600 font-medium">Payment Terms</Text>
                  <Text className="text-gray-900 font-semibold">{invoice.paymentTerms}</Text>
                </View>
              )}
            </View>
          </View>
        </View>


        {/* Invoice Items */}
        <View className="px-4 pt-4 pb-6">
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-900">Detailed Line Items</Text>
            <Text className="text-gray-600 text-sm mt-1">All items included in this invoice</Text>
          </View>
          
          {invoice.items.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center border border-gray-100">
              <Ionicons name="list-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-3">No items</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                This invoice doesn't have any items yet
              </Text>
            </View>
          ) : (
            <>
              {invoice.items.map((item, index) => (
                <ItemCard key={`${item.type}-${item.id}-${index}`} item={item} index={index} />
              ))}
              
              {/* Totals */}
              <View className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700 font-medium">Subtotal</Text>
                  <Text className="text-gray-900 font-medium">{formatCurrency(invoice.subtotal)}</Text>
                </View>
                
                {invoice.tax > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                    <Text className="text-gray-700 font-medium">Tax ({invoice.taxRate}%)</Text>
                    <Text className="text-gray-900 font-medium">{formatCurrency(invoice.tax)}</Text>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center py-3">
                  <Text className="text-lg font-bold text-gray-900">Total</Text>
                  <Text className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View className="px-4 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Notes</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <Text className="text-gray-700 leading-6">{invoice.notes}</Text>
            </View>
          </View>
        )}

        {/* Attachments */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <View className="px-4 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Attachments</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <AttachmentManager
                attachments={invoice.attachments}
                onAttachmentsChange={() => {}} // Read-only in detail view
                maxAttachments={5}
                readOnly={true}
                enableSync={true}
                workspaceId={workspaceId}
                documentType="invoice"
                documentId={invoice.invoiceNumber}
                settings={settings}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Professional Action Bar */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200"
        style={{ 
          paddingBottom: insets.bottom + 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8
        }}
      >
        <View className="px-6 py-5">
          <View className="flex-row items-center space-x-3">
            {/* Email Button */}
            {customer?.email && (
              <EmailButton
                type="invoice"
                document={invoice}
                variant="icon"
                size="medium"
                onEmailSent={() => {
                  console.log('Invoice emailed successfully');
                }}
              />
            )}
            
            {/* Edit Button */}
            <Pressable
              onPress={handleEdit}
              className="flex-1 bg-green-600 py-3 px-4 rounded-xl"
              style={{
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="create-outline" size={18} color="white" />
                <Text className="text-white font-semibold ml-2 text-sm">Edit Invoice</Text>
              </View>
            </Pressable>

            {/* Secondary Actions */}
            {job && (
              <Pressable
                onPress={handleViewJob}
                className="w-11 h-11 bg-gray-100 rounded-xl items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <Ionicons name="briefcase-outline" size={18} color="#6B7280" />
              </Pressable>
            )}
            
            {customer && (
              <Pressable
                onPress={handleViewCustomer}
                className="w-11 h-11 bg-gray-100 rounded-xl items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <Ionicons name="person-outline" size={18} color="#6B7280" />
              </Pressable>
            )}
            
            <Pressable
              onPress={handleDelete}
              className="w-11 h-11 bg-red-100 rounded-xl items-center justify-center"
              style={{
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>

          {/* Status Actions Row */}
          {invoice.status === 'draft' && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center space-x-3">
                <Pressable
                  onPress={() => updateInvoice(invoice.id, { status: 'sent', sentAt: new Date().toISOString() })}
                  className="flex-1 bg-blue-600 py-2.5 px-3 rounded-lg"
                  style={{
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 2
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="send-outline" size={16} color="white" />
                    <Text className="text-white font-semibold ml-1.5 text-xs">Mark as Sent</Text>
                  </View>
                </Pressable>
                
                <Pressable
                  onPress={() => updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString() })}
                  className="flex-1 bg-emerald-600 py-2.5 px-3 rounded-lg"
                  style={{
                    shadowColor: '#059669',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 2
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                    <Text className="text-white font-semibold ml-1.5 text-xs">Mark Paid</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {invoice.status === 'sent' && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Pressable
                onPress={() => updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString() })}
                className="bg-emerald-600 py-2.5 px-3 rounded-lg"
                style={{
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  elevation: 2
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                  <Text className="text-white font-semibold ml-1.5 text-xs">Mark as Paid</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default InvoiceDetailScreen;
