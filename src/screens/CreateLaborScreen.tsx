import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useJobStore } from '../state/store';

const CreateLaborScreen = () => {
  const navigation = useNavigation();
  const { addLaborItem } = useJobStore();
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [category, setCategory] = useState('');

  const handleSave = () => {
    if (!description.trim() || !hourlyRate.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      Alert.alert('Error', 'Please enter a valid hourly rate');
      return;
    }

    addLaborItem({
      description: description.trim(),
      hourlyRate: rate,
      category: category.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter labor description"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Hourly Rate *</Text>
          <TextInput
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="0.00"
            keyboardType="decimal-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Enter category"
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
          <Text className="text-white font-semibold text-lg">Add Labor Item</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default CreateLaborScreen;