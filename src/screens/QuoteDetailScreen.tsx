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
    quotes
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
        {/* Quote Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {quote.quoteNumber}
              </Text>
              <Text className="text-lg text-gray-700 mb-2">
                {quote.title}
              </Text>
              {quote.description && (
                <Text className="text-gray-600 mb-3">
                  {quote.description}
                </Text>
              )}
              
              <View className={`self-start px-3 py-1 rounded-full border ${getStatusColor(quote.status)}`}>
                <Text className="text-sm font-medium">
                  {getStatusLabel(quote.status)}
                </Text>
              </View>
            </View>
            
            <View className="items-end ml-4">
              <Text className="text-3xl font-bold text-gray-900">
                {formatCurrency(quote.total)}
              </Text>
              <Text className="text-gray-500 text-sm">
                Total Amount
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Job Info */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Quote Details</Text>
          
          {/* Customer */}
          <Pressable
            onPress={handleViewCustomer}
            className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="person-circle-outline" size={24} color="#6B7280" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-900 font-medium">Customer</Text>
                <Text className="text-gray-600 text-sm">{customer?.company || customer?.name || 'Unknown Customer'}</Text>
                {customer?.company && customer?.name && (
                  <Text className="text-gray-500 text-xs">{customer.name}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          {/* Job (if linked) */}
          {job && (
            <Pressable
              onPress={handleViewJob}
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-3"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="briefcase-outline" size={24} color="#6B7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 font-medium">Linked Job</Text>
                  <Text className="text-gray-600 text-sm">{job.title}</Text>
                  <Text className="text-gray-500 text-xs capitalize">{job.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          )}

          {/* Quote Dates */}
          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Created</Text>
              <Text className="text-gray-600 text-sm">
                {format(new Date(quote.createdAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>

          {quote.validUntil && (
            <View className="flex-row items-center mb-3">
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Valid Until</Text>
                <Text className="text-gray-600 text-sm">
                  {format(new Date(quote.validUntil), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
          )}

          {quote.sentAt && (
            <View className="flex-row items-center">
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Sent</Text>
                <Text className="text-gray-600 text-sm">
                  {format(new Date(quote.sentAt), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quote Summary */}
        <View className="px-4 py-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</Text>
          
          <View className="flex-row mb-4">
            <StatCard
              title="Items"
              value={quote.items.length}
              icon="list"
              color="bg-blue-500"
            />
            <StatCard
              title="Subtotal"
              value={formatCurrency(quote.subtotal)}
              icon="calculator"
              color="bg-green-500"
            />
          </View>
          
          <View className="flex-row mb-4">
            <StatCard
              title="Tax Rate"
              value={`${quote.taxRate}%`}
              icon="receipt"
              color="bg-orange-500"
            />
            <StatCard
              title="Tax Amount"
              value={formatCurrency(quote.tax)}
              icon="card"
              color="bg-purple-500"
            />
          </View>
        </View>

        {/* Quote Items */}
        <View className="px-4 pb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quote Items</Text>
          
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

        {/* Notes */}
        {quote.notes && (
          <View className="px-4 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Notes</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <Text className="text-gray-700 leading-6">{quote.notes}</Text>
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
              type="quote"
              document={quote}
              variant="button"
              size="medium"
              onEmailSent={() => {
                console.log('Quote emailed successfully');
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

export default QuoteDetailScreen;
