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

const InvoicesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { invoices, getCustomerById, getJobById } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'export'>('list');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Export invoices to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await importExportService.exportToCSV('invoices');
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export invoices to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Export invoices to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const result = await importExportService.exportInvoicesToPDF();
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export invoices to PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Import invoices from CSV
  const handleImport = async () => {
    setIsImporting(true);
    try {
      Alert.alert(
        'Import Invoices',
        'Select a CSV file to import invoices. Existing invoices with matching IDs will be skipped.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Select File',
            onPress: async () => {
              const result = await importExportService.importFromCSV('invoices');
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
      Alert.alert('Error', 'Failed to import invoices');
      setIsImporting(false);
    }
  };

  // Smart import from any format
  const handleSmartImport = async () => {
    setIsImporting(true);
    try {
      // Parse the invoice file
      const parseResult = await smartInvoiceParser.parseInvoiceFile();
      
      if (!parseResult.success || !parseResult.invoice) {
        Alert.alert('Import Failed', parseResult.message);
        setIsImporting(false);
        return;
      }

      // Show preview and confirm
      Alert.alert(
        'Import Invoice?',
        `Invoice: ${parseResult.invoice.invoiceNumber}\nCustomer: ${parseResult.invoice.customer.name}\nTotal: $${parseResult.invoice.total.toFixed(2)}\n\nImport this invoice?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Import',
            onPress: async () => {
              const importResult = await smartInvoiceParser.importParsedInvoice(parseResult.invoice!);
              if (importResult.success) {
                Alert.alert('Success!', importResult.message);
              } else {
                Alert.alert('Import Failed', importResult.message);
              }
              setIsImporting(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import invoice');
      setIsImporting(false);
    }
  };

  // Download sample CSV template
  const handleDownloadSample = async () => {
    try {
      const result = await importExportService.generateSampleCSV('invoices');
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create sample CSV');
    }
  };

  // Filter invoices
  const filteredInvoices = invoices
    .filter(invoice => {
      const customer = getCustomerById(invoice.customerId);
      const job = getJobById(invoice.jobId);
      const matchesSearch = !searchQuery || 
        invoice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
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
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return 'document-outline';
      case 'sent': return 'send-outline';
      case 'paid': return 'checkmark-circle-outline';
      case 'overdue': return 'warning-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const InvoiceCard = ({ invoice }: { invoice: any }) => {
    const customer = getCustomerById(invoice.customerId);
    const job = getJobById(invoice.jobId);
    const isOverdue = invoice.status === 'sent' && new Date(invoice.dueDate) < new Date();
    
    return (
      <Pressable
        onPress={() => {
          navigation.navigate('InvoiceDetail', { invoiceId: invoice.id });
        }}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="font-bold text-green-600 text-base mr-2">
                {invoice.invoiceNumber}
              </Text>
              <View className={`px-2 py-1 rounded-full border flex-row items-center ${getStatusColor(isOverdue ? 'overdue' : invoice.status)}`}>
                <Ionicons 
                  name={getStatusIcon(isOverdue ? 'overdue' : invoice.status) as keyof typeof Ionicons.glyphMap} 
                  size={12} 
                  color={isOverdue ? '#DC2626' : invoice.status === 'paid' ? '#166534' : invoice.status === 'sent' ? '#1E40AF' : '#6B7280'}
                  style={{ marginRight: 4 }}
                />
                <Text className="text-xs font-medium">
                  {getStatusLabel(isOverdue ? 'overdue' : invoice.status)}
                </Text>
              </View>
            </View>
            
            <Text className="font-semibold text-gray-900 text-lg mb-1" numberOfLines={1}>
              {invoice.title}
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
              {formatCurrency(invoice.total)}
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
            </Text>
            {invoice.paidAt && (
              <Text className="text-green-600 text-xs mt-1 font-medium">
                Paid {format(new Date(invoice.paidAt), 'MMM d')}
              </Text>
            )}
          </View>
        </View>
        
        {invoice.description && (
          <Text className="text-gray-600 text-sm mt-3" numberOfLines={2}>
            {invoice.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">
              {invoice.items.length} items
            </Text>
          </View>
          
          <View className="flex-row items-center">
            {invoice.paymentTerms && (
              <>
                <Ionicons name="card-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1 mr-3">
                  {invoice.paymentTerms}
                </Text>
              </>
            )}
            
            {/* Email Button */}
            <EmailButton
              type="invoice"
              document={invoice}
              variant="icon"
              size="small"
              onEmailSent={() => {
                // Refresh the invoice list or show success feedback
                console.log('Invoice emailed successfully');
              }}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, invoice) => sum + (invoice.paidAmount || invoice.total), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

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
              Invoices
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
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-2 text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <Pressable
                onPress={() => navigation.navigate('CreateInvoice', {})}
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
          {/* Financial Summary */}
          <View className="bg-white px-4 py-3 border-b border-gray-200">
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-medium">Total Invoiced</Text>
                <Text className="text-gray-900 font-bold text-lg">{formatCurrency(totalInvoiced)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-medium">Paid</Text>
                <Text className="text-green-600 font-bold text-lg">{formatCurrency(totalPaid)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-medium">Outstanding</Text>
                <Text className="text-orange-600 font-bold text-lg">{formatCurrency(totalOutstanding)}</Text>
              </View>
            </View>
          </View>

          {/* Invoices List */}
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            {filteredInvoices.length === 0 ? (
              <View className="flex-1 items-center justify-center py-16">
                <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-500 text-lg font-medium mt-4">
                  {searchQuery ? 'No invoices found' : 'No invoices yet'}
                </Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Create your first invoice to bill customers'
                  }
                </Text>
                {!searchQuery && (
                  <Pressable
                    onPress={() => navigation.navigate('CreateInvoice', {})}
                    className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
                  >
                    <Text className="text-white font-semibold">Create Invoice</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {filteredInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
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
              <Text className="text-xl font-bold text-gray-900">Export Invoices</Text>
              <Text className="text-gray-500 text-center mt-2">
                Choose your export format
              </Text>
            </View>

            <View className="bg-gray-50 rounded-lg p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                <Text className="text-gray-700 font-medium ml-2">Export includes:</Text>
              </View>
              <Text className="text-gray-600 text-sm ml-7">• All invoice details</Text>
              <Text className="text-gray-600 text-sm ml-7">• Customer information</Text>
              <Text className="text-gray-600 text-sm ml-7">• Items and pricing</Text>
              <Text className="text-gray-600 text-sm ml-7">• Payment status</Text>
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
              disabled={isExporting || invoices.length === 0}
              className={`${isExporting || invoices.length === 0 ? 'bg-gray-300' : 'bg-blue-600'} rounded-lg py-4 items-center mb-3`}
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
              disabled={isExporting || invoices.length === 0 || !isPDFAvailable}
              className={`${isExporting || invoices.length === 0 || !isPDFAvailable ? 'bg-gray-300' : 'bg-red-600'} rounded-lg py-4 items-center`}
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
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} will be exported
            </Text>

            {invoices.length === 0 && (
              <Text className="text-gray-400 text-sm text-center mt-3">
                No invoices to export
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <ScrollView className="flex-1 px-4 pt-6">
          {/* Smart Import Section */}
          <View className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 shadow-lg mb-4">
            <View className="items-center mb-4">
              <View className="bg-white bg-opacity-20 rounded-full p-4 mb-3">
                <Ionicons name="sparkles-outline" size={32} color="white" />
              </View>
              <Text className="text-xl font-bold text-white">Smart Import (AI)</Text>
              <Text className="text-white text-center mt-2 opacity-90">
                Import from Square, QuickBooks, or any invoice format
              </Text>
            </View>

            <View className="bg-white bg-opacity-10 rounded-lg p-3 mb-4">
              <Text className="text-white text-sm">✨ Automatically creates customers</Text>
              <Text className="text-white text-sm">✨ Extracts all invoice details</Text>
              <Text className="text-white text-sm">✨ Handles any format (CSV, text, etc.)</Text>
            </View>

            <Pressable
              onPress={handleSmartImport}
              disabled={isImporting}
              className={`${isImporting ? 'bg-gray-400' : 'bg-white'} rounded-lg py-4 items-center`}
            >
              {isImporting ? (
                <ActivityIndicator color="#7C3AED" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="sparkles" size={20} color="#7C3AED" />
                  <Text className="text-purple-600 font-bold text-lg ml-2">
                    Smart Import Invoice
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Regular CSV Import Section */}
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-4 mb-3">
                <Ionicons name="document-text-outline" size={32} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-gray-900">CSV Import</Text>
              <Text className="text-gray-500 text-center mt-2">
                Import from this app's CSV format
              </Text>
            </View>

            <View className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
              <View className="flex-row items-start">
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <View className="flex-1 ml-2">
                  <Text className="text-yellow-800 font-medium mb-1">CSV Import Requirements:</Text>
                  <Text className="text-yellow-700 text-sm">• Download sample CSV below to see format</Text>
                  <Text className="text-yellow-700 text-sm">• Required: Title, Customer ID</Text>
                  <Text className="text-yellow-700 text-sm">• Customer IDs must already exist</Text>
                  <Text className="text-yellow-700 text-sm">• Duplicate IDs will be skipped</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleDownloadSample}
              className="bg-blue-600 rounded-lg py-3 items-center mb-3"
            >
              <View className="flex-row items-center">
                <Ionicons name="download-outline" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  Download Sample CSV
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleImport}
              disabled={isImporting}
              className={`${isImporting ? 'bg-gray-300' : 'bg-green-600'} rounded-lg py-4 items-center`}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="cloud-upload-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Select CSV File to Import
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

export default InvoicesScreen;