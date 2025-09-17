import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SUPABASE_CONFIG_KEY = 'supabase_config';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export default function SupabaseSetupScreen({ navigation }: any) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [loading, setLoading] = useState(false);

  const loadExistingConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const config: SupabaseConfig = JSON.parse(stored);
        setUrl(config.url);
        setAnonKey(config.anonKey);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  React.useEffect(() => {
    loadExistingConfig();
  }, []);

  const saveConfig = async () => {
    if (!url || !anonKey) {
      Alert.alert('Error', 'Please fill in both URL and API key');
      return;
    }

    if (!url.includes('.supabase.co')) {
      Alert.alert('Error', 'Please enter a valid Supabase URL');
      return;
    }

    setLoading(true);
    try {
      const config: SupabaseConfig = { url, anonKey };
      await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
      
      Alert.alert(
        'Success',
        'Supabase configuration saved! Please restart the app for changes to take effect.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearConfig = async () => {
    Alert.alert(
      'Clear Configuration',
      'Are you sure you want to clear the Supabase configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(SUPABASE_CONFIG_KEY);
            setUrl('');
            setAnonKey('');
            Alert.alert('Success', 'Configuration cleared');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">Supabase Setup</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text className="ml-2 font-semibold text-blue-900">Setup Instructions</Text>
          </View>
          <Text className="text-blue-800 text-sm leading-5">
            1. Create a new Supabase project at supabase.com{'\n'}
            2. Copy your project URL and anon public key{'\n'}
            3. Run the SQL schema provided in the project root{'\n'}
            4. Enter your credentials below
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 font-medium mb-2">Supabase URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://your-project.supabase.co"
              className="bg-white border border-gray-300 rounded-lg px-4 py-3"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text className="text-gray-500 text-sm mt-1">
              Found in your Supabase project settings
            </Text>
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-2">Anonymous Key</Text>
            <TextInput
              value={anonKey}
              onChangeText={setAnonKey}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="bg-white border border-gray-300 rounded-lg px-4 py-3"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text className="text-gray-500 text-sm mt-1">
              Your anon/public key from API settings
            </Text>
          </View>

          <View className="pt-4 space-y-3">
            <Pressable
              onPress={saveConfig}
              disabled={loading}
              className={`py-4 rounded-lg ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-center font-semibold">
                {loading ? 'Saving...' : 'Save Configuration'}
              </Text>
            </Pressable>

            {(url || anonKey) && (
              <Pressable
                onPress={clearConfig}
                className="py-4 rounded-lg bg-red-100 border border-red-300"
              >
                <Text className="text-red-700 text-center font-semibold">
                  Clear Configuration
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={20} color="#d97706" />
            <Text className="ml-2 font-semibold text-yellow-900">Database Setup Required</Text>
          </View>
          <Text className="text-yellow-800 text-sm leading-5">
            Before syncing data, make sure to run the SQL schema file (supabase-schema.sql) 
            in your Supabase SQL editor to create the required tables.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}