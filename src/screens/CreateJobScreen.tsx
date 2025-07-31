import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';

const CreateJobScreen = () => {
  const navigation = useNavigation();
  const { addJob, customers } = useJobStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [taxRate, setTaxRate] = useState('8.25');

  const handleSave = () => {
    if (!title.trim() || !selectedCustomer) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    addJob({
      title: title.trim(),
      description: description.trim() || undefined,
      customerId: selectedCustomer,
      status: 'quote',
      items: [],
      taxRate: parseFloat(taxRate) || 0,
      tax: 0,
    });

    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Job Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter job title"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Customer *</Text>
          <View className="border border-gray-300 rounded-lg">
            {customers.length === 0 ? (
              <View className="p-3">
                <Text className="text-gray-500">No customers available</Text>
              </View>
            ) : (
              customers.map((customer) => (
                <Pressable
                  key={customer.id}
                  onPress={() => setSelectedCustomer(customer.id)}
                  className={`p-3 flex-row items-center ${selectedCustomer === customer.id ? 'bg-blue-50' : ''}`}
                >
                  <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedCustomer === customer.id ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                  }`} />
                  <Text className="text-gray-900">{customer.name}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter job description"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Tax Rate (%)</Text>
          <TextInput
            value={taxRate}
            onChangeText={setTaxRate}
            placeholder="8.25"
            keyboardType="decimal-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-200">
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