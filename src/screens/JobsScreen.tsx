import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jobs, customers, getCustomerById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const statusOptions = [
    { key: null, label: 'All' },
    { key: 'quote', label: 'Quotes' },
    { key: 'approved', label: 'Invoices' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const filteredJobs = jobs
    .filter(job => {
      const customer = getCustomerById(job.customerId);
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !selectedStatus || job.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quote': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'quote': return 'Quote';
      case 'approved': return 'Invoice';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const JobCard = ({ job }: { job: any }) => {
    const customer = getCustomerById(job.customerId);
    
    return (
      <Pressable
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
        className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>
              {job.title}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
              <Text className="text-gray-600 text-sm">
                {customer?.name || 'Unknown Customer'}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-xl">
              {formatCurrency(job.total)}
            </Text>
            <View className={`px-3 py-1 rounded-full mt-2 ${getStatusColor(job.status)}`}>
              <Text className="text-xs font-semibold">
                {getStatusLabel(job.status)}
              </Text>
            </View>
          </View>
        </View>
        
        {job.description && (
          <Text className="text-gray-600 text-base mt-2 leading-5" numberOfLines={2}>
            {job.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-2">
              <Ionicons name="list" size={16} color="#3B82F6" />
            </View>
            <Text className="text-gray-700 text-sm font-medium">
              {job.items.length} items
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {format(new Date(job.updatedAt), 'MMM d')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search and Action Buttons */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex-row items-center mb-3">
          <View className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <View className="flex-row items-center">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                placeholder="Search jobs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-gray-900 text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>
        
        <View className="flex-row space-x-2">
          <Pressable
            onPress={() => navigation.navigate('CreateJob', {})}
            className="flex-1 bg-gray-700 rounded-xl px-3 py-3 shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="briefcase-outline" size={18} color="white" />
              <Text className="text-white font-medium ml-1 text-sm">New Job</Text>
            </View>
          </Pressable>
          
          <Pressable
            onPress={() => navigation.navigate('CreateQuote', {})}
            className="flex-1 bg-blue-600 rounded-xl px-3 py-3 shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="document-text-outline" size={18} color="white" />
              <Text className="text-white font-medium ml-1 text-sm">New Quote</Text>
            </View>
          </Pressable>
          
          <Pressable
            onPress={() => navigation.navigate('CreateInvoice', {})}
            className="flex-1 bg-green-600 rounded-xl px-3 py-3 shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="receipt-outline" size={18} color="white" />
              <Text className="text-white font-medium ml-1 text-sm">New Invoice</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Status Filter */}
      <View className="bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        >
          {statusOptions.map((option) => (
            <Pressable
              key={option.key || 'all'}
              onPress={() => setSelectedStatus(option.key)}
              className={`px-5 py-3 rounded-full mr-3 border ${
                selectedStatus === option.key
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-200'
              }`}
              style={{
                shadowColor: selectedStatus === option.key ? '#3B82F6' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selectedStatus === option.key ? 0.2 : 0.1,
                shadowRadius: 4,
                elevation: selectedStatus === option.key ? 3 : 1,
              }}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedStatus === option.key
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Jobs List */}
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
      >
        {filteredJobs.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-6">
              <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 text-xl font-semibold mb-2">
              {searchQuery || selectedStatus ? 'No jobs found' : 'No jobs yet'}
            </Text>
            <Text className="text-gray-500 text-base text-center mb-8 px-8">
              {searchQuery || selectedStatus 
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : 'Create your first job to start tracking your work and managing invoices'
              }
            </Text>
            {!searchQuery && !selectedStatus && (
              <View className="flex-row space-x-4">
                <Pressable
                  onPress={() => navigation.navigate('CreateQuote', {})}
                  className="flex-1 bg-blue-600 rounded-xl px-6 py-4 shadow-lg"
                  style={{
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="document-text-outline" size={20} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">Create Quote</Text>
                  </View>
                </Pressable>
                
                <Pressable
                  onPress={() => navigation.navigate('CreateInvoice', {})}
                  className="flex-1 bg-green-600 rounded-xl px-6 py-4 shadow-lg"
                  style={{
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="receipt-outline" size={20} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">Create Invoice</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <>
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            <View className="h-6" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default JobsScreen;