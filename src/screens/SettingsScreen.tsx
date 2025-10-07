import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { authService } from '../services/auth';
import * as Clipboard from 'expo-clipboard';

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isAuthenticated,
    workspaceName,
    authenticatedUser
  } = useJobStore();
  
  const role = authenticatedUser?.role;
  
  const [enableTax, setEnableTax] = useState(settings.enableTax);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate.toString());
  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [businessEmail, setBusinessEmail] = useState(settings.businessEmail || '');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '');
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress || '');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(settings.defaultPaymentTerms || 'Net 30 days');
  const [defaultValidityDays, setDefaultValidityDays] = useState(settings.defaultValidityDays?.toString() || '30');
  
  // Password management state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Invite code management
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoadingInviteCode, setIsLoadingInviteCode] = useState(false);

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

  // Password management handlers
  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authService.changePassword(currentPassword, newPassword);
      
      if (error) {
        Alert.alert('Error', error);
      } else {
        Alert.alert('Success', 'Password changed successfully!');
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await authService.resetPassword(resetEmail);
      
      if (error) {
        Alert.alert('Error', error);
      } else {
        Alert.alert('Success', 'Password reset email sent! Check your inbox for instructions.');
        setShowResetPassword(false);
        setResetEmail('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Invite code functions
  const loadInviteCode = async () => {
    if (role !== 'owner') return;
    
    setIsLoadingInviteCode(true);
    try {
      const result = await authService.getWorkspaceInviteCode();
      if (result.error) {
        console.error('Failed to load invite code:', result.error);
      } else {
        setInviteCode(result.inviteCode);
      }
    } catch (error) {
      console.error('Error loading invite code:', error);
    } finally {
      setIsLoadingInviteCode(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;
    
    try {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy invite code');
    }
  };

  const handleRegenerateInviteCode = () => {
    Alert.alert(
      'Regenerate Invite Code',
      'This will create a new invite code and invalidate the old one. Team members with the old code will no longer be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingInviteCode(true);
            try {
              const result = await authService.regenerateInviteCode();
              if (result.error) {
                Alert.alert('Error', result.error);
              } else {
                setInviteCode(result.inviteCode);
                Alert.alert('Success', 'New invite code generated!');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to regenerate invite code');
            } finally {
              setIsLoadingInviteCode(false);
            }
          }
        }
      ]
    );
  };

  // Load invite code for owners on component mount
  useEffect(() => {
    if (role === 'owner') {
      loadInviteCode();
    }
  }, [role]);

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

  const SettingCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) => (
    <View 
      className="bg-white rounded-xl p-4 mb-4 border border-gray-200"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center mb-4">
        {icon && (
          <View 
            className="rounded-lg p-2 mr-3"
            style={{
              backgroundColor: '#F3F4F6',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Ionicons name={icon as any} size={18} color="#374151" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">{title}</Text>
          <View className="h-0.5 bg-blue-500 rounded-full mt-1" style={{ width: 30 }} />
        </View>
      </View>
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
    icon?: string;
  }) => (
    <View className="mb-4">
      <Text className="text-gray-800 font-semibold mb-2 text-sm">{label}</Text>
      <View 
        className="flex-row items-center border border-gray-300 rounded-lg bg-gray-50"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 1,
          elevation: 1,
        }}
      >
        {icon && (
          <View className="pl-3 pr-2">
            <Ionicons name={icon as any} size={16} color="#6B7280" />
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
            flex: 1,
            paddingHorizontal: icon ? 6 : 12,
            paddingVertical: 12,
            fontSize: 15,
            color: '#111827',
            backgroundColor: 'transparent'
          }}
          placeholderTextColor="#9CA3AF"
          textAlignVertical={multiline ? "top" : "center"}
          returnKeyType="next"
          blurOnSubmit={false}
        />
      </View>
    </View>
  );

  const ToggleField = ({ 
    label, 
    value, 
    onValueChange, 
    description,
    icon
  }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    description?: string;
    icon?: string;
  }) => (
    <View 
      className="flex-row items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 mb-3"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center flex-1 mr-3">
        {icon && (
          <View className="mr-2">
            <Ionicons name={icon as any} size={16} color="#6B7280" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-sm">{label}</Text>
          {description && (
            <Text className="text-gray-600 text-xs mt-1">{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#10B981' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#E5E7EB"
        style={{
          transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }]
        }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Professional Header */}
      <View 
        style={{ 
          backgroundColor: 'white',
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View 
              className="rounded-xl p-3 mr-3"
              style={{
                backgroundColor: '#3B82F6',
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="settings-outline" size={22} color="white" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-gray-900">Settings</Text>
              <Text className="text-gray-600 text-sm">Business Configuration & Preferences</Text>
            </View>
          </View>
          <View className="bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            <Text className="text-emerald-700 font-bold text-xs tracking-wide">ENTERPRISE</Text>
          </View>
        </View>
        
        {/* Business Summary Card */}
        {businessName && (
          <View 
            className="rounded-xl p-3 border"
            style={{
              backgroundColor: '#F0F9FF',
              borderColor: '#BAE6FD',
              shadowColor: '#0EA5E9',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-500 rounded-lg p-2 mr-3">
                  <Ionicons name="business-outline" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-900 font-bold text-base">{businessName}</Text>
                  {workspaceName && (
                    <Text className="text-blue-700 text-xs mt-1">Workspace: {workspaceName}</Text>
                  )}
                </View>
              </View>
              <View className="bg-blue-500 rounded-full p-1">
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      >

        {/* Tax Settings */}
        <SettingCard title="Tax Configuration" icon="calculator-outline">
          <ToggleField
            label="Enable Tax Calculations"
            value={enableTax}
            onValueChange={setEnableTax}
            description="Automatically calculate and apply tax to quotes and invoices"
            icon="receipt-outline"
          />
          
          {enableTax && (
            <InputField
              label="Default Tax Rate (%)"
              value={defaultTaxRate}
              onChangeText={handleTaxRateChange}
              placeholder="8.25"
              keyboardType="decimal-pad"
              icon="percent-outline"
            />
          )}
        </SettingCard>

        {/* Business Information */}
        <SettingCard title="Business Information" icon="business-outline">
          <InputField
            label="Business Name"
            value={businessName}
            onChangeText={handleBusinessNameChange}
            placeholder="Your Business Name"
            icon="storefront-outline"
          />
          
          <InputField
            label="Business Email"
            value={businessEmail}
            onChangeText={handleBusinessEmailChange}
            placeholder="business@example.com"
            keyboardType="email-address"
            icon="mail-outline"
          />
          
          <InputField
            label="Business Phone"
            value={businessPhone}
            onChangeText={handleBusinessPhoneChange}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          
          <InputField
            label="Business Address"
            value={businessAddress}
            onChangeText={handleBusinessAddressChange}
            placeholder="123 Main St, City, State 12345"
            multiline={true}
            numberOfLines={3}
            icon="location-outline"
          />
        </SettingCard>

        {/* Invoice & Quote Defaults */}
        <SettingCard title="Invoice & Quote Defaults" icon="document-text-outline">
          <InputField
            label="Default Payment Terms"
            value={defaultPaymentTerms}
            onChangeText={setDefaultPaymentTerms}
            placeholder="Net 30 days"
            icon="card-outline"
          />
          
          <InputField
            label="Quote Validity (Days)"
            value={defaultValidityDays}
            onChangeText={setDefaultValidityDays}
            placeholder="30"
            keyboardType="number-pad"
            icon="calendar-outline"
          />
        </SettingCard>

        {/* Sync Settings */}
        {isAuthenticated && (
          <SettingCard title="Data Sync & Backup" icon="cloud-outline">
            <View 
              className="rounded-lg p-3 border border-emerald-200"
              style={{
                backgroundColor: '#ECFDF5',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="bg-emerald-500 rounded-full p-1 mr-2">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                  <Text className="text-emerald-900 font-bold text-sm">Real-time Cloud Sync</Text>
                </View>
                <View className="bg-emerald-200 px-2 py-1 rounded-full">
                  <Text className="text-emerald-800 font-bold text-xs">ACTIVE</Text>
                </View>
              </View>
              
              <Text className="text-emerald-700 text-xs leading-4">
                Your business data automatically syncs across all devices. Changes are saved instantly to the cloud.
              </Text>
            </View>
          </SettingCard>
        )}

        {/* Account */}
        <SettingCard title="Account & Security" icon="shield-checkmark-outline">
          {/* Change Password */}
          <Pressable
            onPress={() => setShowChangePassword(true)}
            className="flex-row items-center p-3 rounded-lg border border-blue-200 mb-3"
            style={{
              backgroundColor: '#F0F9FF',
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="bg-blue-500 rounded-lg p-2 mr-3">
              <Ionicons name="key-outline" size={16} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-blue-900 font-bold text-sm">Change Password</Text>
              <Text className="text-blue-700 text-xs">Update your account password securely</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
          </Pressable>

          {/* Reset Password */}
          <Pressable
            onPress={() => setShowResetPassword(true)}
            className="flex-row items-center p-3 rounded-lg border border-emerald-200 mb-3"
            style={{
              backgroundColor: '#ECFDF5',
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="bg-emerald-500 rounded-lg p-2 mr-3">
              <Ionicons name="mail-outline" size={16} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-emerald-900 font-bold text-sm">Reset Password</Text>
              <Text className="text-emerald-700 text-xs">Send reset email to your inbox</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#10B981" />
          </Pressable>

          {/* Invite Code (Owners Only) */}
          {role === 'owner' && (
            <View className="mb-3">
              <View className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <View className="flex-row items-center mb-2">
                  <View className="bg-purple-500 rounded-lg p-2 mr-3">
                    <Ionicons name="people-outline" size={16} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-purple-900 font-bold text-sm">Team Invite Code</Text>
                    <Text className="text-purple-700 text-xs">Share this code with team members</Text>
                  </View>
                </View>
                
                {isLoadingInviteCode ? (
                  <View className="bg-gray-100 rounded-lg p-3 items-center">
                    <Text className="text-gray-500 text-sm">Loading...</Text>
                  </View>
                ) : inviteCode ? (
                  <View>
                    <View className="bg-white border border-purple-200 rounded-lg p-3 mb-2">
                      <Text className="text-purple-900 font-bold text-lg text-center tracking-wider">
                        {inviteCode}
                      </Text>
                    </View>
                    <View className="flex-row space-x-2">
                      <Pressable
                        onPress={handleCopyInviteCode}
                        className="flex-1 bg-purple-500 rounded-lg py-2 items-center"
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="copy-outline" size={14} color="white" />
                          <Text className="text-white font-bold text-xs ml-1">Copy</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={handleRegenerateInviteCode}
                        className="flex-1 bg-purple-600 rounded-lg py-2 items-center"
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="refresh-outline" size={14} color="white" />
                          <Text className="text-white font-bold text-xs ml-1">New Code</Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={loadInviteCode}
                    className="bg-purple-500 rounded-lg py-2 items-center"
                  >
                    <Text className="text-white font-bold text-sm">Load Invite Code</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Sign Out */}
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center p-3 rounded-lg border border-red-200"
            style={{
              backgroundColor: '#FEF2F2',
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="bg-red-500 rounded-lg p-2 mr-3">
              <Ionicons name="log-out-outline" size={16} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-red-900 font-bold text-sm">Sign Out</Text>
              <Text className="text-red-700 text-xs">Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#EF4444" />
          </Pressable>
        </SettingCard>
      </ScrollView>

      {/* Save Button */}
      <View 
        className="bg-white px-4 py-4 border-t border-gray-200"
        style={{ 
          paddingBottom: insets.bottom + 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Pressable
          onPress={handleSave}
          className="rounded-xl py-4 items-center"
          style={{
            backgroundColor: '#3B82F6',
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">Save Settings</Text>
          </View>
        </Pressable>
        
        {/* Reset Button */}
        <Pressable
          onPress={handleReset}
          className="rounded-xl py-3 items-center mt-2 border border-gray-300"
          style={{
            backgroundColor: '#F9FAFB',
          }}
        >
          <View className="flex-row items-center">
            <Ionicons name="refresh-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 font-semibold text-sm ml-2">Reset to Defaults</Text>
          </View>
        </Pressable>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-white px-4 py-4 border-b border-gray-200" style={{ paddingTop: insets.top + 16 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">Change Password</Text>
                <Pressable
                  onPress={() => setShowChangePassword(false)}
                  className="p-2 rounded-full bg-gray-100"
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            <ScrollView className="flex-1 px-4 py-6">
              {/* Current Password */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Current Password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password (min 6 characters)"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Confirm New Password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your new password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Info */}
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle-outline" size={20} color="#3B82F6" className="mr-2" />
                  <Text className="text-blue-700 text-sm flex-1 ml-2">
                    Your password must be at least 6 characters long. Choose a strong password to keep your account secure.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="bg-white px-4 py-4 border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
              <Pressable
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                className={`rounded-xl py-4 items-center mb-3 ${
                  isChangingPassword ? 'bg-gray-400' : 'bg-blue-600'
                }`}
              >
                <Text className="text-white font-semibold text-base">
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setShowChangePassword(false)}
                className="rounded-xl py-4 items-center bg-gray-100"
              >
                <Text className="text-gray-700 font-semibold text-base">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={showResetPassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResetPassword(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-white px-4 py-4 border-b border-gray-200" style={{ paddingTop: insets.top + 16 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">Reset Password</Text>
                <Pressable
                  onPress={() => setShowResetPassword(false)}
                  className="p-2 rounded-full bg-gray-100"
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            <ScrollView className="flex-1 px-4 py-6">
              {/* Email */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Email Address</Text>
                <TextInput
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Info */}
              <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <View className="flex-row items-start">
                  <Ionicons name="mail-outline" size={20} color="#059669" className="mr-2" />
                  <Text className="text-green-700 text-sm flex-1 ml-2">
                    We'll send you an email with instructions to reset your password. Check your inbox and follow the link provided.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="bg-white px-4 py-4 border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
              <Pressable
                onPress={handleResetPassword}
                disabled={isResettingPassword}
                className={`rounded-xl py-4 items-center mb-3 ${
                  isResettingPassword ? 'bg-gray-400' : 'bg-green-600'
                }`}
              >
                <Text className="text-white font-semibold text-base">
                  {isResettingPassword ? 'Sending Email...' : 'Send Reset Email'}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setShowResetPassword(false)}
                className="rounded-xl py-4 items-center bg-gray-100"
              >
                <Text className="text-gray-700 font-semibold text-base">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default SettingsScreen;