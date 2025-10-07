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
  name: 'QuoteDetail';
  params: { quoteId: string };
};

const QuoteDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { quoteId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    getQuoteById,
    getCustomerById,
    getJobById,
    getPartById,
    getLaborItemById,
    updateQuote,
    deleteQuote,
    quotes,
    settings,
    workspaceId
  } = useJobStore();

  const [quote, setQuote] = useState(() => getQuoteById(quoteId));

  // Refresh quote data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedQuote = getQuoteById(quoteId);
      setQuote(updatedQuote);
    }, [quoteId, quotes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedQuote = getQuoteById(quoteId);
    setQuote(updatedQuote);
    setRefreshing(false);
  }, [quoteId]);

  const customer = quote ? getCustomerById(quote.customerId) : null;
  const job = quote?.jobId ? getJobById(quote.jobId) : null;

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
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Quote',
      `Are you sure you want to delete quote ${quote?.quoteNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteQuote(quoteId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditQuote', { quoteId });
  };

  const handleViewJob = () => {
    if (quote?.jobId && job) {
      navigation.navigate('JobDetail', { jobId: quote.jobId });
    }
  };

  const handleViewCustomer = () => {
    if (quote?.customerId && customer) {
      navigation.navigate('CustomerDetail', { customerId: quote.customerId });
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
    const itemData = item.type === 'part' ? getPartById(item.itemId || item.id) : 
                     item.type === 'labor' ? getLaborItemById(item.itemId || item.id) : null;
    
    // For imported/custom items, use item.description. For parts/labor, use itemData.name
    const itemName = item.description || itemData?.name || itemData?.description || 'Service Item';
    const itemDescription = !item.description && itemData?.description ? itemData.description : null;
    
    // Support custom item type
    const isCustom = item.type === 'custom' || (!item.itemId && !itemData);
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                item.type === 'part' ? 'bg-blue-100' : item.type === 'labor' ? 'bg-green-100' : 'bg-purple-100'
              }`}>
                <Ionicons 
                  name={item.type === 'part' ? 'hardware-chip-outline' : item.type === 'labor' ? 'person-outline' : 'star-outline'} 
                  size={16} 
                  color={item.type === 'part' ? '#3B82F6' : item.type === 'labor' ? '#10B981' : '#8B5CF6'} 
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900" numberOfLines={2}>
                  {itemName}
                </Text>
                <Text className="text-gray-500 text-sm capitalize">
                  {item.type}
                </Text>
              </View>
            </View>
            
            {itemDescription && (
              <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
                {itemDescription}
              </Text>
            )}
            
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-sm">
                Qty: {item.quantity || 0}
              </Text>
              <Text className="text-gray-300 mx-2">•</Text>
              <Text className="text-gray-500 text-sm">
                {formatCurrency(item.unitPrice || item.rate || 0)} each
              </Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(item.total || ((item.quantity || 0) * (item.unitPrice || item.rate || 0)))}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!quote) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="document-text-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Quote not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The quote you're looking for doesn't exist or has been deleted.
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
        {/* Professional Quote Header */}
        <View className="px-6 pt-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4
          }}>
            {/* Quote Number and Status */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 mr-4" style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}>
                  <Ionicons name="document-text" size={24} color="white" />
                </View>
                <View>
                  <Text className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Quote Number</Text>
                  <Text className="text-2xl font-bold text-gray-900 mt-1">{quote.quoteNumber}</Text>
                </View>
              </View>
              <View className={`px-4 py-2 rounded-xl border-2 ${getStatusColor(quote.status)}`} style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1
              }}>
                <Text className="text-sm font-bold">{getStatusLabel(quote.status)}</Text>
              </View>
            </View>

            {/* Quote Title */}
            <View className="mb-4">
              <Text className="text-sm text-gray-500 font-medium mb-1">Project</Text>
              <Text className="text-xl font-bold text-gray-900">{quote.title}</Text>
              {quote.description && (
                <Text className="text-gray-600 mt-2" numberOfLines={3}>
                  {quote.description}
                </Text>
              )}
            </View>

            {/* Total Amount */}
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-sm text-gray-500 font-medium mb-1">Total Amount</Text>
              <Text className="text-2xl font-bold text-gray-900">{formatCurrency(quote.total)}</Text>
            </View>
          </View>
        </View>

        {/* Professional Quote Summary */}
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
              <Text className="text-xl font-bold text-gray-900">Quote Summary</Text>
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
                <Text className="text-blue-700 font-bold text-sm">{quote.items.length} items</Text>
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
              <Text className="text-gray-900 font-bold text-lg">{formatCurrency(quote.subtotal)}</Text>
            </View>

            {/* Tax */}
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="receipt" size={16} color="#F59E0B" />
                </View>
                <Text className="text-gray-700 font-semibold">Tax ({quote.taxRate || 0}%)</Text>
              </View>
              <Text className="text-gray-900 font-bold text-lg">{formatCurrency(quote.tax || 0)}</Text>
            </View>

            {/* Total */}
            <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mt-4 border border-blue-100">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center mr-3" style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2
                }}>
                  <Ionicons name="card" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-900 font-bold text-lg mb-1">Total</Text>
                  <Text className="text-blue-600 font-bold text-2xl" numberOfLines={1}>
                    {formatCurrency(quote.total)}
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

            {/* Quote Info */}
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-gray-600 font-medium">Created Date</Text>
                <Text className="text-gray-900 font-semibold">
                  {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>
              
              {quote.validUntil && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-gray-600 font-medium">Valid Until</Text>
                  <Text className="text-gray-900 font-semibold">
                    {format(new Date(quote.validUntil), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quote Items */}
        <View className="px-4 pt-4 pb-6">
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-900">Detailed Line Items</Text>
            <Text className="text-gray-600 text-sm mt-1">All items included in this quote</Text>
          </View>
          
          {quote.items.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center border border-gray-100">
              <Ionicons name="list-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-3">No items</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                This quote doesn't have any items yet
              </Text>
            </View>
          ) : (
            <>
              {quote.items.map((item, index) => (
                <ItemCard key={`${item.type}-${item.id}-${index}`} item={item} index={index} />
              ))}
              
              {/* Totals */}
              <View className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700 font-medium">Subtotal</Text>
                  <Text className="text-gray-900 font-medium">{formatCurrency(quote.subtotal)}</Text>
                </View>
                
                {quote.tax > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                    <Text className="text-gray-700 font-medium">Tax ({quote.taxRate}%)</Text>
                    <Text className="text-gray-900 font-medium">{formatCurrency(quote.tax)}</Text>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center py-3">
                  <Text className="text-lg font-bold text-gray-900">Total</Text>
                  <Text className="text-lg font-bold text-gray-900">{formatCurrency(quote.total)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Scope of Work */}
        {quote.scopeOfWork && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-blue-100 rounded-lg p-2 mr-3">
                  <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Scope of Work</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.scopeOfWork}</Text>
            </View>
          </View>
        )}

        {/* Specifications */}
        {quote.specifications && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-purple-100 rounded-lg p-2 mr-3">
                  <Ionicons name="settings-outline" size={18} color="#7C3AED" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Specifications</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.specifications}</Text>
            </View>
          </View>
        )}

        {/* Payment Terms */}
        {quote.paymentTerms && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-green-100 rounded-lg p-2 mr-3">
                  <Ionicons name="card-outline" size={18} color="#059669" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Payment Terms</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.paymentTerms}</Text>
            </View>
          </View>
        )}

        {/* Delivery Terms */}
        {quote.deliveryTerms && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-orange-100 rounded-lg p-2 mr-3">
                  <Ionicons name="time-outline" size={18} color="#EA580C" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Delivery Terms</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.deliveryTerms}</Text>
            </View>
          </View>
        )}

        {/* Warranty */}
        {quote.warranty && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-indigo-100 rounded-lg p-2 mr-3">
                  <Ionicons name="shield-checkmark-outline" size={18} color="#4F46E5" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Warranty</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.warranty}</Text>
            </View>
          </View>
        )}

        {/* Additional Notes */}
        {quote.additionalNotes && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-gray-100 rounded-lg p-2 mr-3">
                  <Ionicons name="chatbox-ellipses-outline" size={18} color="#6B7280" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Additional Notes</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.additionalNotes}</Text>
            </View>
          </View>
        )}

        {/* Company Information */}
        {quote.companyInfo && (quote.companyInfo.name || quote.companyInfo.address || quote.companyInfo.contact) && (
          <View className="px-4 pt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-cyan-100 rounded-lg p-2 mr-3">
                  <Ionicons name="business-outline" size={18} color="#0891B2" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Company Information</Text>
              </View>
              
              {quote.companyInfo.name && (
                <View className="mb-3">
                  <Text className="text-sm text-gray-500 font-medium mb-1">Company Name</Text>
                  <Text className="text-gray-700">{quote.companyInfo.name}</Text>
                </View>
              )}
              
              {quote.companyInfo.address && (
                <View className="mb-3">
                  <Text className="text-sm text-gray-500 font-medium mb-1">Address</Text>
                  <Text className="text-gray-700">{quote.companyInfo.address}</Text>
                </View>
              )}
              
              {quote.companyInfo.contact && (
                <View className="mb-0">
                  <Text className="text-sm text-gray-500 font-medium mb-1">Contact</Text>
                  <Text className="text-gray-700">{quote.companyInfo.contact}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View className="px-4 pt-4 pb-6">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-yellow-100 rounded-lg p-2 mr-3">
                  <Ionicons name="document-outline" size={18} color="#D97706" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Notes</Text>
              </View>
              <Text className="text-gray-700 leading-6">{quote.notes}</Text>
            </View>
          </View>
        )}

        {/* Attachments */}
        {quote.attachments && quote.attachments.length > 0 && (
          <View className="px-4 pt-4 pb-6">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-blue-100 rounded-lg p-2 mr-3">
                  <Ionicons name="attach-outline" size={18} color="#3B82F6" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Attachments</Text>
              </View>
              <AttachmentManager
                attachments={quote.attachments}
                onAttachmentsChange={() => {}} // Read-only in detail view
                maxAttachments={5}
                readOnly={true}
                enableSync={true}
                workspaceId={workspaceId}
                documentType="quote"
                documentId={quote.quoteNumber}
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
                type="quote"
                document={quote}
                variant="icon"
                size="medium"
                onEmailSent={() => {
                  console.log('Quote emailed successfully');
                }}
              />
            )}
            
            {/* Edit Button */}
            <Pressable
              onPress={handleEdit}
              className="flex-1 bg-blue-600 py-3 px-4 rounded-xl"
              style={{
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="create-outline" size={18} color="white" />
                <Text className="text-white font-semibold ml-2 text-sm">Edit Quote</Text>
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
          {quote.status === 'draft' && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center space-x-3">
                <Pressable
                  onPress={() => updateQuote(quote.id, { status: 'sent', sentAt: new Date().toISOString() })}
                  className="flex-1 bg-green-600 py-2.5 px-3 rounded-lg"
                  style={{
                    shadowColor: '#10B981',
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
                  onPress={() => updateQuote(quote.id, { status: 'approved', approvedAt: new Date().toISOString() })}
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
                    <Text className="text-white font-semibold ml-1.5 text-xs">Approve</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {quote.status === 'sent' && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Pressable
                onPress={() => updateQuote(quote.id, { status: 'approved', approvedAt: new Date().toISOString() })}
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
                  <Text className="text-white font-semibold ml-1.5 text-xs">Mark as Approved</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default QuoteDetailScreen;
