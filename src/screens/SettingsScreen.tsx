import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { authService } from '../services/auth';
import { appSyncService } from '../services/appSync';

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    syncNow,
    isSyncing,
    syncError,
    isAuthenticated,
    workspaceId,
    workspaceName,
    lastSyncByUser,
    outboxByUser,
    authenticatedUser,
    currentUserId
  } = useJobStore();
  
  const [enableTax, setEnableTax] = useState(settings.enableTax);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate.toString());
  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [businessEmail, setBusinessEmail] = useState(settings.businessEmail || '');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '');
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress || '');
  const [businessStreet, setBusinessStreet] = useState(settings.businessStreet || '');
  const [businessCity, setBusinessCity] = useState(settings.businessCity || '');
  const [businessState, setBusinessState] = useState(settings.businessState || '');
  const [businessZip, setBusinessZip] = useState(settings.businessZip || '');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(settings.defaultPaymentTerms || 'Net 30 days');
  const [defaultValidityDays, setDefaultValidityDays] = useState(settings.defaultValidityDays?.toString() || '30');
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);
  
  const getCurrentUserId = () => {
    return authenticatedUser?.id || currentUserId || 'none';
  };

  // Memoized handlers to prevent re-renders
  const handleBusinessNameChange = useCallback((text: string) => {
    setBusinessName(text);
  }, []);

  const handleBusinessEmailChange = useCallback((text: string) => {
    setBusinessEmail(text);
  }, []);

  const handleBusinessPhoneChange = useCallback((text: string) => {
    setBusinessPhone(text);
  }, []);

  const handleBusinessAddressChange = useCallback((text: string) => {
    setBusinessAddress(text);
  }, []);

  const handleTaxRateChange = useCallback((text: string) => {
    setDefaultTaxRate(text);
  }, []);
  
  const handleFullSync = async () => {
    setLastSyncResult(null);
    try {
      await appSyncService.manualFullSync();
      Alert.alert('Success', 'Full sync completed successfully');
    } catch (error) {
      Alert.alert('Error', `Full sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSave = () => {
    const taxRate = parseFloat(defaultTaxRate);
    const validityDays = parseInt(defaultValidityDays);
    
    if (enableTax && (isNaN(taxRate) || taxRate < 0 || taxRate > 100)) {
      Alert.alert('Error', 'Please enter a valid tax rate between 0 and 100');
      return;
    }
    
    if (isNaN(validityDays) || validityDays < 1) {
      Alert.alert('Error', 'Please enter a valid number of days for quote validity');
      return;
    }

    try {
      updateSettings({
        enableTax,
        defaultTaxRate: enableTax ? taxRate : 0,
        businessName: businessName.trim() || undefined,
        businessEmail: businessEmail.trim() || undefined,
        businessPhone: businessPhone.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        businessStreet: businessStreet.trim() || undefined,
        businessCity: businessCity.trim() || undefined,
        businessState: businessState.trim() || undefined,
        businessZip: businessZip.trim() || undefined,
        defaultPaymentTerms: defaultPaymentTerms.trim(),
        defaultValidityDays: validityDays
      });

      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleReset = () => {
    // Reset settings without confirmation for simplicity
    resetSettings();
    const newSettings = useJobStore.getState().settings;
    setEnableTax(newSettings.enableTax);
    setDefaultTaxRate((newSettings.defaultTaxRate || 0).toString());
    setBusinessName(newSettings.businessName || '');
    setBusinessEmail(newSettings.businessEmail || '');
    setBusinessPhone(newSettings.businessPhone || '');
    setBusinessAddress(newSettings.businessAddress || '');
    setBusinessStreet(newSettings.businessStreet || '');
    setBusinessCity(newSettings.businessCity || '');
    setBusinessState(newSettings.businessState || '');
    setBusinessZip(newSettings.businessZip || '');
    setDefaultPaymentTerms(newSettings.defaultPaymentTerms || 'Net 30 days');
    setDefaultValidityDays(newSettings.defaultValidityDays?.toString() || '30');
    Alert.alert('Success', 'All settings have been reset to defaults');
  };

  const handleLogout = async () => {
    const { error } = await authService.signOut();
    if (error) {
      console.error('Logout failed:', error);
    }
    // Navigation to login screen is handled automatically by App.tsx
  };

  const SettingCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <Text className="text-lg font-semibold text-gray-900 mb-4">{title}</Text>
      {children}
    </View>
  );

  const InputField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad';
    multiline?: boolean;
    numberOfLines?: number;
  }) => (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
          color: '#111827',
          backgroundColor: '#FFFFFF'
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
  );

  const ToggleField = ({ 
    label, 
    value, 
    onValueChange, 
    description 
  }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    description?: string;
  }) => (
    <View className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-gray-900 font-medium text-base">{label}</Text>
          {description && (
            <Text className="text-gray-600 text-sm mt-1">{description}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#F3F4F6', true: '#3B82F6' }}
          thumbColor={value ? '#FFFFFF' : '#9CA3AF'}
          ios_backgroundColor="#F3F4F6"
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Settings</Text>
          <Text className="text-gray-600">Configure your business preferences</Text>
        </View>

        {/* Tax Settings */}
        <SettingCard title="Tax Configuration">
          <ToggleField
            label="Enable Tax Calculations"
            value={enableTax}
            onValueChange={setEnableTax}
            description="Turn on to add tax calculations to quotes and invoices"
          />
          
          {enableTax && (
            <InputField
              label="Default Tax Rate (%)"
              value={defaultTaxRate}
              onChangeText={handleTaxRateChange}
              placeholder="8.25"
              keyboardType="decimal-pad"
            />
          )}
        </SettingCard>

        {/* Business Information */}
        <SettingCard title="Business Information">
          <InputField
            label="Business Name"
            value={businessName}
            onChangeText={handleBusinessNameChange}
            placeholder="Your Business Name"
          />
          
          <InputField
            label="Business Email"
            value={businessEmail}
            onChangeText={handleBusinessEmailChange}
            placeholder="business@example.com"
            keyboardType="email-address"
          />
          
          <InputField
            label="Business Phone"
            value={businessPhone}
            onChangeText={handleBusinessPhoneChange}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
          
          <InputField
            label="Business Address"
            value={businessAddress}
            onChangeText={handleBusinessAddressChange}
            placeholder="123 Main St, City, State 12345"
            multiline={true}
            numberOfLines={3}
          />
        </SettingCard>

        {/* Invoice & Quote Defaults */}
        <SettingCard title="Invoice & Quote Defaults">
          <InputField
            label="Default Payment Terms"
            value={defaultPaymentTerms}
            onChangeText={setDefaultPaymentTerms}
            placeholder="Net 30 days"
          />
          
          <InputField
            label="Quote Validity (Days)"
            value={defaultValidityDays}
            onChangeText={setDefaultValidityDays}
            placeholder="30"
            keyboardType="number-pad"
          />
        </SettingCard>

        {/* Sync Settings */}
        {isAuthenticated && workspaceId && (
          <SettingCard title="Sync & Backup">
            <View className="mb-4">
              {/* Sync Status */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-900 font-semibold text-base">Sync Status</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-medium text-sm">Up to date</Text>
                </View>
              </View>

              {/* Sync Now Button */}
              <Pressable
                onPress={syncNow}
                disabled={isSyncing}
                className={`flex-row items-center justify-center py-3 rounded-xl mb-3 ${
                  isSyncing ? 'bg-gray-400' : 'bg-blue-600'
                }`}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="sync-outline" size={20} color="white" />
                )}
                <Text className="text-white font-semibold text-base ml-2">
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </Pressable>

              {/* Force Full Sync Button */}
              <Pressable
                onPress={handleFullSync}
                disabled={isSyncing}
                className={`flex-row items-center justify-center py-3 rounded-xl border-2 mb-3 ${
                  isSyncing ? 'bg-gray-100 border-gray-300' : 'bg-white border-orange-500'
                }`}
              >
                <Ionicons name="refresh-circle-outline" size={20} color={isSyncing ? '#9CA3AF' : '#F97316'} />
                <Text className={`font-semibold text-base ml-2 ${
                  isSyncing ? 'text-gray-500' : 'text-orange-600'
                }`}>
                  Force Full Sync
                </Text>
              </Pressable>

              {/* Info Box */}
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle-outline" size={20} color="#3B82F6" className="mr-2" />
                  <Text className="text-blue-700 text-sm flex-1 ml-2">
                    Use "Force Full Sync" if you're seeing missing or outdated data. This clears local storage and downloads everything fresh from the server.
                  </Text>
                </View>
              </View>
            </View>
          </SettingCard>
        )}

        {/* Account */}
        <SettingCard title="Account">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center p-3 rounded-lg bg-gray-50 border border-gray-200"
          >
            <Ionicons name="log-out-outline" size={20} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-800 font-medium">Sign Out</Text>
              <Text className="text-gray-600 text-sm mt-1">
                Sign out and return to login screen
              </Text>
            </View>
          </Pressable>
        </SettingCard>
      </ScrollView>

      {/* Save Button */}
      <View className="bg-white px-4 py-4 border-t border-gray-200">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-xl py-4 items-center shadow-sm"
        >
          <Text className="text-white font-semibold text-base">Save Settings</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SettingsScreen;