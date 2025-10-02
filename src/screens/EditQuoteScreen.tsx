import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { JobItem } from '../types';

type RouteProps = {
  key: string;
  name: 'EditQuote';
  params: { quoteId: string };
};

const EditQuoteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { quoteId } = route.params;
  const { updateQuote, getQuoteById, jobs, customers, parts, laborItems, getCustomerById, getPartById, getLaborItemById, settings } = useJobStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [taxRate, setTaxRate] = useState(settings.defaultTaxRate.toString());
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<JobItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'part' | 'labor'>('part');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [linkToExistingJob, setLinkToExistingJob] = useState(false);
  const [status, setStatus] = useState('draft');

  // Get existing jobs for selection
  const availableJobs = jobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled');

  // Load existing quote data
  useEffect(() => {
    const quote = getQuoteById(quoteId);
    if (quote) {
      setTitle(quote.title || '');
      setDescription(quote.description || '');
      setSelectedCustomer(quote.customerId || '');
      setSelectedJob(quote.jobId || '');
      setTaxRate((quote.taxRate || 0).toString());
      setItems(quote.items || []);
      setStatus(quote.status || 'draft');
      setLinkToExistingJob(!!quote.jobId);
      
      // Parse validUntil from notes or validUntil field
      if (quote.validUntil) {
        const date = new Date(quote.validUntil);
        if (!isNaN(date.getTime())) {
          setValidUntil((date.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                      date.getDate().toString().padStart(2, '0') + '/' + 
                      date.getFullYear());
        }
      } else if (quote.notes && quote.notes.includes('Valid until:')) {
        const validUntilMatch = quote.notes.match(/Valid until:\s*(.+)/);
        if (validUntilMatch) {
          setValidUntil(validUntilMatch[1].trim());
        }
      }
    }
  }, [quoteId, getQuoteById]);

  // Auto-fill from selected job
  useEffect(() => {
    if (selectedJob && linkToExistingJob) {
      const job = jobs.find(j => j.id === selectedJob);
      if (job) {
        setTitle(job.title);
        setDescription(job.description || '');
        setSelectedCustomer(job.customerId);
      }
    }
  }, [selectedJob, jobs, linkToExistingJob]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = settings.enableTax ? subtotal * (parseFloat(taxRate) / 100) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a quote title');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (linkToExistingJob && !selectedJob) {
      Alert.alert('Error', 'Please select a job or uncheck "Link to existing job"');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item to the quote');
      return;
    }

    // Validate and parse the validUntil date
    let validUntilDate: string | undefined;
    if (validUntil.trim()) {
      const cleanDate = validUntil.trim();

      // Try multiple date parsing approaches
      let date: Date;

      // First try direct parsing
      date = new Date(cleanDate);

      // If that fails, try parsing MM/DD/YYYY format specifically
      if (isNaN(date.getTime())) {
        const parts = cleanDate.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1; // JS months are 0-based
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        }
      }

      // Final validation
      if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 3000) {
        Alert.alert('Error', `Please enter a valid date in MM/DD/YYYY format for "Valid Until". Example: 12/31/2024`);
        return;
      }

      validUntilDate = date.toISOString();
    }

    updateQuote(quoteId, {
      jobId: (linkToExistingJob && selectedJob) ? selectedJob : undefined,
      customerId: selectedCustomer,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      items,
      taxRate: settings.enableTax ? parseFloat(taxRate) || 0 : 0,
      notes: validUntil ? `Valid until: ${validUntil}` : undefined,
      validUntil: validUntilDate,
    });

    navigation.goBack();
  };

  const availableItems = selectedItemType === 'part' ? parts : laborItems;

  const addItem = () => {
    if (!selectedItemId || !quantity) {
      Alert.alert('Error', 'Please select an item and enter quantity');
      return;
    }

    const itemData = selectedItemType === 'part' 
      ? getPartById(selectedItemId) 
      : getLaborItemById(selectedItemId);

    if (!itemData) {
      Alert.alert('Error', 'Selected item not found');
      return;
    }

    const newItem: JobItem = {
      id: selectedItemId,
      type: selectedItemType,
      quantity: parseInt(quantity),
      rate: itemData.price,
    };

    setItems([...items, newItem]);
    setSelectedItemId('');
    setQuantity('1');
    setShowAddItem(false);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statusOptions = [
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Edit Quote</Text>
              <Text className="text-gray-600 mt-1">Update quote details and items</Text>
            </View>
          </View>

          {/* Basic Information */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Quote Information</Text>
            
            {/* Status */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Status *</Text>
              <View className="border border-gray-300 rounded-lg bg-white">
                {statusOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setStatus(option.key)}
                    className={`p-3 flex-row items-center border-b border-gray-100 last:border-b-0 ${
                      status === option.key ? 'bg-blue-50' : ''
                    }`}
                  >
                    <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      status === option.key ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                    }`} />
                    <Text className="text-gray-900 font-medium">{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Link to Job Toggle */}
            <View className="mb-4">
              <Pressable
                onPress={() => setLinkToExistingJob(!linkToExistingJob)}
                className="flex-row items-center"
              >
                <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                  linkToExistingJob ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                }`}>
                  {linkToExistingJob && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text className="text-gray-700 font-medium">Link to existing job</Text>
              </Pressable>
            </View>

            {linkToExistingJob && (
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Select Job *</Text>
                <View className="border border-gray-300 rounded-lg bg-white max-h-32">
                  {availableJobs.length === 0 ? (
                    <View className="p-3">
                      <Text className="text-gray-500">No active jobs available</Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {availableJobs.map((job) => {
                        const customer = getCustomerById(job.customerId);
                        return (
                          <Pressable
                            key={job.id}
                            onPress={() => setSelectedJob(job.id)}
                            className={`p-3 flex-row items-center border-b border-gray-100 ${selectedJob === job.id ? 'bg-blue-50' : ''}`}
                          >
                            <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                              selectedJob === job.id ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                            }`} />
                            <View>
                              <Text className="text-gray-900 font-medium">{job.title}</Text>
                              <Text className="text-gray-500 text-sm">{customer?.name}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Quote Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter quote title"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter quote description (optional)"
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Customer *</Text>
              <View className="border border-gray-300 rounded-lg bg-white max-h-32">
                {customers.length === 0 ? (
                  <View className="p-3">
                    <Text className="text-gray-500">No customers available</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {customers.map((customer) => (
                      <Pressable
                        key={customer.id}
                        onPress={() => setSelectedCustomer(customer.id)}
                        className={`p-3 flex-row items-center border-b border-gray-100 ${selectedCustomer === customer.id ? 'bg-blue-50' : ''}`}
                      >
                        <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedCustomer === customer.id ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                        }`} />
                        <View>
                          <Text className="text-gray-900 font-medium">{customer.company || customer.name}</Text>
                          {customer.company && customer.name && (
                            <Text className="text-gray-500 text-sm">{customer.name}</Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {settings.enableTax && (
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Tax Rate (%)</Text>
                <TextInput
                  value={taxRate}
                  onChangeText={setTaxRate}
                  placeholder="0"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Valid Until</Text>
              <TextInput
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="MM/DD/YYYY (optional)"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Items Section */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Quote Items</Text>
              <Pressable
                onPress={() => setShowAddItem(!showAddItem)}
                className="bg-blue-600 rounded-lg px-4 py-2"
              >
                <Text className="text-white font-medium text-sm">
                  {showAddItem ? 'Cancel' : 'Add Item'}
                </Text>
              </Pressable>
            </View>

            {showAddItem && (
              <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <View className="flex-row mb-4">
                  <Pressable
                    onPress={() => setSelectedItemType('part')}
                    className={`flex-1 py-2 px-4 rounded-lg mr-2 ${
                      selectedItemType === 'part' ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      selectedItemType === 'part' ? 'text-white' : 'text-gray-700'
                    }`}>
                      Parts
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedItemType('labor')}
                    className={`flex-1 py-2 px-4 rounded-lg ml-2 ${
                      selectedItemType === 'labor' ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      selectedItemType === 'labor' ? 'text-white' : 'text-gray-700'
                    }`}>
                      Labor
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">Select {selectedItemType}</Text>
                  <View className="border border-gray-300 rounded-lg bg-white max-h-32">
                    {availableItems.length === 0 ? (
                      <View className="p-3">
                        <Text className="text-gray-500">No {selectedItemType}s available</Text>
                      </View>
                    ) : (
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {availableItems.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => setSelectedItemId(item.id)}
                            className={`p-3 flex-row items-center justify-between border-b border-gray-100 ${
                              selectedItemId === item.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <View className="flex-1">
                              <Text className="text-gray-900 font-medium">{item.name}</Text>
                              <Text className="text-gray-500 text-sm">{formatCurrency(item.price)}</Text>
                            </View>
                            <View className={`w-4 h-4 rounded-full border-2 ${
                              selectedItemId === item.id ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                            }`} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">Quantity</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <Pressable
                  onPress={addItem}
                  className="bg-green-600 rounded-lg py-3"
                >
                  <Text className="text-white font-semibold text-center">Add Item</Text>
                </Pressable>
              </View>
            )}

            {/* Items List */}
            {items.map((item, index) => {
              const itemData = item.type === 'part' ? getPartById(item.id) : getLaborItemById(item.id);
              return (
                <View key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">{itemData?.name}</Text>
                      <Text className="text-gray-500 text-sm capitalize">{item.type}</Text>
                      <Text className="text-gray-600 text-sm">
                        Qty: {item.quantity} × {formatCurrency(item.rate)} = {formatCurrency(item.quantity * item.rate)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeItem(index)}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {items.length === 0 && (
              <View className="bg-white rounded-lg p-6 items-center border border-gray-200">
                <Ionicons name="list-outline" size={40} color="#D1D5DB" />
                <Text className="text-gray-500 font-medium mt-2">No items added</Text>
                <Text className="text-gray-400 text-sm text-center mt-1">
                  Add parts or labor items to this quote
                </Text>
              </View>
            )}
          </View>

          {/* Quote Summary */}
          <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</Text>
            
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600">Subtotal:</Text>
              <Text className="font-semibold text-gray-900">{formatCurrency(subtotal)}</Text>
            </View>
            
            {settings.enableTax && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-600">Tax ({taxRate}%):</Text>
                <Text className="font-semibold text-gray-900">{formatCurrency(tax)}</Text>
              </View>
            )}
            
            <View className="border-t border-gray-200 mt-2 pt-2">
              <View className="flex-row justify-between py-2">
                <Text className="text-lg font-bold text-gray-900">Total:</Text>
                <Text className="text-lg font-bold text-blue-600">{formatCurrency(total)}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 mb-8">
            <Pressable
              onPress={() => navigation.goBack()}
              className="flex-1 bg-gray-200 rounded-lg py-4"
            >
              <Text className="text-gray-700 font-semibold text-center text-lg">Cancel</Text>
            </Pressable>
            
            <Pressable
              onPress={handleSave}
              className="flex-1 bg-blue-600 rounded-lg py-4"
            >
              <Text className="text-white font-semibold text-center text-lg">Update Quote</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditQuoteScreen;
