import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { 
    jobs, 
    customers, 
    parts, 
    laborItems, 
    generateSampleData,
    invoices,
    quotes
  } = useJobStore();
  
  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => job.status === 'active').length;
  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  
  // Invoice statistics
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const sentInvoices = invoices.filter(i => i.status === 'sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  
  // Quote statistics  
  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter(q => ['draft', 'sent'].includes(q.status)).length;
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
  
  // Calculate total revenue from paid invoices
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
    
  // Calculate outstanding amount (sent + overdue invoices)
  const outstandingAmount = invoices
    .filter(invoice => ['sent', 'overdue'].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const recentJobs = jobs
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const recentInvoices = invoices
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    subtitle?: string;
  }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-lg border border-gray-200">
      <View className="items-center">
        <View className={`w-12 h-12 rounded-full items-center justify-center ${color} mb-3`}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <Text className="text-gray-600 text-xs font-semibold text-center mb-1" numberOfLines={1}>{title}</Text>
        <Text 
          className="text-2xl font-bold text-gray-900 text-center mb-1" 
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        {subtitle && (
          <Text className="text-gray-500 text-xs text-center font-medium" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
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

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100';
      case 'sent': return 'bg-blue-100';
      case 'paid': return 'bg-green-100';
      case 'overdue': return 'bg-red-100';
      case 'cancelled': return 'bg-gray-100';
      default: return 'bg-gray-100';
    }
  };

  const QuickActionButton = ({ title, icon, color, onPress }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={`${color} rounded-2xl p-4 mx-1 mb-3 flex-1 min-w-[45%] shadow-sm`}
    >
      <View className="items-center">
        <View className="w-12 h-12 bg-white/30 rounded-full items-center justify-center mb-2">
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <Text className="text-white font-bold text-sm text-center">{title}</Text>
      </View>
    </Pressable>
  );

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-gray-600 mt-1">Welcome back to JobSync</Text>
        </View>

        {/* Sample Data Generation */}
        {totalJobs === 0 && (
          <View className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-white text-lg font-bold mb-1">Get Started</Text>
                <Text className="text-blue-100 mb-4">No data yet? Generate some sample data to explore the app!</Text>
                <Pressable
                  onPress={generateSampleData}
                  className="bg-white rounded-xl px-6 py-3 self-start"
                >
                  <Text className="text-blue-600 font-semibold">Generate Sample Data</Text>
                </Pressable>
              </View>
              <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center ml-4">
                <Ionicons name="rocket-outline" size={32} color="white" />
              </View>
            </View>
          </View>
        )}

        {/* Revenue Overview */}
        <View className="bg-gray-900 rounded-2xl p-6 mb-6 shadow-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-gray-300 text-sm font-medium mb-1">Total Revenue</Text>
              <Text 
                className="text-white text-2xl font-bold mb-2" 
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {formatCurrency(totalRevenue)}
              </Text>
              <Text className="text-gray-300 text-sm">
                {outstandingAmount > 0 ? `${formatCurrency(outstandingAmount)} outstanding` : 'All invoices paid'}
              </Text>
            </View>
            <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center">
              <Ionicons name="trending-up" size={32} color="white" />
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Overview</Text>
          <View className="flex-row flex-wrap -mx-1">
            <View className="w-1/2 px-1">
              <StatCard
                title="Active Jobs"
                value={activeJobs}
                icon="play-circle"
                color="bg-orange-500"
                subtitle={`${completedJobs} completed`}
              />
            </View>
            <View className="w-1/2 px-1">
              <StatCard
                title="Total Invoices"
                value={totalInvoices}
                icon="receipt"
                color="bg-blue-500"
                subtitle={`${paidInvoices} paid`}
              />
            </View>
            <View className="w-1/2 px-1">
              <StatCard
                title="Pending Quotes"
                value={pendingQuotes}
                icon="document-text"
                color="bg-yellow-500"
                subtitle={`${approvedQuotes} approved`}
              />
            </View>
            <View className="w-1/2 px-1">
              <StatCard
                title="Customers"
                value={customers.length}
                icon="people"
                color="bg-purple-500"
                subtitle={`${parts.length} parts`}
              />
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Recent Activity</Text>
          
          {/* Recent Jobs */}
          {recentJobs.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-gray-900">Recent Jobs</Text>
                <Pressable onPress={() => navigation.navigate('Jobs' as never)}>
                  <Text className="text-blue-600 font-medium">View All</Text>
                </Pressable>
              </View>
              
              {recentJobs.map((job, index) => {
                const customer = customers.find(c => c.id === job.customerId);
                return (
                  <View key={job.id}>
                    <View className="flex-row items-center py-3">
                      <View className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(job.status).split(' ')[0]}`} />
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900" numberOfLines={1}>
                          {job.title}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {customer?.company || customer?.name} • {format(new Date(job.updatedAt), 'MMM d')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs font-medium text-gray-500">
                          {job.estimatedHours ? `${job.estimatedHours}h` : 'No est.'}
                        </Text>
                      </View>
                    </View>
                    {index < recentJobs.length - 1 && <View className="h-px bg-gray-100" />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Recent Invoices */}
          {recentInvoices.length > 0 && (
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-gray-900">Recent Invoices</Text>
                <Pressable onPress={() => navigation.navigate('Invoices' as never)}>
                  <Text className="text-blue-600 font-medium">View All</Text>
                </Pressable>
              </View>
              
              {recentInvoices.map((invoice, index) => {
                const customer = customers.find(c => c.id === invoice.customerId);
                return (
                  <View key={invoice.id}>
                    <View className="flex-row items-center py-3">
                      <View className={`w-3 h-3 rounded-full mr-3 ${getInvoiceStatusColor(invoice.status).split(' ')[0]}`} />
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900" numberOfLines={1}>
                          {invoice.invoiceNumber}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {customer?.company || customer?.name} • {format(new Date(invoice.createdAt), 'MMM d')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-semibold text-gray-900">
                          {formatCurrency(invoice.total)}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {invoice.status}
                        </Text>
                      </View>
                    </View>
                    {index < recentInvoices.length - 1 && <View className="h-px bg-gray-100" />}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap -mx-1">
            <QuickActionButton
              title="New Job"
              icon="add-circle"
              color="bg-blue-500"
              onPress={() => navigation.navigate('CreateJob' as never)}
            />
            <QuickActionButton
              title="New Invoice"
              icon="receipt"
              color="bg-green-500"
              onPress={() => navigation.navigate('CreateInvoice' as never)}
            />
            <QuickActionButton
              title="New Quote"
              icon="document-text"
              color="bg-yellow-500"
              onPress={() => navigation.navigate('CreateQuote' as never)}
            />
            <QuickActionButton
              title="New Customer"
              icon="person-add"
              color="bg-purple-500"
              onPress={() => navigation.navigate('CreateCustomer' as never)}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;