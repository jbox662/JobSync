import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CustomersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { customers, jobs } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = !searchQuery || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const getCustomerJobCount = (customerId: string) => {
    return jobs.filter(job => job.customerId === customerId).length;
  };

  const getCustomerRevenue = (customerId: string) => {
    return jobs
      .filter(job => job.customerId === customerId && job.status === 'completed')
      .reduce((sum, job) => sum + job.total, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const CustomerCard = ({ customer }: { customer: any }) => {
    const jobCount = getCustomerJobCount(customer.id);
    const revenue = getCustomerRevenue(customer.id);
    
    return (
      <Pressable
        onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start">
          <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3 flex-shrink-0">
            <Text className="text-blue-600 font-semibold text-lg">
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
              {customer.name}
            </Text>
            
            {customer.company && (
              <Text className="text-gray-600 text-sm mt-1" numberOfLines={1}>
                {customer.company}
              </Text>
            )}
            
            {/* Contact Information - Vertical Stack */}
            <View className="mt-2">
              {customer.email && (
                <View className="flex-row items-center mb-1">
                  <Ionicons name="mail-outline" size={14} color="#6B7280" />
                  <Text className="text-gray-600 text-xs ml-1 flex-1" numberOfLines={1}>
                    {customer.email}
                  </Text>
                </View>
              )}
              
              {customer.phone && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={14} color="#6B7280" />
                  <Text className="text-gray-600 text-xs ml-1 flex-1" numberOfLines={1}>
                    {customer.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <View className="flex-row items-center flex-1 mr-4">
            <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">
              {jobCount} jobs
            </Text>
          </View>
          
          {revenue > 0 && (
            <View className="flex-row items-center flex-shrink-0">
              <Ionicons name="trending-up-outline" size={16} color="#10B981" />
              <Text className="text-green-600 text-sm ml-1 font-medium">
                {formatCurrency(revenue)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search and Add Button */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2 mr-3">
            <View className="flex-row items-center">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                placeholder="Search customers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreateCustomer')}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Customers List */}
      <ScrollView 
        className="flex-1 px-4 pt-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {filteredCustomers.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Add your first customer to get started'
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => navigation.navigate('CreateCustomer')}
                className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
              >
                <Text className="text-white font-semibold">Add Customer</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default CustomersScreen;