import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useJobStore } from '../state/store';

const CreatePartScreen = () => {
  const navigation = useNavigation();
  const { addPart } = useJobStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');

  const handleSave = () => {
    if (!name.trim() || !unitPrice.trim() || !stock.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(unitPrice);
    const stockCount = parseInt(stock);

    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid unit price');
      return;
    }

    if (isNaN(stockCount) || stockCount < 0) {
      Alert.alert('Error', 'Please enter a valid stock quantity');
      return;
    }

    addPart({
      name: name.trim(),
      description: description.trim() || undefined,
      unitPrice: price,
      stock: stockCount,
      sku: sku.trim() || undefined,
      category: category.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
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
          <Text className="text-gray-700 font-medium mb-2">Stock Quantity *</Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            placeholder="0"
            keyboardType="number-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">SKU</Text>
          <TextInput
            value={sku}
            onChangeText={setSku}
            placeholder="Enter SKU"
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
    </View>
  );
};

export default CreatePartScreen;