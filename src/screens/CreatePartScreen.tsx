import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useJobStore } from '../state/store';

const CreatePartScreen = () => {
  const navigation = useNavigation();
  const { addPart } = useJobStore();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim() || !unitPrice.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(unitPrice);

    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid unit price');
      return;
    }

    addPart({
      name: name.trim(),
      description: description.trim() || undefined,
      unitPrice: price,
      stock: 0, // Default stock to 0
      sku: undefined, // No SKU field
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Part Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter part name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Brand</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="Enter brand name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Unit Price *</Text>
          <TextInput
            value={unitPrice}
            onChangeText={setUnitPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Enter category"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter part description"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-200">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-lg py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">Add Part</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreatePartScreen;