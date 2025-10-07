import React from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';
import { useJobStore } from '../state/store';

const OnboardingChoiceScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const clearAuthentication = useJobStore((s) => s.clearAuthentication);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will take you back to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              clearAuthentication();
              // App.tsx will automatically detect the state change and show login screen
            } catch (error) {
              console.error('Sign out error:', error);
              // Force clear even if sign out fails
              clearAuthentication();
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Sign Out Button */}
      <View className="absolute top-4 right-4 z-10" style={{ paddingTop: insets.top }}>
        <Pressable
          onPress={handleSignOut}
          className="bg-red-500 rounded-lg px-4 py-2 shadow-sm"
        >
          <Text className="text-white font-medium text-sm">Sign Out</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Header */}
        <View className="items-center mb-8 mt-8">
          <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="people" size={40} color="#2563EB" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
            Join Your Team
          </Text>
          <Text className="text-gray-600 text-center text-lg">
            You need to join an existing business workspace to continue
          </Text>
        </View>

        {/* Join Business Option */}
        <Pressable
          onPress={() => navigation.navigate('JoinBusiness' as never)}
          className="bg-blue-600 rounded-xl p-6 shadow-sm mb-6"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-blue-500 rounded-lg items-center justify-center mr-4">
              <Ionicons name="people" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-xl">Join Business Workspace</Text>
              <Text className="text-blue-100 text-sm">Connect to your team's workspace</Text>
            </View>
          </View>
          <Text className="text-blue-100 text-sm">
            Have an invite code? Join your team's existing workspace and start collaborating right away.
          </Text>
        </Pressable>

        {/* Info Card */}
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#F59E0B" className="mr-3 mt-1" />
            <View className="flex-1">
              <Text className="text-amber-800 font-medium mb-1">Need to create a business?</Text>
              <Text className="text-amber-700 text-sm">
                Business owners should sign up with the "Create a new business workspace" option during registration.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-12 items-center">
          <Text className="text-gray-500 text-sm text-center">
            You can always switch between workspaces or create additional ones later
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default OnboardingChoiceScreen;
