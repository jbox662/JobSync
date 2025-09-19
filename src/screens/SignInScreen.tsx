import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';
import { useJobStore } from '../state/store';

const SignInScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  
  const { resetAllData } = useJobStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.signIn({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (result.error) {
        Alert.alert('Sign In Failed', result.error);
      } else {
        // Navigation will be handled by App.tsx based on authentication state
        console.log('Sign in successful');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address first');
      return;
    }

    const result = await authService.resetPassword(email.trim().toLowerCase());
    if (result.error) {
      Alert.alert('Reset Failed', result.error);
    } else {
      Alert.alert('Reset Email Sent', 'Check your email for password reset instructions');
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-6 pt-8">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-600 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="briefcase" size={40} color="white" />
          </View>
          <Pressable
            onPress={() => {
              const newTapCount = tapCount + 1;
              setTapCount(newTapCount);
              
              if (newTapCount === 7) {
                // Developer reset - tap title 7 times
                resetAllData();
                console.log('Developer reset activated - all data cleared');
                setTapCount(0);
              } else if (newTapCount >= 3) {
                console.log(`Tap ${4 - newTapCount} more times to reset all data`);
              }
              
              // Reset counter after 3 seconds
              setTimeout(() => setTapCount(0), 3000);
            }}
          >
            <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</Text>
          </Pressable>
          <Text className="text-gray-600 text-center">
            Sign in to your business account
          </Text>
        </View>

        {/* Sign In Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 font-medium mb-2">Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="border border-gray-300 rounded-xl px-4 py-4 text-gray-900 text-lg"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-2">Password</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                className="border border-gray-300 rounded-xl px-4 py-4 pr-12 text-gray-900 text-lg"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6B7280" 
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleForgotPassword}
            className="self-end mt-2"
          >
            <Text className="text-blue-600 font-medium">Forgot Password?</Text>
          </Pressable>
        </View>

        {/* Sign In Button */}
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          className={`mt-8 rounded-xl py-4 items-center ${
            loading ? 'bg-gray-400' : 'bg-blue-600'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </Pressable>

        {/* Sign Up Link */}
        <View className="flex-row items-center justify-center mt-8">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('SignUp' as never)}>
            <Text className="text-blue-600 font-semibold">Sign Up</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View className="flex-row items-center my-8">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-gray-500">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Business Options */}
        <View className="space-y-3">
          <Pressable
            onPress={() => navigation.navigate('CreateBusiness' as never)}
            className="border border-gray-300 rounded-xl py-4 items-center"
          >
            <View className="flex-row items-center">
              <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-700 font-medium">Create New Business</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('JoinBusiness' as never)}
            className="border border-gray-300 rounded-xl py-4 items-center"
          >
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-700 font-medium">Join Existing Business</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default SignInScreen;
