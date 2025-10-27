import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PartsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { parts } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParts = parts
    .filter(part => {
      const matchesSearch = !searchQuery || 
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const PartCard = ({ part }: { part: any }) => {
    const isLowStock = part.lowStockThreshold && part.stock <= part.lowStockThreshold;

    return (
      <Pressable
        onPress={() => navigation.navigate('PartDetail', { partId: part.id })}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
              {part.name}
            </Text>

            {part.description && (
              <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
                {part.description}
              </Text>
            )}

            {part.sku && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="barcode-outline" size={14} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1">
                  SKU: {part.sku}
                </Text>
              </View>
            )}
          </View>

          <View className="items-end ml-3">
            <Text className="font-bold text-gray-900 text-lg">
              {formatCurrency(part.unitPrice)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons
              name={isLowStock ? "warning" : "cube-outline"}
              size={16}
              color={isLowStock ? "#EF4444" : "#6B7280"}
            />
            <Text className={`text-sm ml-1 ${isLowStock ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              Stock: {part.stock}
              {isLowStock && ' (Low)'}
            </Text>
          </View>

          {part.category && (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-gray-600 text-xs font-medium">
                {part.category}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Search and Add Button */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2 mr-3">
            <View className="flex-row items-center">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                placeholder="Search parts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreatePart')}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Parts List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {filteredParts.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="construct-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? 'No parts found' : 'No parts yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Add your first part to get started'
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => navigation.navigate('CreatePart')}
                className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
              >
                <Text className="text-white font-semibold">Add Part</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredParts.map((part) => (
              <PartCard key={part.id} part={part} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default PartsScreen;