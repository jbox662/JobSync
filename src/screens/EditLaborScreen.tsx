import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useJobStore } from '../state/store';

type RouteProps = RouteProp<{
  EditLabor: { laborId: string };
}, 'EditLabor'>;

const EditLaborScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { laborId } = route.params;
  const { updateLaborItem, getLaborItemById } = useJobStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [customTotal, setCustomTotal] = useState('');
  const [category, setCategory] = useState('');
  const [isCustomTotal, setIsCustomTotal] = useState(false);

  // Load existing labor item data
  useEffect(() => {
    const laborItem = getLaborItemById(laborId);
    if (laborItem) {
      setName(laborItem.name || '');
      setDescription(laborItem.description || '');
      setHourlyRate(laborItem.hourlyRate?.toString() || '');
      setCustomTotal(laborItem.hourlyRate?.toString() || '');
      setCategory(laborItem.category || '');
    }
  }, [laborId, getLaborItemById]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a labor item name');
      return;
    }

    if (!isCustomTotal && !hourlyRate.trim()) {
      Alert.alert('Error', 'Please enter an hourly rate');
      return;
    }

    if (isCustomTotal && !customTotal.trim()) {
      Alert.alert('Error', 'Please enter a custom total');
      return;
    }

    let rate: number;
    if (isCustomTotal) {
      rate = parseFloat(customTotal);
      if (isNaN(rate) || rate < 0) {
        Alert.alert('Error', 'Please enter a valid custom total');
        return;
      }
    } else {
      rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 0) {
        Alert.alert('Error', 'Please enter a valid hourly rate');
        return;
      }
    }

    updateLaborItem(laborId, {
      name: name.trim(),
      description: description.trim() || undefined,
      hourlyRate: rate,
      category: category.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Edit Labor Item</Text>
          <Text className="text-gray-600">Update labor service details</Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Labor Item Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Electrical Installation, Plumbing Repair"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional detailed description of the labor service"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Pricing Type Toggle */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700 font-medium">Pricing Type</Text>
            <View className="flex-row items-center">
              <Text className={`text-sm mr-2 ${!isCustomTotal ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                Hourly Rate
              </Text>
              <Switch
                value={isCustomTotal}
                onValueChange={setIsCustomTotal}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={isCustomTotal ? '#FFFFFF' : '#9CA3AF'}
                ios_backgroundColor="#E5E7EB"
              />
              <Text className={`text-sm ml-2 ${isCustomTotal ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                Custom Total
              </Text>
            </View>
          </View>
        </View>

        {/* Hourly Rate Field */}
        {!isCustomTotal && (
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
        )}

        {/* Custom Total Field */}
        {isCustomTotal && (
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Custom Total *</Text>
            <TextInput
              value={customTotal}
              onChangeText={setCustomTotal}
              placeholder="0.00"
              keyboardType="decimal-pad"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Enter the total amount for this labor item
            </Text>
          </View>
        )}

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
          <Text className="text-white font-semibold text-lg">Update Labor Item</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default EditLaborScreen;
