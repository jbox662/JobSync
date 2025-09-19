import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LaborScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { laborItems } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLaborItems = laborItems
    .filter(item => {
      const matchesSearch = !searchQuery || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => a.description.localeCompare(b.description));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const LaborCard = ({ item }: { item: any }) => {
    return (
      <Pressable 
        onPress={() => navigation.navigate('LaborDetail', { laborId: item.id })}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={2}>
              {item.description}
            </Text>
            
            <View className="flex-row items-center mt-2">
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1">
                {formatCurrency(item.hourlyRate)}/hour
              </Text>
            </View>
          </View>
        </View>

        {item.category && (
          <View className="flex-row justify-end mt-3 pt-3 border-t border-gray-100">
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-gray-600 text-sm font-medium">
                {item.category}
              </Text>
            </View>
          </View>
        )}
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
                placeholder="Search labor items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreateLabor')}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Labor Items List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {filteredLaborItems.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="time-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? 'No labor items found' : 'No labor items yet'}
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Add your first labor item to get started'
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => navigation.navigate('CreateLabor')}
                className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
              >
                <Text className="text-white font-semibold">Add Labor Item</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredLaborItems.map((item) => (
              <LaborCard key={item.id} item={item} />
            ))}
            <View className="h-4" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default LaborScreen;