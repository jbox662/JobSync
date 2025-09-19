import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createBusiness, setCreateBusiness] = useState(true);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (createBusiness && !businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await authService.signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        businessName: createBusiness ? businessName.trim() : undefined
      });

      if (result.error) {
        Alert.alert('Sign Up Failed', result.error);
      } else {
        Alert.alert(
          'Account Created!',
          createBusiness 
            ? 'Your account and business workspace have been created successfully.'
            : 'Your account has been created. You can now join a business workspace.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigation will be handled by App.tsx based on authentication state
                console.log('Sign up successful');
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
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
          <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
          <Text className="text-gray-600 text-center">
            Join thousands of businesses managing their work efficiently
          </Text>
        </View>

        {/* Sign Up Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 font-medium mb-2">Full Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              className="border border-gray-300 rounded-xl px-4 py-4 text-gray-900 text-lg"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-2">Email Address *</Text>
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
            <Text className="text-gray-700 font-medium mb-2">Password *</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min. 6 characters)"
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

          <View>
            <Text className="text-gray-700 font-medium mb-2">Confirm Password *</Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                className="border border-gray-300 rounded-xl px-4 py-4 pr-12 text-gray-900 text-lg"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6B7280" 
                />
              </Pressable>
            </View>
          </View>

          {/* Business Creation Toggle */}
          <View className="bg-gray-50 rounded-xl p-4 mt-6">
            <Pressable
              onPress={() => setCreateBusiness(!createBusiness)}
              className="flex-row items-center"
            >
              <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
                createBusiness ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}>
                {createBusiness && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text className="text-gray-900 font-medium">Create a new business workspace</Text>
            </Pressable>
            <Text className="text-gray-600 text-sm mt-2 ml-9">
              You'll be the owner and can invite team members
            </Text>
          </View>

          {createBusiness && (
            <View>
              <Text className="text-gray-700 font-medium mb-2">Business Name *</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter your business name"
                autoCapitalize="words"
                className="border border-gray-300 rounded-xl px-4 py-4 text-gray-900 text-lg"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
        </View>

        {/* Sign Up Button */}
        <Pressable
          onPress={handleSignUp}
          disabled={loading}
          className={`mt-8 rounded-xl py-4 items-center ${
            loading ? 'bg-gray-400' : 'bg-blue-600'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Create Account</Text>
          )}
        </Pressable>

        {/* Sign In Link */}
        <View className="flex-row items-center justify-center mt-8">
          <Text className="text-gray-600">Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('SignIn' as never)}>
            <Text className="text-blue-600 font-semibold">Sign In</Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text className="text-gray-500 text-sm text-center mt-6 leading-5">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </View>
  );
};

export default SignUpScreen;
