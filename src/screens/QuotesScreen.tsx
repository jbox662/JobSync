import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';
import { format } from 'date-fns';
import EmailButton from '../components/EmailButton';
import { importExportService } from '../services/importExport';
import { smartInvoiceParser } from '../services/smartInvoiceParser';

// Check if PDF export is available
let isPDFAvailable = false;
try {
  require('expo-print');
  isPDFAvailable = true;
} catch (error) {
  isPDFAvailable = false;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QuotesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { quotes, getCustomerById, getJobById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'export'>('list');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const statusOptions = [
    { key: null, label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'expired', label: 'Expired' },
  ];

  // Export quotes to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await importExportService.exportToCSV('quotes');
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export quotes to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Export quotes to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const result = await importExportService.exportQuotesToPDF();
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export quotes to PDF');
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

  // Smart AI Import for quotes
  const handleSmartImport = async () => {
    setIsImporting(true);
    try {
      const parseResult = await smartInvoiceParser.parseQuoteFile();
      
      if (!parseResult.success) {
        Alert.alert('Import Failed', parseResult.message);
        return;
      }
      
      if (parseResult.quote) {
        try {
          const importResult = await smartInvoiceParser.importParsedQuote(parseResult.quote);
          
          if (importResult.success) {
            Alert.alert('Success', importResult.message);
          } else {
            Alert.alert('Import Failed', importResult.message);
          }
        } catch (importError) {
          console.error('Import error:', importError);
          Alert.alert('Import Failed', 'Failed to save the parsed quote to your account.');
        }
      }
    } catch (error) {
      console.error('Smart import error:', error);
      Alert.alert('Import Failed', 'An error occurred during smart import.');
    } finally {
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
      
      // Handle status filtering
      const matchesStatus = !selectedStatus || quote.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
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
        <>
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

          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {filteredQuotes.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                {searchQuery || selectedStatus ? 'No quotes found' : 'No quotes yet'}
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                {searchQuery || selectedStatus
                  ? 'Try adjusting your search or filters to find what you\'re looking for'
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
        </>
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
                Choose your export format
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

            <View className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
              <View className="flex-row items-start">
                <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                <Text className="text-blue-700 text-xs ml-2 flex-1">
                  {isPDFAvailable 
                    ? "PDF export is available! Choose your preferred format below."
                    : "PDF export requires a native build. Please use CSV export or rebuild with EAS Build."}
                </Text>
              </View>
            </View>

            <Text className="text-gray-700 font-semibold mb-3">Select Format:</Text>

            <Pressable
              onPress={handleExportCSV}
              disabled={isExporting || quotes.length === 0}
              className={`${isExporting || quotes.length === 0 ? 'bg-gray-300' : 'bg-blue-600'} rounded-lg py-4 items-center mb-3`}
            >
              {isExporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Export as CSV
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={handleExportPDF}
              disabled={isExporting || quotes.length === 0 || !isPDFAvailable}
              className={`${isExporting || quotes.length === 0 || !isPDFAvailable ? 'bg-gray-300' : 'bg-red-600'} rounded-lg py-4 items-center`}
            >
              {isExporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="document-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Export as PDF {!isPDFAvailable && '(Unavailable)'}
                  </Text>
                </View>
              )}
            </Pressable>

            <Text className="text-gray-500 text-xs text-center mt-4">
              {quotes.length} quote{quotes.length !== 1 ? 's' : ''} will be exported
            </Text>

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
        <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
          {/* Smart Import (AI) Section */}
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <View className="items-center mb-4">
              <View className="bg-purple-100 rounded-full p-4 mb-3">
                <Ionicons name="sparkles-outline" size={32} color="#8B5CF6" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Smart Import (AI)</Text>
              <Text className="text-gray-500 text-center mt-2">
                Supports Square PDF quotes, CSV exports, and text files
              </Text>
            </View>

            <View className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <View className="flex-row items-start">
                <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                <View className="flex-1 ml-2">
                  <Text className="text-blue-800 font-medium mb-1">AI-Powered Import:</Text>
                  <Text className="text-blue-700 text-sm">• Automatically detects quote format</Text>
                  <Text className="text-blue-700 text-sm">• Extracts customer and item details</Text>
                  <Text className="text-blue-700 text-sm">• Handles Square, QuickBooks, and custom formats</Text>
                  <Text className="text-blue-700 text-sm">• Works with PDF, CSV, and text files</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleSmartImport}
              disabled={isImporting}
              className={`${isImporting ? 'bg-gray-300' : 'bg-purple-600'} rounded-lg py-4 items-center mb-4`}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="sparkles" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Smart Import (CSV/Text/PDF)
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-700 font-medium text-sm mb-2">💡 Tips for best results:</Text>
              <Text className="text-gray-600 text-xs">• For PDFs: Use text-based PDFs (not scanned images)</Text>
              <Text className="text-gray-600 text-xs">• For CSV: Export directly from your quote system</Text>
              <Text className="text-gray-600 text-xs">• For text: Copy/paste quote details into a .txt file</Text>
            </View>
          </View>

          {/* Traditional CSV Import Section */}
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-4 mb-3">
                <Ionicons name="document-text-outline" size={32} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-gray-900">CSV Import</Text>
              <Text className="text-gray-500 text-center mt-2">
                Import from a structured CSV file
              </Text>
            </View>

            <View className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
              <View className="flex-row items-start">
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <View className="flex-1 ml-2">
                  <Text className="text-yellow-800 font-medium mb-1">CSV Requirements:</Text>
                  <Text className="text-yellow-700 text-sm">• Export a sample CSV first to see the format</Text>
                  <Text className="text-yellow-700 text-sm">• Required: Title, Customer ID</Text>
                  <Text className="text-yellow-700 text-sm">• Customer IDs must already exist</Text>
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
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Select CSV File
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default QuotesScreen;