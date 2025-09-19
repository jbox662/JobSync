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
  name: 'PartDetail';
  params: { partId: string };
};

const PartDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { partId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    getPartById,
    updatePart,
    deletePart,
    parts,
    jobs,
    quotes,
    invoices
  } = useJobStore();

  const [part, setPart] = useState(() => getPartById(partId));

  // Refresh part data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedPart = getPartById(partId);
      setPart(updatedPart);
    }, [partId, parts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedPart = getPartById(partId);
    setPart(updatedPart);
    setRefreshing(false);
  }, [partId]);

  // Find usage of this part in jobs, quotes, and invoices
  const partUsage = {
    jobs: jobs.filter(job => job.items.some(item => item.type === 'part' && item.id === partId)),
    quotes: quotes.filter(quote => quote.items.some(item => item.type === 'part' && item.id === partId)),
    invoices: invoices.filter(invoice => invoice.items.some(item => item.type === 'part' && item.id === partId))
  };

  const totalUsage = partUsage.jobs.length + partUsage.quotes.length + partUsage.invoices.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDelete = () => {
    if (totalUsage > 0) {
      Alert.alert(
        'Cannot Delete Part',
        `This part is being used in ${totalUsage} job(s), quote(s), or invoice(s). Remove it from those items first before deleting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Part',
      `Are you sure you want to delete "${part?.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePart(partId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditPart', { partId });
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
            This part is not used in any {title.toLowerCase()}
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
                      Qty: {item.items.find(i => i.type === 'part' && i.id === partId)?.quantity || 0}
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

  if (!part) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="hardware-chip-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Part not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The part you're looking for doesn't exist or has been deleted.
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
        {/* Part Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mr-4">
              <Ionicons name="hardware-chip" size={40} color="#3B82F6" />
            </View>
            
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {part.name}
              </Text>
              {part.description && (
                <Text className="text-gray-600 text-lg mb-2">
                  {part.description}
                </Text>
              )}
              
              <View className="flex-row items-center">
                <Text className="text-3xl font-bold text-blue-600">
                  {formatCurrency(part.price)}
                </Text>
                <Text className="text-gray-500 text-sm ml-2">per unit</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Part Information */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Part Information</Text>
          
          <View className="flex-row items-center mb-3">
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Price</Text>
              <Text className="text-gray-600 text-sm">{formatCurrency(part.price)}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Created</Text>
              <Text className="text-gray-600 text-sm">
                {format(new Date(part.createdAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-700 font-medium">Last Updated</Text>
              <Text className="text-gray-600 text-sm">
                {format(new Date(part.updatedAt), 'MMM d, yyyy h:mm a')}
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
              value={partUsage.jobs.length}
              icon="briefcase"
              color="bg-green-500"
            />
          </View>
          
          <View className="flex-row mb-4">
            <StatCard
              title="In Quotes"
              value={partUsage.quotes.length}
              icon="document-text"
              color="bg-orange-500"
            />
            <StatCard
              title="In Invoices"
              value={partUsage.invoices.length}
              icon="receipt"
              color="bg-purple-500"
            />
          </View>
        </View>

        {/* Usage Details */}
        <View className="px-4 pb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Where This Part Is Used</Text>
          
          <UsageCard
            title="Jobs"
            items={partUsage.jobs}
            icon="briefcase-outline"
            onPress={(job) => navigation.navigate('JobDetail', { jobId: job.id })}
          />
          
          <UsageCard
            title="Quotes"
            items={partUsage.quotes}
            icon="document-text-outline"
            onPress={(quote) => navigation.navigate('QuoteDetail', { quoteId: quote.id })}
          />
          
          <UsageCard
            title="Invoices"
            items={partUsage.invoices}
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
          className="flex-1 bg-blue-600 rounded-xl py-4 mr-3"
        >
          <Text className="text-white font-semibold text-center text-base">
            Edit Part
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

export default PartDetailScreen;
