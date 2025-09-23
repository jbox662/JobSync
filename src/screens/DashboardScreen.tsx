import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { format } from 'date-fns';

const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { jobs, customers, parts, laborItems, generateSampleData } = useJobStore();

  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => job.status === 'active').length;
  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const pendingQuotes = useJobStore((s) => s.quotes.filter(q => ['draft', 'sent'].includes(q.status)).length);
  const approvedInvoices = useJobStore((s) => s.invoices.filter(i => i.status === 'paid').length);
  
  // Calculate total revenue from paid invoices instead of jobs
  const { invoices } = useJobStore();
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const recentJobs = jobs
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }) => (
    <View className="bg-white rounded-xl p-4 flex-1 mx-1 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-gray-600 text-sm font-medium">{title}</Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1">{value}</Text>
        </View>
        <View className={`w-12 h-12 rounded-full items-center justify-center ${color}`}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
      </View>
    </View>
  );

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

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-gray-600 mt-1">Welcome back to Job Manager</Text>
        </View>

        {/* Sample Data Generation */}
        {totalJobs === 0 && (
          <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
            <Text className="text-blue-900 font-semibold mb-2">Get Started</Text>
            <Text className="text-blue-800 mb-3">No data yet? Generate some sample data to explore the app!</Text>
            <Pressable
              onPress={generateSampleData}
              className="bg-blue-600 rounded-lg px-4 py-2"
            >
              <Text className="text-white font-semibold text-center">Generate Sample Data</Text>
            </Pressable>
          </View>
        )}

        {/* Stats Cards */}
        <View className="flex-row mb-6">
          <StatCard
            title="Total Jobs"
            value={totalJobs}
            icon="briefcase"
            color="bg-blue-500"
          />
          <StatCard
            title="Active Jobs"
            value={activeJobs}
            icon="play-circle"
            color="bg-orange-500"
          />
        </View>

        <View className="flex-row mb-6">
          <StatCard
            title="Quotes"
            value={pendingQuotes}
            icon="document-text"
            color="bg-yellow-500"
          />
          <StatCard
            title="Invoices"
            value={approvedInvoices}
            icon="receipt"
            color="bg-blue-500"
          />
        </View>

        <View className="flex-row mb-6">
          <StatCard
            title="Completed"
            value={completedJobs}
            icon="checkmark-circle"
            color="bg-green-500"
          />
          <View className="flex-1 mx-1" />
        </View>

        {/* Revenue Card */}
        <View className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-blue-100 text-sm font-medium">Total Revenue</Text>
              <Text className="text-white text-3xl font-bold mt-1">
                {formatCurrency(totalRevenue)}
              </Text>
            </View>
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="trending-up" size={32} color="white" />
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</Text>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-blue-600">{customers.length}</Text>
              <Text className="text-gray-600 text-sm">Customers</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">{parts.length}</Text>
              <Text className="text-gray-600 text-sm">Parts</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-orange-600">{laborItems.length}</Text>
              <Text className="text-gray-600 text-sm">Labor Items</Text>
            </View>
          </View>
        </View>


        {/* Recent Jobs */}
        {recentJobs.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Recent Jobs</Text>
              <Pressable>
                <Text className="text-blue-600 font-medium">View All</Text>
              </Pressable>
            </View>
            
            {recentJobs.map((job, index) => {
              const customer = customers.find(c => c.id === job.customerId);
              return (
                <View key={job.id}>
                  <View className="flex-row items-center justify-between py-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900" numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {customer?.name} • {format(new Date(job.updatedAt), 'MMM d')}
                      </Text>
                    </View>
                    <View className="items-end ml-3">
                      <Text className="font-medium text-gray-600 text-sm">
                        {job.estimatedHours ? `${job.estimatedHours}h est.` : 'No estimate'}
                      </Text>
                      <View className={`px-2 py-1 rounded-full mt-1 ${getStatusColor(job.status)}`}>
                        <Text className="text-xs font-medium">
                          {job.status.replace('-', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < recentJobs.length - 1 && (
                    <View className="h-px bg-gray-100" />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;