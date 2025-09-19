import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = {
  key: string;
  name: 'LaborDetail';
  params: { laborId: string };
};

const LaborDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { laborId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    getLaborItemById,
    updateLaborItem,
    deleteLaborItem,
    laborItems,
    jobs,
    quotes,
    invoices
  } = useJobStore();

  const [laborItem, setLaborItem] = useState(() => getLaborItemById(laborId));

  // Refresh labor data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedLabor = getLaborItemById(laborId);
      setLaborItem(updatedLabor);
    }, [laborId, laborItems])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedLabor = getLaborItemById(laborId);
    setLaborItem(updatedLabor);
    setRefreshing(false);
  }, [laborId]);

  // Find usage of this labor item in jobs, quotes, and invoices
  const laborUsage = {
    jobs: jobs.filter(job => job.items.some(item => item.type === 'labor' && item.id === laborId)),
    quotes: quotes.filter(quote => quote.items.some(item => item.type === 'labor' && item.id === laborId)),
    invoices: invoices.filter(invoice => invoice.items.some(item => item.type === 'labor' && item.id === laborId))
  };

  const totalUsage = laborUsage.jobs.length + laborUsage.quotes.length + laborUsage.invoices.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDelete = () => {
    if (totalUsage > 0) {
      Alert.alert(
        'Cannot Delete Labor Item',
        `This labor item is being used in ${totalUsage} job(s), quote(s), or invoice(s). Remove it from those items first before deleting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Labor Item',
      `Are you sure you want to delete "${laborItem?.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteLaborItem(laborId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditLabor', { laborId });
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

  const UsageCard = ({ title, items, icon, onPress }: {
    title: string;
    items: any[];
    icon: keyof typeof Ionicons.glyphMap;
    onPress: (item: any) => void;
  }) => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-3">{title} ({items.length})</Text>
      {items.length === 0 ? (
        <View className="bg-white rounded-xl p-6 items-center border border-gray-100">
          <Ionicons name={icon} size={40} color="#D1D5DB" />
          <Text className="text-gray-500 font-medium mt-2">No {title.toLowerCase()}</Text>
          <Text className="text-gray-400 text-sm text-center mt-1">
            This labor item is not used in any {title.toLowerCase()}
          </Text>
        </View>
      ) : (
        <>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onPress(item)}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900" numberOfLines={1}>
                    {item.title || item.quoteNumber || item.invoiceNumber}
                  </Text>
                  {item.description && (
                    <Text className="text-gray-600 text-sm mt-1" numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  <Text className="text-gray-500 text-xs mt-1">
                    {format(new Date(item.updatedAt || item.createdAt), 'MMM d, yyyy')}
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-sm mr-2">
                      Hours: {item.items.find(i => i.type === 'labor' && i.id === laborId)?.quantity || 0}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );

  if (!laborItem) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="person-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Labor item not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The labor item you're looking for doesn't exist or has been deleted.
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
        {/* Labor Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mr-4">
              <Ionicons name="person" size={40} color="#10B981" />
            </View>
            
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {laborItem.name}
              </Text>
              {laborItem.description && (
                <Text className="text-gray-600 text-lg mb-2">
                  {laborItem.description}
                </Text>
              )}
              
              <View className="flex-row items-center">
                <Text className="text-3xl font-bold text-green-600">
                  {formatCurrency(laborItem.price)}
                </Text>
                <Text className="text-gray-500 text-sm ml-2">per hour</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Labor Information */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Labor Information</Text>
          
          <View className="flex-row items-center mb-3">
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Hourly Rate</Text>
              <Text className="text-gray-600 text-sm">{formatCurrency(laborItem.price)}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Created</Text>
              <Text className="text-gray-600 text-sm">
                {format(new Date(laborItem.createdAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Last Updated</Text>
              <Text className="text-gray-600 text-sm">
                {format(new Date(laborItem.updatedAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Statistics */}
        <View className="px-4 py-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</Text>
          
          <View className="flex-row mb-4">
            <StatCard
              title="Total Usage"
              value={totalUsage}
              icon="analytics"
              color="bg-blue-500"
              subtitle="Jobs, quotes & invoices"
            />
            <StatCard
              title="In Jobs"
              value={laborUsage.jobs.length}
              icon="briefcase"
              color="bg-green-500"
            />
          </View>
          
          <View className="flex-row mb-4">
            <StatCard
              title="In Quotes"
              value={laborUsage.quotes.length}
              icon="document-text"
              color="bg-orange-500"
            />
            <StatCard
              title="In Invoices"
              value={laborUsage.invoices.length}
              icon="receipt"
              color="bg-purple-500"
            />
          </View>
        </View>

        {/* Usage Details */}
        <View className="px-4 pb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Where This Labor Is Used</Text>
          
          <UsageCard
            title="Jobs"
            items={laborUsage.jobs}
            icon="briefcase-outline"
            onPress={(job) => navigation.navigate('JobDetail', { jobId: job.id })}
          />
          
          <UsageCard
            title="Quotes"
            items={laborUsage.quotes}
            icon="document-text-outline"
            onPress={(quote) => navigation.navigate('QuoteDetail', { quoteId: quote.id })}
          />
          
          <UsageCard
            title="Invoices"
            items={laborUsage.invoices}
            icon="receipt-outline"
            onPress={(invoice) => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
          />
        </View>
      </ScrollView>

      {/* Quick Actions */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex-row"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={handleEdit}
          className="flex-1 bg-green-600 rounded-xl py-4 mr-3"
        >
          <Text className="text-white font-semibold text-center text-base">
            Edit Labor
          </Text>
        </Pressable>
        
        <Pressable
          onPress={handleDelete}
          className="px-4 py-4 bg-red-100 rounded-xl"
          disabled={totalUsage > 0}
        >
          <Ionicons 
            name="trash-outline" 
            size={24} 
            color={totalUsage > 0 ? "#9CA3AF" : "#EF4444"} 
          />
        </Pressable>
      </View>
    </View>
  );
};

export default LaborDetailScreen;
