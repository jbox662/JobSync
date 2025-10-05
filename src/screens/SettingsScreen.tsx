import React, { useState } from 'react';
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
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(settings.defaultPaymentTerms || 'Net 30 days');
  const [defaultValidityDays, setDefaultValidityDays] = useState(settings.defaultValidityDays?.toString() || '30');
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  
  const getCurrentUserId = () => {
    return authenticatedUser?.id || currentUserId || 'none';
  };
  
  const handleFullSync = async () => {
    setShowSyncOptions(false);
    setLastSyncResult(null);
    try {
      await appSyncService.manualFullSync();
      setLastSyncResult('Full sync completed successfully');
    } catch (error) {
      setLastSyncResult(`Full sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSyncOptions = () => {
    setShowSyncOptions(true);
  };

  const handleSave = () => {
    const taxRate = parseFloat(defaultTaxRate);
    const validityDays = parseInt(defaultValidityDays);
    
    if (enableTax && (isNaN(taxRate) || taxRate < 0 || taxRate > 100)) {
      console.log('Error: Please enter a valid tax rate between 0 and 100');
      return;
    }
    
    if (isNaN(validityDays) || validityDays < 1) {
      console.log('Error: Please enter a valid number of days for quote validity');
      return;
    }

    updateSettings({
      enableTax,
      defaultTaxRate: enableTax ? taxRate : 0,
      businessName: businessName.trim() || undefined,
      businessEmail: businessEmail.trim() || undefined,
      businessPhone: businessPhone.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
      defaultPaymentTerms: defaultPaymentTerms.trim(),
      defaultValidityDays: validityDays
    });

    console.log('Settings saved successfully!');
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
    setDefaultPaymentTerms(newSettings.defaultPaymentTerms || 'Net 30 days');
    setDefaultValidityDays(newSettings.defaultValidityDays?.toString() || '30');
    console.log('Settings Reset: All settings have been reset to defaults.');
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
        className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
        placeholderTextColor="#9CA3AF"
        textAlignVertical={multiline ? "top" : "center"}
        returnKeyType="done"
        blurOnSubmit={false}
        autoCorrect={false}
        autoCapitalize="none"
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
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          className="flex-1 px-4" 
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
              onChangeText={setDefaultTaxRate}
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
            onChangeText={setBusinessName}
            placeholder="Your Business Name"
          />
          
          <InputField
            label="Business Email"
            value={businessEmail}
            onChangeText={setBusinessEmail}
            placeholder="business@example.com"
            keyboardType="email-address"
          />
          
          <InputField
            label="Business Phone"
            value={businessPhone}
            onChangeText={setBusinessPhone}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
          
          <InputField
            label="Business Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="123 Main Street, City, State 12345"
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
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-base">Workspace Sync</Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Sync your data with {workspaceName || 'your workspace'}
                  </Text>
                </View>
                <Pressable
                  onPress={handleSyncOptions}
                  disabled={isSyncing}
                  className={`flex-row items-center px-3 py-2 rounded-lg ${
                    isSyncing ? 'bg-gray-100' : 'bg-blue-500'
                  }`}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <Ionicons name="options-outline" size={16} color="white" />
                  )}
                  <Text className={`ml-2 font-medium text-sm ${
                    isSyncing ? 'text-gray-500' : 'text-white'
                  }`}>
                    {isSyncing ? 'Syncing...' : 'Sync Options'}
                  </Text>
                </Pressable>
              </View>
              
              <View className="bg-gray-50 rounded-lg p-3 space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 text-sm">Last Sync:</Text>
                  <Text className="text-gray-900 text-sm">
                    {lastSyncByUser?.[getCurrentUserId()] 
                      ? new Date(lastSyncByUser[getCurrentUserId()]!).toLocaleString()
                      : 'Never'
                    }
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 text-sm">Pending Changes:</Text>
                  <Text className="text-gray-900 text-sm font-medium">
                    {outboxByUser?.[getCurrentUserId()]?.length || 0}
                  </Text>
                </View>
                
                {(syncError || lastSyncResult) && (
                  <View className={`mt-2 p-2 rounded-lg ${
                    syncError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                  }`}>
                    <Text className={`text-sm ${
                      syncError ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {syncError || lastSyncResult}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </SettingCard>
        )}

        {/* Data Management */}
        <SettingCard title="Data Management">
          <Pressable
            onPress={handleReset}
            className="flex-row items-center p-3 rounded-lg bg-red-50 border border-red-200 mb-3"
          >
            <Ionicons name="refresh-outline" size={20} color="#DC2626" />
            <View className="ml-3 flex-1">
              <Text className="text-red-800 font-medium">Reset to Defaults</Text>
              <Text className="text-red-600 text-sm mt-1">
                Reset all settings to their default values
              </Text>
            </View>
          </Pressable>

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

        {/* Data Management */}
        <SettingCard title="Data Management">
          <Pressable
            onPress={() => navigation.navigate('ImportExport' as never)}
            className="flex-row items-center p-4 bg-white rounded-lg border border-gray-200 mb-3"
          >
            <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="download-outline" size={20} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium text-base">Import & Export</Text>
              <Text className="text-gray-600 text-sm">Backup and restore your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        </SettingCard>

        {/* App Information */}
        <SettingCard title="About">
          <View className="items-center py-4">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="briefcase" size={32} color="#3B82F6" />
            </View>
            <Text className="text-gray-900 font-semibold text-lg">Job Manager</Text>
            <Text className="text-gray-600 text-sm">Professional Edition v1.0</Text>
            <Text className="text-gray-500 text-xs mt-2">
              Last updated: {new Date(settings.updatedAt).toLocaleDateString()}
            </Text>
          </View>
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

      {/* Sync Options Modal */}
      <Modal
        visible={showSyncOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSyncOptions(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Sync Options</Text>
              <Pressable
                onPress={() => setShowSyncOptions(false)}
                className="p-1"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <Text className="text-gray-600 text-sm mb-4">
              Sync all your data with {workspaceName || 'your workspace'}.
            </Text>

            <Pressable
              onPress={handleFullSync}
              disabled={isSyncing}
              className={`flex-row items-center p-3 rounded-lg ${
                isSyncing ? 'bg-gray-100' : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <Ionicons 
                name={isSyncing ? "hourglass-outline" : "refresh-outline"} 
                size={20} 
                color={isSyncing ? "#6B7280" : "#3B82F6"} 
              />
              <View className="ml-3 flex-1">
                <Text className={`font-medium ${
                  isSyncing ? 'text-gray-500' : 'text-blue-800'
                }`}>
                  {isSyncing ? 'Syncing...' : 'Full Sync'}
                </Text>
                <Text className={`text-sm ${
                  isSyncing ? 'text-gray-400' : 'text-blue-600'
                }`}>
                  {isSyncing ? 'Please wait...' : 'Download all data from server'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SettingsScreen;