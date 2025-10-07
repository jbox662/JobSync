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
        (item.name || item.description).toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => (a.name || a.description).localeCompare(b.name || b.description));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTotalValue = () => {
    return filteredLaborItems.reduce((sum, item) => sum + item.hourlyRate, 0);
  };

  const LaborCard = ({ item }: { item: any }) => {
    return (
      <Pressable 
        onPress={() => navigation.navigate('LaborDetail', { laborId: item.id })}
        className="bg-white rounded-xl p-5 mb-4 shadow-lg border border-gray-100 active:scale-98 transition-transform"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Header with Icon and Name */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-start flex-1">
            <View className="bg-blue-100 rounded-full p-2 mr-3">
              <Ionicons name="hammer-outline" size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-lg" numberOfLines={2}>
                {item.name || item.description}
              </Text>
              {item.name && item.description && (
                <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
          <View className="bg-green-50 px-3 py-1 rounded-full ml-2">
            <Text className="text-green-700 font-bold text-sm">
              {formatCurrency(item.hourlyRate)}
            </Text>
          </View>
        </View>

        {/* Rate and Category Row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1 font-medium">
              {formatCurrency(item.hourlyRate)}/hour
            </Text>
          </View>
          
          {item.category && (
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-blue-700 text-xs font-semibold uppercase tracking-wide">
                {item.category}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron indicator */}
        <View className="absolute right-4 top-1/2 -translate-y-2">
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Enhanced Header */}
      <View className="bg-white border-b border-gray-200">
        {/* Title Section */}
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">Labor Services</Text>
              <Text className="text-gray-600 text-sm mt-1">
                {filteredLaborItems.length} service{filteredLaborItems.length !== 1 ? 's' : ''} available
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('CreateLabor')}
              className="bg-blue-600 rounded-xl px-4 py-3 shadow-lg active:scale-95"
              style={{
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold ml-1">Add</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Stats Cards */}
        {filteredLaborItems.length > 0 && (
          <View className="px-4 pb-4">
            <View className="flex-row space-x-3">
              <View className="flex-1 bg-blue-50 rounded-xl p-3">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 rounded-full p-1 mr-2">
                    <Ionicons name="hammer-outline" size={16} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-900 font-bold text-lg">
                      {filteredLaborItems.length}
                    </Text>
                    <Text className="text-blue-700 text-xs font-medium">
                      Services
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="flex-1 bg-green-50 rounded-xl p-3">
                <View className="flex-row items-center">
                  <View className="bg-green-100 rounded-full p-1 mr-2">
                    <Ionicons name="cash-outline" size={16} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-green-900 font-bold text-sm" numberOfLines={1} adjustsFontSizeToFit>
                      {formatCurrency(getTotalValue())}
                    </Text>
                    <Text className="text-green-700 text-xs font-medium">
                      Total Value
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View className="px-4 pb-4">
          <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <View className="flex-row items-center">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                placeholder="Search labor services..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-gray-900 text-base"
                placeholderTextColor="#9CA3AF"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Labor Items List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {filteredLaborItems.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <View className="bg-gray-100 rounded-full p-6 mb-4">
              <Ionicons name="hammer-outline" size={48} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 text-xl font-bold mb-2">
              {searchQuery ? 'No services found' : 'No labor services yet'}
            </Text>
            <Text className="text-gray-500 text-base text-center mb-6 px-8">
              {searchQuery 
                ? 'Try adjusting your search terms or check the spelling'
                : 'Create your first labor service to track hourly rates and categories'
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => navigation.navigate('CreateLabor')}
                className="bg-blue-600 rounded-xl px-8 py-4 shadow-lg active:scale-95"
                style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white font-bold ml-2">Create Labor Service</Text>
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {filteredLaborItems.map((item) => (
              <LaborCard key={item.id} item={item} />
            ))}
            <View className="h-6" />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default LaborScreen;