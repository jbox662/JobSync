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
    getJobQuotes,
    getJobInvoices,
    updateJob,
    deleteJob,
    updateQuote,
    updateInvoice,
    jobs,
    quotes,
    invoices
  } = useJobStore();

  const [job, setJob] = useState(() => getJobById(jobId));
  const customer = job ? getCustomerById(job.customerId) : null;
  const jobQuotes = job ? getJobQuotes(job.id) : [];
  const jobInvoices = job ? getJobInvoices(job.id) : [];

  // Refresh job data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const updatedJob = getJobById(jobId);
      setJob(updatedJob);
    }, [jobId, jobs, quotes, invoices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const updatedJob = getJobById(jobId);
    setJob(updatedJob);
    setRefreshing(false);
  }, [jobId]);

  const handleEdit = () => {
    navigation.navigate('EditJob', { jobId });
  };

  const handleDelete = () => {
    const hasQuotes = jobQuotes.length > 0;
    const hasInvoices = jobInvoices.length > 0;
    
    if (hasQuotes || hasInvoices) {
      Alert.alert(
        'Cannot Delete Job',
        `This job has ${jobQuotes.length} quote(s) and ${jobInvoices.length} invoice(s). Delete those first before deleting the job.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job?.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteJob(jobId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleLinkExistingQuote = () => {
    // Get quotes that are not already linked to this job
    const availableQuotes = quotes.filter(quote => quote.jobId !== jobId);
    
    if (availableQuotes.length === 0) {
      Alert.alert('No Available Quotes', 'There are no unlinked quotes available to link to this job.');
      return;
    }

    // Create options for the alert
    const quoteOptions = availableQuotes.map(quote => ({
      text: `${quote.quoteNumber} - ${quote.title}`,
      onPress: () => {
        updateQuote(quote.id, { jobId: jobId });
        // Refresh job data
        const updatedJob = getJobById(jobId);
        setJob(updatedJob);
      }
    }));

    quoteOptions.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });

    Alert.alert('Link Existing Quote', 'Select a quote to link to this job:', quoteOptions);
  };

  const handleLinkExistingInvoice = () => {
    // Get invoices that are not already linked to this job
    const availableInvoices = invoices.filter(invoice => invoice.jobId !== jobId);
    
    if (availableInvoices.length === 0) {
      Alert.alert('No Available Invoices', 'There are no unlinked invoices available to link to this job.');
      return;
    }

    // Create options for the alert
    const invoiceOptions = availableInvoices.map(invoice => ({
      text: `${invoice.invoiceNumber} - ${invoice.title}`,
      onPress: () => {
        updateInvoice(invoice.id, { jobId: jobId });
        // Refresh job data
        const updatedJob = getJobById(jobId);
        setJob(updatedJob);
      }
    }));

    invoiceOptions.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });

    Alert.alert('Link Existing Invoice', 'Select an invoice to link to this job:', invoiceOptions);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'play-circle';
      case 'on-hold': return 'pause-circle';
      case 'completed': return 'checkmark-circle';
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

  const handleStatusUpdate = (newStatus: string) => {
    if (!job) return;
    
    Alert.alert(
      'Update Job Status',
      `Are you sure you want to mark this job as ${newStatus.replace('-', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            const updates: any = { status: newStatus };
            
            if (newStatus === 'completed') {
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
        color={status === 'active' ? '#1E40AF' : status === 'on-hold' ? '#C2410C' : status === 'completed' ? '#166534' : '#7F1D1D'} 
      />
      <Text className={`ml-2 font-semibold text-sm ${
        status === 'active' ? 'text-blue-800' : 
        status === 'on-hold' ? 'text-yellow-800' : 
        status === 'completed' ? 'text-green-800' : 'text-red-800'
      }`}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );

  const QuoteCard = ({ quote }: { quote: any }) => (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base">
            {quote.quoteNumber}
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            {quote.title}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className={`px-2 py-1 rounded-full ${
              quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              quote.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              <Text className="text-xs font-medium">{quote.status}</Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-bold text-gray-900 text-lg">
            {formatCurrency(quote.total)}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            {format(new Date(quote.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>
    </View>
  );

  const InvoiceCard = ({ invoice }: { invoice: any }) => (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base">
            {invoice.invoiceNumber}
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            {invoice.title}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className={`px-2 py-1 rounded-full ${
              invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
              'bg-red-100 text-red-800'
            }`}>
              <Text className="text-xs font-medium">{invoice.status}</Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-bold text-gray-900 text-lg">
            {formatCurrency(invoice.total)}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>
    </View>
  );

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

  const totalQuoteValue = jobQuotes.reduce((sum, quote) => sum + quote.total, 0);
  const totalInvoiceValue = jobInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paidInvoiceValue = jobInvoices.filter(i => i.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0);

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
                  {(customer.company || customer.name).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">{customer.company || customer.name}</Text>
                {customer.company && customer.name && (
                  <Text className="text-gray-600 text-sm">{customer.name}</Text>
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
            {job.startDate && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="play-outline" size={16} color="#10B981" />
                <Text className="text-gray-600 text-sm ml-2">
                  Started: {format(new Date(job.startDate), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
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

        {/* Financial Overview */}
        {(jobQuotes.length > 0 || jobInvoices.length > 0) && (
          <View className="px-4 py-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-gray-600">Total Quoted:</Text>
                <Text className="text-gray-900 font-semibold">{formatCurrency(totalQuoteValue)}</Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-gray-600">Total Invoiced:</Text>
                <Text className="text-gray-900 font-semibold">{formatCurrency(totalInvoiceValue)}</Text>
              </View>
              <View className="h-px bg-gray-200 mb-3" />
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-gray-900">Total Paid:</Text>
                <Text className="text-lg font-bold text-green-600">{formatCurrency(paidInvoiceValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quotes Section */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Quotes</Text>
            <View className="flex-row">
              <Pressable
                onPress={handleLinkExistingQuote}
                className="bg-gray-600 rounded-lg px-3 py-2 mr-2"
              >
                <Text className="text-white font-medium text-sm">Link Quote</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('CreateQuote', { jobId: job.id })}
                className="bg-blue-600 rounded-lg px-4 py-2"
              >
                <Text className="text-white font-medium text-sm">New Quote</Text>
              </Pressable>
            </View>
          </View>

          {jobQuotes.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-100">
              <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-500 text-base font-medium mt-2">No quotes yet</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Create a quote to provide cost estimates for this job
              </Text>
            </View>
          ) : (
            <>
              {jobQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </>
          )}
        </View>

        {/* Invoices Section */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Invoices</Text>
            <View className="flex-row">
              <Pressable
                onPress={handleLinkExistingInvoice}
                className="bg-gray-600 rounded-lg px-3 py-2 mr-2"
              >
                <Text className="text-white font-medium text-sm">Link Invoice</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('CreateInvoice', { jobId: job.id })}
                className="bg-green-600 rounded-lg px-4 py-2"
              >
                <Text className="text-white font-medium text-sm">New Invoice</Text>
              </Pressable>
            </View>
          </View>

          {jobInvoices.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-100">
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-500 text-base font-medium mt-2">No invoices yet</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Create an invoice to bill your customer for work completed
              </Text>
            </View>
          ) : (
            <>
              {jobInvoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </>
          )}
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

      {/* Quick Actions */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Status Actions Row */}
        {job.status !== 'completed' && (
          <View className="flex-row mb-3">
            {job.status === 'active' && (
              <>
                <Pressable
                  onPress={() => handleStatusUpdate('on-hold')}
                  className="flex-1 bg-yellow-600 rounded-xl py-3 mr-3"
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Put On Hold
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleStatusUpdate('completed')}
                  className="flex-1 bg-green-600 rounded-xl py-3"
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Mark Complete
                  </Text>
                </Pressable>
              </>
            )}

            {job.status === 'on-hold' && (
              <Pressable
                onPress={() => handleStatusUpdate('active')}
                className="flex-1 bg-blue-600 rounded-xl py-3"
              >
                <Text className="text-white font-semibold text-center text-sm">
                  Resume Job
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {job.status === 'completed' && (
          <View className="mb-3">
            <Text className="text-center text-gray-500 py-2 text-sm">
              Job completed on {format(new Date(job.completedAt || job.updatedAt), 'MMM d, yyyy')}
            </Text>
          </View>
        )}

        {/* Edit/Delete Actions Row */}
        <View className="flex-row">
          <Pressable
            onPress={handleEdit}
            className="flex-1 bg-gray-600 rounded-xl py-4 mr-3"
          >
            <Text className="text-white font-semibold text-center text-base">
              Edit Job
            </Text>
          </Pressable>
          
          <Pressable
            onPress={handleDelete}
            className="px-4 py-4 bg-red-100 rounded-xl"
            disabled={jobQuotes.length > 0 || jobInvoices.length > 0}
          >
            <Ionicons 
              name="trash-outline" 
              size={24} 
              color={jobQuotes.length > 0 || jobInvoices.length > 0 ? "#9CA3AF" : "#EF4444"} 
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default JobDetailScreen;