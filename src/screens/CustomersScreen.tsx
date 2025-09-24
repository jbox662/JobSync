import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { importExportService } from '../services/importExport';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CustomersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { customers, jobs } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'export'>('list');
  const [loading, setLoading] = useState(false);

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = !searchQuery || 
        (customer.company || customer.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));

  const getCustomerJobCount = (customerId: string) => {
    return jobs.filter(job => job.customerId === customerId).length;
  };

  const getCustomerRevenue = (customerId: string) => {
    // Calculate revenue from paid invoices for this customer instead of jobs
    const { invoices } = useJobStore();
    return invoices
      .filter(invoice => invoice.customerId === customerId && invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.paidAmount || invoice.total), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleExportCustomers = async () => {
    if (customers.length === 0) {
      Alert.alert('No Data', 'No customers to export');
      return;
    }

    setLoading(true);
    try {
      const result = await importExportService.exportToCSV('customers');
      if (result.success) {
        Alert.alert('Export Successful', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Export Error', 'An unexpected error occurred during export');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCustomers = async () => {
    Alert.alert(
      'Import Customers',
      'Import customers from a CSV file. Make sure the CSV has the correct column headers (Name, Email, Phone, Company, Address).',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: async () => {
            setLoading(true);
            try {
              const result = await importExportService.importFromCSV('customers');
              if (result.success) {
                Alert.alert('Import Successful', result.message);
              } else {
                Alert.alert('Import Failed', result.message);
              }
            } catch (error) {
              Alert.alert('Import Error', 'An unexpected error occurred during import');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
              {(customer.company || customer.name).charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
              {customer.company || customer.name}
            </Text>
            
            {customer.company && customer.name && (
              <Text className="text-gray-600 text-sm mt-1" numberOfLines={1}>
                {customer.name}
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

  const renderTabBar = () => (
    <View className="bg-white border-b border-gray-200">
      <View className="flex-row">
        {[
          { key: 'list', label: 'Customers', icon: 'people-outline' },
          { key: 'import', label: 'Import', icon: 'cloud-upload-outline' },
          { key: 'export', label: 'Export', icon: 'download-outline' }
        ].map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === tab.key ? 'border-blue-600' : 'border-transparent'
            }`}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.key ? '#2563EB' : '#6B7280'} 
            />
            <Text className={`text-sm font-medium mt-1 ${
              activeTab === tab.key ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderCustomersList = () => (
    <>
      {/* Search and Add Button */}
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
    </>
  );

  const renderImportTab = () => (
    <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="cloud-upload-outline" size={32} color="#2563EB" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">Import Customers</Text>
          <Text className="text-gray-600 text-center">
            Import customer data from a CSV file
          </Text>
        </View>

        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="font-semibold text-gray-900 mb-2">CSV Format Requirements:</Text>
          <Text className="text-gray-600 text-sm leading-5">
            • Name (required){'\n'}
            • Email{'\n'}
            • Phone{'\n'}
            • Company{'\n'}
            • Address
          </Text>
        </View>

        <Pressable
          onPress={handleImportCustomers}
          disabled={loading}
          className={`rounded-xl py-4 items-center ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Select CSV File</Text>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderExportTab = () => (
    <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="download-outline" size={32} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">Export Customers</Text>
          <Text className="text-gray-600 text-center">
            Export your customer data to a CSV file
          </Text>
        </View>

        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-semibold text-gray-900">Ready to Export:</Text>
            <Text className="text-blue-600 font-bold text-lg">{customers.length}</Text>
          </View>
          <Text className="text-gray-600 text-sm">
            customers will be exported with all their information
          </Text>
        </View>

        <Pressable
          onPress={handleExportCustomers}
          disabled={loading || customers.length === 0}
          className={`rounded-xl py-4 items-center ${
            loading || customers.length === 0 ? 'bg-gray-400' : 'bg-green-600'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="download-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Export to CSV</Text>
            </View>
          )}
        </Pressable>

        {customers.length === 0 && (
          <Text className="text-gray-500 text-sm text-center mt-3">
            No customers to export. Add some customers first.
          </Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {renderTabBar()}
      {activeTab === 'list' && renderCustomersList()}
      {activeTab === 'import' && renderImportTab()}
      {activeTab === 'export' && renderExportTab()}
    </View>
  );
};

export default CustomersScreen;