import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useJobStore } from '../state/store';

type RouteProps = {
  key: string;
  name: 'EditCustomer';
  params: { customerId: string };
};

const EditCustomerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { customerId } = route.params;
  const { updateCustomer, getCustomerById } = useJobStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('United States');

  useEffect(() => {
    const customer = getCustomerById(customerId);
    if (customer) {
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setCompany(customer.company || '');
      
      // Parse existing address into components
      if (customer.address) {
        const addressParts = customer.address.split(', ');
        if (addressParts.length >= 1) setStreetAddress(addressParts[0] || '');
        if (addressParts.length >= 2) setCity(addressParts[1] || '');
        if (addressParts.length >= 3) setState(addressParts[2] || '');
        if (addressParts.length >= 4) setZipCode(addressParts[3] || '');
        if (addressParts.length >= 5) setCountry(addressParts[4] || 'United States');
      }
    }
  }, [customerId, getCustomerById]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a customer name');
      return;
    }

    // Build formatted address string
    const addressParts = [];
    if (streetAddress.trim()) addressParts.push(streetAddress.trim());
    if (city.trim()) addressParts.push(city.trim());
    if (state.trim()) addressParts.push(state.trim());
    if (zipCode.trim()) addressParts.push(zipCode.trim());
    if (country.trim() && country.trim() !== 'United States') addressParts.push(country.trim());
    
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    updateCustomer(customerId, {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      address: fullAddress,
    });

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter customer name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Company</Text>
          <TextInput
            value={company}
            onChangeText={setCompany}
            placeholder="Enter company name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Address Section */}
        <View className="mb-4">
          <Text className="text-gray-700 font-semibold text-lg mb-3">Address</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Street Address</Text>
            <TextInput
              value={streetAddress}
              onChangeText={setStreetAddress}
              placeholder="123 Main Street"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 font-medium mb-2">State/Province</Text>
              <TextInput
                value={state}
                onChangeText={setState}
                placeholder="State"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-700 font-medium mb-2">ZIP/Postal Code</Text>
              <TextInput
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="12345"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Country</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="United States"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-200">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-lg py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">Save Changes</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default EditCustomerScreen;
