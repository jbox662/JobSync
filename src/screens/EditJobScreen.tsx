import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { JobItem } from '../types';

type RouteProps = {
  key: string;
  name: 'EditJob';
  params: { jobId: string };
};

const EditJobScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { jobId } = route.params;
  const { updateJob, getJobById, customers, parts, laborItems, getCustomerById, getPartById, getLaborItemById } = useJobStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<JobItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'part' | 'labor'>('part');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Load existing job data
  useEffect(() => {
    const job = getJobById(jobId);
    if (job) {
      setTitle(job.title || '');
      setDescription(job.description || '');
      setSelectedCustomer(job.customerId || '');
      setStatus(job.status || 'active');
      setNotes(job.notes || '');
      setItems(job.items || []);
      
      // Format dates for input
      if (job.startDate) {
        const date = new Date(job.startDate);
        if (!isNaN(date.getTime())) {
          setStartDate((date.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                     date.getDate().toString().padStart(2, '0') + '/' + 
                     date.getFullYear());
        }
      }
      
      if (job.dueDate) {
        const date = new Date(job.dueDate);
        if (!isNaN(date.getTime())) {
          setDueDate((date.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                    date.getDate().toString().padStart(2, '0') + '/' + 
                    date.getFullYear());
        }
      }
    }
  }, [jobId, getJobById]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    return { subtotal, total: subtotal };
  };

  const { total } = calculateTotals();

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    // Parse dates
    let startDateISO: string | undefined;
    let dueDateISO: string | undefined;

    if (startDate.trim()) {
      const date = parseDateString(startDate.trim());
      if (!date) {
        Alert.alert('Error', 'Please enter a valid start date in MM/DD/YYYY format');
        return;
      }
      startDateISO = date.toISOString();
    }

    if (dueDate.trim()) {
      const date = parseDateString(dueDate.trim());
      if (!date) {
        Alert.alert('Error', 'Please enter a valid due date in MM/DD/YYYY format');
        return;
      }
      dueDateISO = date.toISOString();
    }

    updateJob(jobId, {
      title: title.trim(),
      description: description.trim() || undefined,
      customerId: selectedCustomer,
      status: status as any,
      notes: notes.trim() || undefined,
      items,
      total,
      startDate: startDateISO,
      dueDate: dueDateISO,
    });

    navigation.goBack();
  };

  const parseDateString = (dateStr: string): Date | null => {
    // Try multiple date parsing approaches
    let date = new Date(dateStr);

    // If that fails, try parsing MM/DD/YYYY format specifically
    if (isNaN(date.getTime())) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1; // JS months are 0-based
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
    }

    // Final validation
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 3000) {
      return null;
    }

    return date;
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
    { key: 'active', label: 'Active' },
    { key: 'on-hold', label: 'On Hold' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
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
              <Text className="text-2xl font-bold text-gray-900">Edit Job</Text>
              <Text className="text-gray-600 mt-1">Update job details and items</Text>
            </View>
          </View>

          {/* Basic Information */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Job Information</Text>
            
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
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Job Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter job title"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter job description (optional)"
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

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Start Date</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="MM/DD/YYYY (optional)"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Due Date</Text>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="MM/DD/YYYY (optional)"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes (optional)"
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Items Section */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Job Items</Text>
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
                  Add parts or labor items to this job
                </Text>
              </View>
            )}
          </View>

          {/* Job Summary */}
          <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Job Summary</Text>
            
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600">Total:</Text>
              <Text className="font-semibold text-gray-900">{formatCurrency(total)}</Text>
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
              <Text className="text-white font-semibold text-center text-lg">Update Job</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditJobScreen;
