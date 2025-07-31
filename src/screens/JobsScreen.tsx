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
    { key: 'approved', label: 'Approved' },
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
              Updated {format(new Date(job.updatedAt), 'MMM d, yyyy')}
            </Text>
          </View>
          <View className="items-end ml-3">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(job.total)}
            </Text>
            <View className={`px-3 py-1 rounded-full mt-2 ${getStatusColor(job.status)}`}>
              <Text className="text-xs font-medium capitalize">
                {job.status.replace('-', ' ')}
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
          {job.dueDate && (
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1">
                Due {format(new Date(job.dueDate), 'MMM d')}
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
                placeholder="Search jobs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreateJob', {})}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-white border-b border-gray-200"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {statusOptions.map((option) => (
          <Pressable
            key={option.key || 'all'}
            onPress={() => setSelectedStatus(option.key)}
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedStatus === option.key
                ? 'bg-blue-600'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedStatus === option.key
                  ? 'text-white'
                  : 'text-gray-600'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Jobs List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {filteredJobs.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="briefcase-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery || selectedStatus ? 'No jobs found' : 'No jobs yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery || selectedStatus 
                ? 'Try adjusting your search or filters'
                : 'Create your first job to get started'
              }
            </Text>
            {!searchQuery && !selectedStatus && (
              <Pressable
                onPress={() => navigation.navigate('CreateJob', {})}
                className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
              >
                <Text className="text-white font-semibold">Create Job</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default JobsScreen;