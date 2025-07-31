import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InvoicesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jobs, getCustomerById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter for completed jobs (invoices)
  const invoices = jobs
    .filter(job => job.status === 'completed')
    .filter(job => {
      const customer = getCustomerById(job.customerId);
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const InvoiceCard = ({ job }: { job: any }) => {
    const customer = getCustomerById(job.customerId);
    
    return (
      <Pressable
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
              {job.title}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">
              {customer?.name || 'Unknown Customer'}
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Completed {job.completedAt ? format(new Date(job.completedAt), 'MMM d, yyyy') : 'Recently'}
            </Text>
          </View>
          <View className="items-end ml-3">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(job.total)}
            </Text>
            <View className="bg-green-100 px-3 py-1 rounded-full mt-2">
              <Text className="text-green-800 text-xs font-medium">
                Paid
              </Text>
            </View>
          </View>
        </View>
        
        {job.description && (
          <Text className="text-gray-600 text-sm mt-3" numberOfLines={2}>
            {job.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">
              {job.items.length} items
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={16} color="#10B981" />
            <Text className="text-green-600 text-sm ml-1 font-medium">
              Invoice #{job.id.slice(0, 8)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
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
        </View>
      </View>

      {/* Summary Stats */}
      <View className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-600">
              {invoices.length}
            </Text>
            <Text className="text-gray-600 text-sm">Total Invoices</Text>
          </View>
          <View className="w-px bg-gray-200 mx-4" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-600">
              {formatCurrency(invoices.reduce((sum, job) => sum + job.total, 0))}
            </Text>
            <Text className="text-gray-600 text-sm">Total Revenue</Text>
          </View>
        </View>
      </View>

      {/* Invoices List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {invoices.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? 'No invoices found' : 'No invoices yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Complete some jobs to generate invoices'
              }
            </Text>
          </View>
        ) : (
          <>
            {invoices.map((job) => (
              <InvoiceCard key={job.id} job={job} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default InvoicesScreen;