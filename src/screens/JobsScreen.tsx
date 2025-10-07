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
  const { jobs, customers, getCustomerById, getJobQuotes, getJobInvoices } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const statusOptions = [
    { key: null, label: 'All' },
    { key: 'not-started', label: 'Not Started' },
    { key: 'waiting-quote', label: 'Waiting Quote' },
    { key: 'quote-sent', label: 'Quote Sent' },
    { key: 'quote-approved', label: 'Quote Approved' },
    { key: 'active', label: 'Active' },
    { key: 'on-hold', label: 'On Hold' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  // Get job counts for each status
  const getJobCountForStatus = (status: string | null) => {
    if (status === null) return jobs.length;
    return jobs.filter(job => job.status === status).length;
  };

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
      case 'not-started': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'waiting-quote': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'quote-sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quote-approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not-started': return 'pause-circle';
      case 'waiting-quote': return 'time';
      case 'quote-sent': return 'mail';
      case 'quote-approved': return 'checkmark-circle';
      case 'active': return 'play-circle';
      case 'on-hold': return 'pause';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'on-hold': return 'On Hold';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const JobCard = ({ job }: { job: any }) => {
    const customer = getCustomerById(job.customerId);
    const quotes = getJobQuotes(job.id);
    const invoices = getJobInvoices(job.id);
    const hasActiveQuotes = quotes.some(q => ['draft', 'sent'].includes(q.status));
    const hasApprovedQuotes = quotes.some(q => q.status === 'approved');
    const hasPaidInvoices = invoices.some(i => i.status === 'paid');
    
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
              <Text className="text-gray-600 text-sm" numberOfLines={1}>
                {customer?.name || 'Unknown Customer'}
              </Text>
            </View>
          </View>
          <View className={`px-3 py-1 rounded-full border flex-row items-center ${getStatusColor(job.status)}`}>
            <Ionicons 
              name={getStatusIcon(job.status) as keyof typeof Ionicons.glyphMap} 
              size={14} 
              color={job.status === 'active' ? '#1E40AF' : job.status === 'on-hold' ? '#C2410C' : job.status === 'completed' ? '#166534' : '#7F1D1D'} 
            />
            <Text className={`ml-1 text-xs font-semibold ${
              job.status === 'active' ? 'text-blue-800' : 
              job.status === 'on-hold' ? 'text-yellow-800' : 
              job.status === 'completed' ? 'text-green-800' : 'text-red-800'
            }`}>
              {getStatusLabel(job.status)}
            </Text>
          </View>
        </View>
        
        {job.description && (
          <Text className="text-gray-600 text-base mt-2 leading-5" numberOfLines={2}>
            {job.description}
          </Text>
        )}

        {/* Project metrics */}
        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-2">
              <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
            </View>
            <Text className="text-gray-700 text-sm font-medium">
              {format(new Date(job.createdAt), 'MMM d')}
            </Text>
          </View>
          
          {/* Quotes and Invoices indicators */}
          <View className="flex-row items-center">
            {quotes.length > 0 && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="document-text-outline" size={16} color={hasActiveQuotes ? '#3B82F6' : hasApprovedQuotes ? '#10B981' : '#6B7280'} />
                <Text className={`text-xs ml-1 font-medium ${hasActiveQuotes ? 'text-blue-600' : hasApprovedQuotes ? 'text-green-600' : 'text-gray-500'}`}>
                  {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
                </Text>
              </View>
            )}
            
            {invoices.length > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={16} color={hasPaidInvoices ? '#10B981' : '#6B7280'} />
                <Text className={`text-xs ml-1 font-medium ${hasPaidInvoices ? 'text-green-600' : 'text-gray-500'}`}>
                  {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
                </Text>
              </View>
            )}
            
            {quotes.length === 0 && invoices.length === 0 && (
              <Text className="text-gray-400 text-xs">No quotes or invoices</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search and New Job Button */}
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
        
        {/* New Job Button - Simplified */}
        <Pressable
          onPress={() => navigation.navigate('CreateJob', {})}
          className="bg-blue-600 rounded-xl py-4 shadow-sm"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="briefcase-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2 text-base">New Job</Text>
          </View>
        </Pressable>
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
                {option.label} ({getJobCountForStatus(option.key)})
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
                : 'Create your first job to start managing projects and tracking work'
              }
            </Text>
            {!searchQuery && !selectedStatus && (
              <Pressable
                onPress={() => navigation.navigate('CreateJob', {})}
                className="bg-blue-600 rounded-xl px-6 py-4 shadow-lg"
                style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="briefcase-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-base ml-2">Create Job</Text>
                </View>
              </Pressable>
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