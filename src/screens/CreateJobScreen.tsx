import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';

const CreateJobScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, customers } = useJobStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState((route.params as any)?.customerId || '');
  const [selectedStatus, setSelectedStatus] = useState<'not-started' | 'waiting-quote' | 'quote-sent' | 'quote-approved' | 'active' | 'on-hold' | 'completed' | 'cancelled'>('not-started');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title.trim() || !selectedCustomer) {
      Alert.alert('Error', 'Please fill in title and select a customer');
      return;
    }

    const jobData: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      customerId: selectedCustomer,
      status: selectedStatus,
      notes: notes.trim() || undefined,
    };

    if (estimatedHours.trim()) {
      const hours = parseFloat(estimatedHours);
      if (!isNaN(hours) && hours > 0) {
        jobData.estimatedHours = hours;
      }
    }

    if (dueDate.trim()) {
      jobData.dueDate = dueDate.trim();
    }

    addJob(jobData);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Create New Job</Text>
          <Text className="text-gray-600">Set up a new project for your customer</Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Job Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter job title (e.g., Kitchen Renovation)"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Customer *</Text>
          <View className="border border-gray-300 rounded-lg bg-white max-h-48">
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
                      <Text className="text-gray-900 font-medium">{customer.name}</Text>
                      {customer.company && (
                        <Text className="text-gray-500 text-sm">{customer.company}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Job Status *</Text>
          <View className="border border-gray-300 rounded-lg bg-white">
            {[
              { value: 'not-started', label: 'Not Started', icon: 'pause-circle-outline', color: '#6B7280' },
              { value: 'waiting-quote', label: 'Waiting on Quote', icon: 'time-outline', color: '#F59E0B' },
              { value: 'quote-sent', label: 'Quote Sent', icon: 'mail-outline', color: '#3B82F6' },
              { value: 'quote-approved', label: 'Quote Approved', icon: 'checkmark-circle-outline', color: '#10B981' },
              { value: 'active', label: 'Active', icon: 'play-circle-outline', color: '#059669' },
              { value: 'on-hold', label: 'On Hold', icon: 'pause-outline', color: '#EF4444' },
            ].map((status, index) => (
              <Pressable
                key={status.value}
                onPress={() => setSelectedStatus(status.value as any)}
                className={`p-3 flex-row items-center ${index < 5 ? 'border-b border-gray-100' : ''} ${selectedStatus === status.value ? 'bg-blue-50' : ''}`}
              >
                <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedStatus === status.value ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                }`} />
                <Ionicons name={status.icon as any} size={20} color={status.color} style={{ marginRight: 8 }} />
                <Text className={`font-medium ${selectedStatus === status.value ? 'text-blue-900' : 'text-gray-900'}`}>
                  {status.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Job Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the project work to be performed"
            multiline
            numberOfLines={4}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Estimated Hours</Text>
          <TextInput
            value={estimatedHours}
            onChangeText={setEstimatedHours}
            placeholder="Enter estimated hours (optional)"
            keyboardType="decimal-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Due Date (Optional)</Text>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="MM/DD/YYYY"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes about the job"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Text className="text-blue-800 font-medium mb-2">Next Steps</Text>
          <Text className="text-blue-700 text-sm">
            After creating this job, you can add quotes for estimates and invoices for billing from the job detail screen.
          </Text>
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-lg py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">Create Job</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default CreateJobScreen;