import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { smartInvoiceParser } from '../services/smartInvoiceParser';

interface RouteParams {
  quote: any;
  customer: any;
}

// Move InputField OUTSIDE the component to prevent recreation
const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}) => (
  <View className="mb-6">
    <Text className="text-gray-800 font-semibold mb-3 text-base">{label}</Text>
    <View className="relative">
      {icon && (
        <View className="absolute left-4 top-1/2 z-10" style={{ transform: [{ translateY: -10 }] }}>
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          borderWidth: 2,
          borderColor: value ? '#3B82F6' : '#E5E7EB',
          borderRadius: 12,
          paddingHorizontal: icon ? 48 : 16,
          paddingVertical: 16,
          fontSize: 16,
          color: '#111827',
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          minHeight: multiline ? 80 : 52
        }}
        placeholderTextColor="#9CA3AF"
        textAlignVertical={multiline ? "top" : "center"}
        returnKeyType="next"
        blurOnSubmit={false}
        onFocus={() => console.log('TextInput focused')}
        onBlur={() => console.log('TextInput blurred')}
        onSelectionChange={() => console.log('TextInput selection changed')}
        onTextInput={() => console.log('TextInput text changed')}
      />
    </View>
  </View>
);

const SettingCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: keyof typeof Ionicons.glyphMap }) => (
  <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100" style={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  }}>
    <View className="flex-row items-center mb-6">
      {icon && (
        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Ionicons name={icon} size={20} color="#3B82F6" />
        </View>
      )}
      <Text className="text-xl font-bold text-gray-900">{title}</Text>
    </View>
    {children}
  </View>
);

const ImportPreviewScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { quote: initialQuote, customer: initialCustomer } = route.params as RouteParams;

  // Individual state variables like SettingsScreen
  const [quoteNumber, setQuoteNumber] = useState(initialQuote.quoteNumber || '');
  const [quoteTitle, setQuoteTitle] = useState(initialQuote.title || '');
  const [quoteNotes, setQuoteNotes] = useState(initialQuote.notes || '');
  const [customerName, setCustomerName] = useState(initialCustomer.name || '');
  const [customerEmail, setCustomerEmail] = useState(initialCustomer.email || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomer.phone || '');
  const [customerAddress, setCustomerAddress] = useState(initialCustomer.address || '');
  const [isImporting, setIsImporting] = useState(false);

  // Memoized handlers to prevent re-renders (like SettingsScreen)
  const handleQuoteNumberChange = useCallback((text: string) => {
    setQuoteNumber(text);
  }, []);

  const handleQuoteTitleChange = useCallback((text: string) => {
    setQuoteTitle(text);
  }, []);

  const handleQuoteNotesChange = useCallback((text: string) => {
    setQuoteNotes(text);
  }, []);

  const handleCustomerNameChange = useCallback((text: string) => {
    setCustomerName(text);
  }, []);

  const handleCustomerEmailChange = useCallback((text: string) => {
    setCustomerEmail(text);
  }, []);

  const handleCustomerPhoneChange = useCallback((text: string) => {
    setCustomerPhone(text);
  }, []);

  const handleCustomerAddressChange = useCallback((text: string) => {
    setCustomerAddress(text);
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Update the quote with edited data
      const updatedQuote = {
        ...initialQuote,
        quoteNumber,
        title: quoteTitle,
        notes: quoteNotes,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress
        }
      };

      const result = await smartInvoiceParser.importParsedQuote(updatedQuote);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Import Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import quote');
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View 
        style={{ 
          paddingTop: insets.top + 8,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2
        }}
      >
        <View className="flex-row items-center justify-between px-6 py-5">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text className="text-gray-700 font-semibold ml-2 text-sm">Cancel</Text>
          </Pressable>
          
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-gray-900">
              Review Import
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Verify details before importing
            </Text>
          </View>
          
          <Pressable
            onPress={handleImport}
            disabled={isImporting}
            className={`px-5 py-3 rounded-xl ${
              isImporting ? 'bg-gray-400' : 'bg-blue-600'
            }`}
            style={{
              shadowColor: isImporting ? '#9CA3AF' : '#3B82F6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3
            }}
          >
            <View className="flex-row items-center">
              {isImporting ? (
                <Ionicons name="hourglass-outline" size={16} color="white" />
              ) : (
                <Ionicons name="checkmark-outline" size={16} color="white" />
              )}
              <Text className="text-white font-semibold ml-2 text-sm">
                {isImporting ? 'Importing...' : 'Import'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      >
        {/* Quote Details */}
        <SettingCard title="Quote Details" icon="document-text-outline">
          <InputField
            label="Quote Number"
            value={quoteNumber}
            onChangeText={handleQuoteNumberChange}
            placeholder="Q-0001"
            icon="receipt-outline"
          />
          
          <InputField
            label="Title"
            value={quoteTitle}
            onChangeText={handleQuoteTitleChange}
            placeholder="Enter quote title"
            icon="create-outline"
          />
          
          <InputField
            label="Notes"
            value={quoteNotes}
            onChangeText={handleQuoteNotesChange}
            placeholder="Add any additional notes or details"
            multiline={true}
            numberOfLines={3}
            icon="chatbubble-outline"
          />
        </SettingCard>

        {/* Customer Information */}
        <SettingCard title="Customer Information" icon="person-outline">
          {initialCustomer.isNew && (
            <View className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-3 rounded-xl mb-6 border border-green-200">
              <View className="flex-row items-center">
                <Ionicons name="add-circle" size={18} color="#059669" />
                <Text className="text-green-700 font-semibold text-sm ml-2">New Customer</Text>
              </View>
            </View>
          )}
          
          <InputField
            label="Customer Name"
            value={customerName}
            onChangeText={handleCustomerNameChange}
            placeholder="Enter customer name"
            icon="person"
          />
          
          <InputField
            label="Email Address"
            value={customerEmail}
            onChangeText={handleCustomerEmailChange}
            placeholder="customer@example.com"
            keyboardType="email-address"
            icon="mail"
          />
          
          <InputField
            label="Phone Number"
            value={customerPhone}
            onChangeText={handleCustomerPhoneChange}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            icon="call"
          />
          
          <InputField
            label="Address"
            value={customerAddress}
            onChangeText={handleCustomerAddressChange}
            placeholder="Enter customer address"
            multiline={true}
            numberOfLines={3}
            icon="location"
          />
        </SettingCard>

        {/* Quote Summary */}
        <SettingCard title="Quote Summary" icon="calculator-outline">
          <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <View className="space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 font-medium">Subtotal:</Text>
                <Text className="font-semibold text-gray-900 text-lg">${(initialQuote.subtotal || 0).toFixed(2)}</Text>
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 font-medium">Tax:</Text>
                <Text className="font-semibold text-gray-900 text-lg">${(initialQuote.tax || 0).toFixed(2)}</Text>
              </View>
              
              <View className="border-t border-blue-200 pt-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xl font-bold text-gray-900">Total:</Text>
                  <Text className="text-2xl font-bold text-blue-600">
                    ${(initialQuote.total || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SettingCard>

        {/* Items Preview */}
        {initialQuote.items && initialQuote.items.length > 0 && (
          <SettingCard title="Line Items" icon="list-outline">
            {initialQuote.items.map((item: any, index: number) => (
              <View key={index} className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-gray-900 text-base mb-2">{item.description}</Text>
                    <View className="flex-row items-center">
                      <View className="bg-blue-100 px-2 py-1 rounded-md mr-2">
                        <Text className="text-blue-700 font-medium text-xs">Qty: {item.quantity || 1}</Text>
                      </View>
                      <Text className="text-gray-600 text-sm">
                        @ ${(item.unitPrice || 0).toFixed(2)} each
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-gray-900 text-lg">${(item.total || 0).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </SettingCard>
        )}
      </ScrollView>
    </View>
  );
};

export default ImportPreviewScreen;