import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, Linking } from 'react-native';
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
  name: 'CustomerDetail';
  params: { customerId: string };
};

const CustomerDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  
  const { 
    getCustomerById, 
    updateCustomer,
    deleteCustomer,
    jobs, 
    customers
  } = useJobStore();

  const [customer, setCustomer] = useState(() => getCustomerById(customerId));

  // Refresh customer data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedCustomer = getCustomerById(customerId);
      setCustomer(updatedCustomer);
    }, [customerId, customers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedCustomer = getCustomerById(customerId);
    setCustomer(updatedCustomer);
    setRefreshing(false);
  }, [customerId]);

  const customerJobs = jobs.filter(job => job.customerId === customerId);
  
  const filteredJobs = customerJobs.filter(job => {
    if (!selectedFilter) return true;
    if (selectedFilter === 'active') return ['quote', 'approved', 'in-progress'].includes(job.status);
    if (selectedFilter === 'completed') return job.status === 'completed';
    return job.status === selectedFilter;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const stats = {
    totalJobs: customerJobs.length,
    completedJobs: customerJobs.filter(job => job.status === 'completed').length,
    activeJobs: customerJobs.filter(job => job.status === 'active').length,
    totalRevenue: 0, // Calculate from related quotes/invoices
    pendingValue: 0 // Calculate from related quotes/invoices
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quote': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      'Delete Customer',
      `Are you sure you want to delete ${customer?.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCustomer(customerId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditCustomer', { customerId });
  };

  const filterOptions = [
    { key: null, label: 'All', count: customerJobs.length },
    { key: 'active', label: 'Active', count: stats.activeJobs },
    { key: 'completed', label: 'Completed', count: stats.completedJobs },
    { key: 'on-hold', label: 'On Hold', count: customerJobs.filter(j => j.status === 'on-hold').length },
  ];

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

  const JobCard = ({ job }: { job: any }) => (
    <Pressable
      onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
            {job.title}
          </Text>
          {job.description && (
            <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
              {job.description}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {format(new Date(job.updatedAt), 'MMM d, yyyy')}
            </Text>
            {job.dueDate && (
              <>
                <Text className="text-gray-300 mx-2">•</Text>
                <Ionicons name="flag-outline" size={14} color="#F59E0B" />
                <Text className="text-gray-500 text-xs ml-1">
                  Due {format(new Date(job.dueDate), 'MMM d')}
                </Text>
              </>
            )}
          </View>
        </View>
        
        <View className="items-end">
          <Text className="font-bold text-gray-900 text-lg">
            {formatCurrency(job.total)}
          </Text>
          <View className={`px-3 py-1 rounded-full mt-2 border ${getStatusColor(job.status)}`}>
            <Text className="text-xs font-medium">
              {getStatusLabel(job.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center">
          <Ionicons name="list-outline" size={16} color="#6B7280" />
          <Text className="text-gray-600 text-sm ml-1">
            {job.items?.length || 0} items
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  if (!customer) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="person-circle-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Customer not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The customer you're looking for doesn't exist or has been deleted.
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
        {/* Customer Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mr-4">
              <Text className="text-blue-600 font-bold text-3xl">
                {customer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {customer.name}
              </Text>
              {customer.company && (
                <Text className="text-gray-600 text-lg mb-2">
                  {customer.company}
                </Text>
              )}
              
              <View className="flex-row">
                {customer.phone && (
                  <Pressable
                    onPress={handleCall}
                    className="bg-blue-600 rounded-lg px-4 py-2 mr-3 flex-row items-center"
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text className="text-white font-medium ml-1">Call</Text>
                  </Pressable>
                )}
                
                {customer.email && (
                  <Pressable
                    onPress={handleEmail}
                    className="bg-gray-100 rounded-lg px-4 py-2 flex-row items-center"
                  >
                    <Ionicons name="mail" size={16} color="#6B7280" />
                    <Text className="text-gray-700 font-medium ml-1">Email</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Contact Information</Text>
          <View>
            {customer.email && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <Text className="text-gray-700 ml-3 flex-1">{customer.email}</Text>
              </View>
            )}
            {customer.phone && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="call-outline" size={18} color="#6B7280" />
                <Text className="text-gray-700 ml-3 flex-1">{customer.phone}</Text>
              </View>
            )}
            {customer.address && (
              <View className="flex-row items-start">
                <Ionicons name="location-outline" size={18} color="#6B7280" />
                <Text className="text-gray-700 ml-3 flex-1 leading-6">{customer.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View className="px-4 py-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Statistics</Text>
          
          <View className="flex-row mb-4">
            <StatCard
              title="Total Jobs"
              value={stats.totalJobs}
              icon="briefcase"
              color="bg-blue-500"
            />
            <StatCard
              title="Completed"
              value={stats.completedJobs}
              icon="checkmark-circle"
              color="bg-green-500"
            />
          </View>
          
          <View className="flex-row mb-4">
            <StatCard
              title="Active Jobs"
              value={stats.activeJobs}
              icon="play-circle"
              color="bg-orange-500"
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon="trending-up"
              color="bg-purple-500"
              subtitle="From completed jobs"
            />
          </View>
          
          {stats.pendingValue > 0 && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <View className="flex-row items-center">
                <Ionicons name="time" size={20} color="#F59E0B" />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-yellow-800">Pending Value</Text>
                  <Text className="text-yellow-700 text-lg font-bold">
                    {formatCurrency(stats.pendingValue)}
                  </Text>
                  <Text className="text-yellow-600 text-sm">
                    From active jobs and quotes
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Job History */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Job History</Text>
            <Pressable
              onPress={() => navigation.navigate('CreateJob', { customerId })}
              className="bg-blue-600 rounded-lg px-4 py-2"
            >
              <Text className="text-white font-medium text-sm">New Job</Text>
            </Pressable>
          </View>

          {/* Job Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {filterOptions.map((option) => (
              <Pressable
                key={option.key || 'all'}
                onPress={() => setSelectedFilter(option.key)}
                className={`px-4 py-2 rounded-full mr-3 border ${
                  selectedFilter === option.key
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedFilter === option.key
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {option.label} ({option.count})
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Jobs List */}
          {filteredJobs.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center border border-gray-100">
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-3">
                {selectedFilter ? 'No jobs found' : 'No jobs yet'}
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                {selectedFilter 
                  ? 'Try selecting a different filter to see jobs'
                  : 'Create the first job for this customer'
                }
              </Text>
              {!selectedFilter && (
                <Pressable
                  onPress={() => navigation.navigate('CreateJob', { customerId })}
                  className="bg-blue-600 rounded-lg px-6 py-3 mt-4"
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
            </>
          )}
        </View>
      </ScrollView>

      {/* Quick Actions */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex-row"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={() => navigation.navigate('CreateJob', { customerId })}
          className="flex-1 bg-blue-600 rounded-xl py-4 mr-3"
        >
          <Text className="text-white font-semibold text-center text-base">
            New Job
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => navigation.navigate('CreateQuote', { customerId })}
          className="flex-1 bg-green-600 rounded-xl py-4 mr-3"
        >
          <Text className="text-white font-semibold text-center text-base">
            New Quote
          </Text>
        </Pressable>
        
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

export default CustomerDetailScreen;