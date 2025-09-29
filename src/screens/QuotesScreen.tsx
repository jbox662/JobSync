import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';
import EmailButton from '../components/EmailButton';
import { importExportService } from '../services/importExport';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QuotesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { quotes, getCustomerById, getJobById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'export'>('list');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Export quotes to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await importExportService.exportToCSV('quotes');
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export quotes');
    } finally {
      setIsExporting(false);
    }
  };

  // Import quotes from CSV
  const handleImport = async () => {
    setIsImporting(true);
    try {
      Alert.alert(
        'Import Quotes',
        'Select a CSV file to import quotes. Existing quotes with matching IDs will be skipped.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Select File',
            onPress: async () => {
              const result = await importExportService.importFromCSV('quotes');
              if (result.success) {
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Import Failed', result.message);
              }
              setIsImporting(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import quotes');
      setIsImporting(false);
    }
  };

  // Filter quotes
  const filteredQuotes = quotes
    .filter(quote => {
      const customer = getCustomerById(quote.customerId);
      const job = getJobById(quote.jobId);
      const matchesSearch = !searchQuery || 
        quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const QuoteCard = ({ quote }: { quote: any }) => {
    const customer = getCustomerById(quote.customerId);
    const job = getJobById(quote.jobId);
    
    return (
      <Pressable
        onPress={() => {
          navigation.navigate('QuoteDetail', { quoteId: quote.id });
        }}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="font-bold text-blue-600 text-base mr-2">
                {quote.quoteNumber}
              </Text>
              <View className={`px-2 py-1 rounded-full border ${getStatusColor(quote.status)}`}>
                <Text className="text-xs font-medium">
                  {getStatusLabel(quote.status)}
                </Text>
              </View>
            </View>
            
            <Text className="font-semibold text-gray-900 text-lg mb-1" numberOfLines={1}>
              {quote.title}
            </Text>
            
            <View className="flex-row items-center mb-1">
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                {customer?.name || 'Unknown Customer'}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                {job?.title || 'Unknown Job'}
              </Text>
            </View>
          </View>
          
          <View className="items-end ml-3">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(quote.total)}
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              {format(new Date(quote.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        
        {quote.description && (
          <Text className="text-gray-600 text-sm mt-3" numberOfLines={2}>
            {quote.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">
              {quote.items.length} items
            </Text>
          </View>
          
          <View className="flex-row items-center">
            {quote.validUntil && (
              <>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1 mr-3">
                  Valid until {format(new Date(quote.validUntil), 'MMM d')}
                </Text>
              </>
            )}
            
            {/* Email Button */}
            <EmailButton
              type="quote"
              document={quote}
              variant="icon"
              size="small"
              onEmailSent={() => {
                // Refresh the quote list or show success feedback
                console.log('Quote emailed successfully');
              }}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Tabs */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row px-4 pt-3">
          <Pressable
            onPress={() => setActiveTab('list')}
            className={`flex-1 pb-3 border-b-2 ${activeTab === 'list' ? 'border-blue-600' : 'border-transparent'}`}
          >
            <Text className={`text-center font-semibold ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-500'}`}>
              Quotes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('export')}
            className={`flex-1 pb-3 border-b-2 ${activeTab === 'export' ? 'border-blue-600' : 'border-transparent'}`}
          >
            <Text className={`text-center font-semibold ${activeTab === 'export' ? 'text-blue-600' : 'text-gray-500'}`}>
              Export
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('import')}
            className={`flex-1 pb-3 border-b-2 ${activeTab === 'import' ? 'border-blue-600' : 'border-transparent'}`}
          >
            <Text className={`text-center font-semibold ${activeTab === 'import' ? 'text-blue-600' : 'text-gray-500'}`}>
              Import
            </Text>
          </Pressable>
        </View>

        {/* Search and Add Button - Only show in list tab */}
        {activeTab === 'list' && (
          <View className="px-4 py-3">
            <View className="flex-row items-center">
              <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2 mr-3">
                <View className="flex-row items-center">
                  <Ionicons name="search" size={20} color="#6B7280" />
                  <TextInput
                    placeholder="Search quotes..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-2 text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <Pressable
                onPress={() => navigation.navigate('CreateQuote', {})}
                className="bg-blue-600 rounded-lg px-4 py-2"
              >
                <Ionicons name="add" size={24} color="white" />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Content based on active tab */}
      {activeTab === 'list' && (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {filteredQuotes.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                {searchQuery ? 'No quotes found' : 'No quotes yet'}
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'Create your first quote to provide cost estimates'
                }
              </Text>
              {!searchQuery && (
                <Pressable
                  onPress={() => navigation.navigate('CreateQuote', {})}
                  className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
                >
                  <Text className="text-white font-semibold">Create Quote</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {filteredQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
              <View className="h-4" />
            </>
          )}
        </ScrollView>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <View className="flex-1 px-4 pt-6">
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <View className="items-center mb-4">
              <View className="bg-blue-100 rounded-full p-4 mb-3">
                <Ionicons name="download-outline" size={32} color="#2563EB" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Export Quotes</Text>
              <Text className="text-gray-500 text-center mt-2">
                Export all your quotes to a CSV file
              </Text>
            </View>

            <View className="bg-gray-50 rounded-lg p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                <Text className="text-gray-700 font-medium ml-2">Export includes:</Text>
              </View>
              <Text className="text-gray-600 text-sm ml-7">• All quote details</Text>
              <Text className="text-gray-600 text-sm ml-7">• Customer information</Text>
              <Text className="text-gray-600 text-sm ml-7">• Items and pricing</Text>
              <Text className="text-gray-600 text-sm ml-7">• Status and dates</Text>
            </View>

            <Pressable
              onPress={handleExport}
              disabled={isExporting || quotes.length === 0}
              className={`${isExporting || quotes.length === 0 ? 'bg-gray-300' : 'bg-blue-600'} rounded-lg py-4 items-center`}
            >
              {isExporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Export {quotes.length} Quotes
                </Text>
              )}
            </Pressable>

            {quotes.length === 0 && (
              <Text className="text-gray-400 text-sm text-center mt-3">
                No quotes to export
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <View className="flex-1 px-4 pt-6">
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-4 mb-3">
                <Ionicons name="cloud-upload-outline" size={32} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Import Quotes</Text>
              <Text className="text-gray-500 text-center mt-2">
                Import quotes from a CSV file
              </Text>
            </View>

            <View className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
              <View className="flex-row items-start">
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <View className="flex-1 ml-2">
                  <Text className="text-yellow-800 font-medium mb-1">Important Notes:</Text>
                  <Text className="text-yellow-700 text-sm">• CSV must match export format</Text>
                  <Text className="text-yellow-700 text-sm">• Customer IDs must exist</Text>
                  <Text className="text-yellow-700 text-sm">• Duplicate IDs will be skipped</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleImport}
              disabled={isImporting}
              className={`${isImporting ? 'bg-gray-300' : 'bg-green-600'} rounded-lg py-4 items-center`}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Select CSV File
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

export default QuotesScreen;