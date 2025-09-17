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
  name: 'JobDetail';
  params: { jobId: string };
};

const JobDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { jobId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    getJobById, 
    getCustomerById, 
    getPartById, 
    getLaborItemById, 
    updateJob,
    jobs
  } = useJobStore();

  const [job, setJob] = useState(() => getJobById(jobId));
  const customer = job ? getCustomerById(job.customerId) : null;

  // Refresh job data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedJob = getJobById(jobId);
      setJob(updatedJob);
    }, [jobId, jobs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedJob = getJobById(jobId);
    setJob(updatedJob);
    setRefreshing(false);
  }, [jobId]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'quote': return 'document-text';
      case 'approved': return 'checkmark-circle';
      case 'in-progress': return 'play-circle';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'quote': return 'Quote';
      case 'approved': return 'Approved';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'quote': return 'approved';
      case 'approved': return 'in-progress';
      case 'in-progress': return 'completed';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return null;
    
    switch (nextStatus) {
      case 'approved': return 'Approve Quote';
      case 'in-progress': return 'Start Work';
      case 'completed': return 'Mark Complete';
      default: return null;
    }
  };

  const handleStatusUpdate = () => {
    if (!job) return;
    
    const nextStatus = getNextStatus(job.status);
    if (!nextStatus) return;

    const statusLabel = getNextStatusLabel(job.status);
    
    Alert.alert(
      'Update Status',
      `Are you sure you want to ${statusLabel?.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: statusLabel || 'Update',
          onPress: () => {
            const updates: any = { status: nextStatus };
            
            if (nextStatus === 'completed') {
              updates.completedAt = new Date().toISOString();
            }
            
            updateJob(job.id, updates);
            const updatedJob = getJobById(jobId);
            setJob(updatedJob);
          }
        }
      ]
    );
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <View className={`px-4 py-2 rounded-full border flex-row items-center ${getStatusColor(status)}`}>
      <Ionicons 
        name={getStatusIcon(status) as keyof typeof Ionicons.glyphMap} 
        size={16} 
        color={status === 'quote' ? '#92400E' : status === 'approved' ? '#1E40AF' : status === 'in-progress' ? '#C2410C' : status === 'completed' ? '#166534' : '#7F1D1D'} 
      />
      <Text className={`ml-2 font-semibold text-sm ${status === 'quote' ? 'text-yellow-800' : status === 'approved' ? 'text-blue-800' : status === 'in-progress' ? 'text-orange-800' : status === 'completed' ? 'text-green-800' : 'text-red-800'}`}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );

  const JobItemCard = ({ item }: { item: any }) => {
    const itemData = item.type === 'part' ? getPartById(item.itemId) : getLaborItemById(item.itemId);
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${
                item.type === 'part' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <Ionicons 
                  name={item.type === 'part' ? 'construct' : 'time'} 
                  size={14} 
                  color={item.type === 'part' ? '#3B82F6' : '#10B981'} 
                />
              </View>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {item.type === 'part' ? 'Part' : 'Labor'}
              </Text>
            </View>
            
            <Text className="font-semibold text-gray-900 text-base mb-1">
              {item.description}
            </Text>
            
            <View className="flex-row items-center">
              <Text className="text-gray-600 text-sm">
                {item.quantity} × {formatCurrency(item.unitPrice)}
                {item.type === 'labor' ? '/hour' : ''}
              </Text>
            </View>
            
            {itemData && (
              <View className="mt-2">
                {item.type === 'part' && (itemData as any).sku && (
                  <Text className="text-xs text-gray-500">SKU: {(itemData as any).sku}</Text>
                )}
                {item.type === 'part' && (itemData as any).category && (
                  <Text className="text-xs text-gray-500">Category: {(itemData as any).category}</Text>
                )}
                {item.type === 'labor' && (itemData as any).category && (
                  <Text className="text-xs text-gray-500">Category: {(itemData as any).category}</Text>
                )}
              </View>
            )}
          </View>
          
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(item.total)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">Job not found</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          The job you're looking for doesn't exist or has been deleted.
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
        {/* Job Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-bold text-gray-900 mb-2" numberOfLines={2}>
                {job.title}
              </Text>
              {job.description && (
                <Text className="text-gray-600 text-base leading-6">
                  {job.description}
                </Text>
              )}
            </View>
            <StatusBadge status={job.status} />
          </View>

          {/* Customer Info */}
          {customer && (
            <Pressable
              onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
              className="flex-row items-center p-3 bg-gray-50 rounded-xl"
            >
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Text className="text-blue-600 font-semibold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">{customer.name}</Text>
                {customer.company && (
                  <Text className="text-gray-600 text-sm">{customer.company}</Text>
                )}
                {customer.phone && (
                  <Text className="text-gray-500 text-sm">{customer.phone}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Date Information */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Timeline</Text>
          <View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">
                Created: {format(new Date(job.createdAt), 'MMM d, yyyy')}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="refresh-outline" size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">
                Updated: {format(new Date(job.updatedAt), 'MMM d, yyyy')}
              </Text>
            </View>
            {job.dueDate && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="flag-outline" size={16} color="#F59E0B" />
                <Text className="text-gray-600 text-sm ml-2">
                  Due: {format(new Date(job.dueDate), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
            {job.completedAt && (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                <Text className="text-gray-600 text-sm ml-2">
                  Completed: {format(new Date(job.completedAt), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Job Items */}
        <View className="px-4 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Job Items</Text>
            <Text className="text-sm text-gray-500">{job.items.length} items</Text>
          </View>

          {job.items.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center border border-gray-100">
              <Ionicons name="list-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-3">No items added</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                This job doesn't have any parts or labor items yet.
              </Text>
            </View>
          ) : (
            <>
              {job.items.map((item) => (
                <JobItemCard key={item.id} item={item} />
              ))}
            </>
          )}
        </View>

        {/* Price Breakdown */}
        <View className="px-4 pb-6">
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</Text>
            
            <View>
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-600">Subtotal:</Text>
                <Text className="text-gray-900 font-medium">{formatCurrency(job.subtotal)}</Text>
              </View>
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-600">Tax ({job.taxRate}%):</Text>
                <Text className="text-gray-900 font-medium">{formatCurrency(job.tax)}</Text>
              </View>
              <View className="h-px bg-gray-200 mb-3" />
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-gray-900">Total:</Text>
                <Text className="text-lg font-bold text-blue-600">{formatCurrency(job.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {job.notes && (
          <View className="px-4 pb-6">
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Notes</Text>
              <Text className="text-gray-600 leading-6">{job.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Buttons */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex-row"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {getNextStatus(job.status) && (
          <Pressable
            onPress={handleStatusUpdate}
            className="flex-1 bg-blue-600 rounded-xl py-4 mr-3"
          >
            <Text className="text-white font-semibold text-center text-base">
              {getNextStatusLabel(job.status)}
            </Text>
          </Pressable>
        )}
        
        <Pressable
          onPress={() => {
            // TODO: Navigate to edit job screen
            Alert.alert('Coming Soon', 'Edit job functionality will be added soon.');
          }}
          className="px-6 py-4 bg-gray-100 rounded-xl"
        >
          <Ionicons name="create-outline" size={24} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
};

export default JobDetailScreen;