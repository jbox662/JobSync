import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { authService } from '../services/auth';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { updateSettings } = useJobStore();
  
  // Local state - no store subscriptions
  const [enableTax, setEnableTax] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState('0');
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('Net 30 days');
  const [defaultValidityDays, setDefaultValidityDays] = useState('30');
  
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
  
  // User info state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Initialize from store and load user data on mount
  useEffect(() => {
    const initializeData = async () => {
      // Load settings
      const settings = useJobStore.getState().settings;
      setEnableTax(settings.enableTax);
      setDefaultTaxRate(settings.defaultTaxRate.toString());
      setBusinessName(settings.businessName || '');
      setBusinessEmail(settings.businessEmail || '');
      setBusinessPhone(settings.businessPhone || '');
      setBusinessAddress(settings.businessAddress || '');
      setDefaultPaymentTerms(settings.defaultPaymentTerms || 'Net 30 days');
      setDefaultValidityDays(settings.defaultValidityDays?.toString() || '30');
      
      // Load current user data
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      
      // Initialize reset email with current user email
      if (user?.email) {
        setResetEmail(user.email);
      }
    };
    
    initializeData();
  }, []);

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
    const role = useJobStore.getState().authenticatedUser?.role;
    if (role !== 'owner') return;
    
    setIsLoadingInviteCode(true);
    try {
      const { inviteCode: code, error } = await authService.getWorkspaceInviteCode();
      
      if (error) {
        console.error('Failed to load invite code:', error);
      } else if (code) {
        setInviteCode(code);
      }
    } catch (error) {
      console.error('Failed to load invite code:', error);
    } finally {
      setIsLoadingInviteCode(false);
    }
  };

  const copyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const regenerateInviteCode = async () => {
    Alert.alert(
      'Regenerate Invite Code',
      'This will create a new invite code and invalidate the current one. Team members will need the new code to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Regenerate', 
          style: 'destructive',
          onPress: async () => {
            setIsLoadingInviteCode(true);
            try {
              const { inviteCode: newCode, error } = await authService.regenerateInviteCode();
              
              if (error) {
                Alert.alert('Error', error);
              } else if (newCode) {
                setInviteCode(newCode);
                Alert.alert('Success', 'New invite code generated successfully!');
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

  const triggerSync = async () => {
    setSyncStatus('syncing');
    try {
      const { syncNow } = useJobStore.getState();
      await syncNow();
      setSyncStatus('synced');
      Alert.alert('Success', 'Data synchronized successfully!');
    } catch (error) {
      setSyncStatus('error');
      Alert.alert('Sync Error', 'Failed to synchronize data. Please try again.');
    }
  };

  const handleLogout = async () => {
    const { error } = await authService.signOut();
    if (error) {
      Alert.alert('Error', error);
    }
  };

  // Load invite code for owners on mount
  useEffect(() => {
    const role = useJobStore.getState().authenticatedUser?.role;
    if (role === 'owner') {
      loadInviteCode();
    }
  }, []);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Settings</Text>
            {currentUser && (
              <View className="flex-row items-center mt-1">
                <Text className="text-gray-600 text-sm">{currentUser.email}</Text>
                {currentUser.role && (
                  <View className="ml-2 px-2 py-1 bg-blue-100 rounded-full">
                    <Text className="text-blue-800 text-xs font-medium capitalize">{currentUser.role}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View className="bg-blue-500 rounded-full p-2">
            <Ionicons name="settings-outline" size={20} color="white" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          
          {/* Tax Settings */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Tax Configuration</Text>
            
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-gray-800 font-medium">Enable Tax Calculations</Text>
                <Text className="text-gray-600 text-sm mt-1">Automatically calculate and apply tax to quotes and invoices</Text>
              </View>
              <Switch
                value={enableTax}
                onValueChange={setEnableTax}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={enableTax ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            {enableTax && (
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Default Tax Rate (%)</Text>
                <TextInput
                  value={defaultTaxRate}
                  onChangeText={setDefaultTaxRate}
                  placeholder="8.25"
                  keyboardType="decimal-pad"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}
          </View>

          {/* Business Information */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Business Information</Text>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Business Name</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your Business Name"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Business Email</Text>
              <TextInput
                value={businessEmail}
                onChangeText={setBusinessEmail}
                placeholder="business@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Business Phone</Text>
              <TextInput
                value={businessPhone}
                onChangeText={setBusinessPhone}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Business Address</Text>
              <TextInput
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="123 Main St, City, State 12345"
                multiline={true}
                numberOfLines={2}
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Invoice & Quote Defaults */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Invoice & Quote Defaults</Text>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Default Payment Terms</Text>
              <TextInput
                value={defaultPaymentTerms}
                onChangeText={setDefaultPaymentTerms}
                placeholder="Net 30 days"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Quote Validity (Days)</Text>
              <TextInput
                value={defaultValidityDays}
                onChangeText={setDefaultValidityDays}
                placeholder="30"
                keyboardType="number-pad"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Team Management - Only for owners */}
          {currentUser?.role === 'owner' && (
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Team Management</Text>
              
              {/* Workspace Info */}
              <View className="rounded-lg p-3 border border-blue-200 mb-4" style={{ backgroundColor: '#EFF6FF' }}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-blue-900 font-bold text-base">
                    {businessName || currentUser?.workspaceName || 'Your Business'}
                  </Text>
                  <View className="bg-blue-500 rounded-full p-1">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                </View>
                {currentUser?.workspaceName && (
                  <Text className="text-blue-700 text-xs">Workspace: {currentUser.workspaceName}</Text>
                )}
              </View>
              
              {/* Invite Code Section */}
              {isLoadingInviteCode ? (
                <View className="items-center py-4">
                  <Text className="text-gray-600">Loading invite code...</Text>
                </View>
              ) : inviteCode ? (
                <View className="rounded-lg p-3 border border-green-200" style={{ backgroundColor: '#F0FDF4' }}>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-green-800 font-medium text-sm">Team Invite Code</Text>
                    <Pressable
                      onPress={regenerateInviteCode}
                      className="bg-orange-500 rounded-lg px-2 py-1"
                    >
                      <Text className="text-white text-xs font-medium">Regenerate</Text>
                    </Pressable>
                  </View>
                  
                  <View className="flex-row items-center mb-2">
                    <View className="flex-1 bg-white rounded-lg px-3 py-2 border border-green-300">
                      <Text className="text-green-900 font-mono text-sm">{inviteCode}</Text>
                    </View>
                    <Pressable
                      onPress={copyInviteCode}
                      className="ml-2 bg-green-500 rounded-lg px-3 py-2"
                    >
                      <Ionicons name="copy-outline" size={16} color="white" />
                    </Pressable>
                  </View>
                  
                  <Text className="text-green-600 text-xs">
                    Share this code with team members to invite them to your workspace
                  </Text>
                </View>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-gray-600 mb-2">No invite code available</Text>
                  <Pressable
                    onPress={loadInviteCode}
                    className="bg-blue-500 rounded-lg px-4 py-2"
                  >
                    <Text className="text-white font-medium">Load Invite Code</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Data Sync & Backup */}
          {currentUser && (
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Data Sync & Backup</Text>
              
              <View className={`rounded-lg p-3 border mb-3 ${
                syncStatus === 'synced' ? 'border-emerald-200' : 
                syncStatus === 'syncing' ? 'border-blue-200' : 'border-red-200'
              }`} style={{ 
                backgroundColor: syncStatus === 'synced' ? '#ECFDF5' : 
                               syncStatus === 'syncing' ? '#EFF6FF' : '#FEF2F2' 
              }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className={`rounded-full p-1 mr-2 ${
                      syncStatus === 'synced' ? 'bg-emerald-500' : 
                      syncStatus === 'syncing' ? 'bg-blue-500' : 'bg-red-500'
                    }`}>
                      <Ionicons 
                        name={syncStatus === 'synced' ? 'checkmark' : 
                              syncStatus === 'syncing' ? 'sync' : 'warning'} 
                        size={12} 
                        color="white" 
                      />
                    </View>
                    <Text className={`font-medium ${
                      syncStatus === 'synced' ? 'text-emerald-800' : 
                      syncStatus === 'syncing' ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {syncStatus === 'synced' ? 'Data Synchronized' : 
                       syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error'}
                    </Text>
                  </View>
                  
                  <Pressable
                    onPress={triggerSync}
                    disabled={syncStatus === 'syncing'}
                    className={`rounded-lg px-3 py-1 ${
                      syncStatus === 'syncing' ? 'bg-gray-300' : 'bg-blue-500'
                    }`}
                  >
                    <Text className="text-white text-xs font-medium">
                      {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </Pressable>
                </View>
                
                <Text className={`text-sm ${
                  syncStatus === 'synced' ? 'text-emerald-700' : 
                  syncStatus === 'syncing' ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {syncStatus === 'synced' ? 'Your data is automatically synchronized and backed up to the cloud. All changes are saved in real-time.' :
                   syncStatus === 'syncing' ? 'Synchronizing your data with the cloud...' :
                   'There was an error syncing your data. Please try again or check your connection.'}
                </Text>
              </View>
              
              {/* Last sync info */}
              <View className="flex-row items-center justify-between text-xs text-gray-500">
                <Text className="text-gray-500 text-xs">
                  Last sync: {new Date().toLocaleString()}
                </Text>
                <Text className="text-gray-500 text-xs">
                  User: {currentUser.email}
                </Text>
              </View>
            </View>
          )}

          {/* Account & Security */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Account & Security</Text>
            
            {/* Change Password */}
            <Pressable
              onPress={() => setShowChangePassword(true)}
              className="flex-row items-center justify-between p-3 rounded-lg border border-gray-200 mb-3"
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-500 rounded-lg p-2 mr-3">
                  <Ionicons name="key-outline" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-sm">Change Password</Text>
                  <Text className="text-gray-600 text-xs">Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#6B7280" />
            </Pressable>

            {/* Reset Password */}
            <Pressable
              onPress={() => setShowResetPassword(true)}
              className="flex-row items-center justify-between p-3 rounded-lg border border-gray-200 mb-3"
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-orange-500 rounded-lg p-2 mr-3">
                  <Ionicons name="mail-outline" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-sm">Reset Password</Text>
                  <Text className="text-gray-600 text-xs">Send password reset email</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#6B7280" />
            </Pressable>
            
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-between p-3 rounded-lg border border-red-200"
              style={{ backgroundColor: '#FEF2F2' }}
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-red-500 rounded-lg p-2 mr-3">
                  <Ionicons name="log-out-outline" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-900 font-bold text-sm">Sign Out</Text>
                  <Text className="text-red-700 text-xs">Sign out of your account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#EF4444" />
            </Pressable>
          </View>

          {/* App Information */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">App Information</Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Version</Text>
                <Text className="text-gray-900 font-medium">
                  {Constants.expoConfig?.version || '1.0.0'}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Build</Text>
                <Text className="text-gray-900 font-medium">
                  {Constants.expoConfig?.ios?.buildNumber || 
                   Constants.expoConfig?.android?.versionCode || 'Development'}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Platform</Text>
                <Text className="text-gray-900 font-medium capitalize">{Platform.OS}</Text>
              </View>
              
              {__DEV__ && (
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600">Environment</Text>
                  <View className="bg-orange-100 px-2 py-1 rounded">
                    <Text className="text-orange-800 text-xs font-medium">Development</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View 
        className="bg-white px-4 py-4 border-t border-gray-200"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={handleSave}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: '#3B82F6' }}
        >
          <Text className="text-white font-semibold">Save Settings</Text>
        </Pressable>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          <View className="bg-white px-4 py-4 border-b border-gray-200">
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

          <KeyboardAvoidingView 
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              className="flex-1 px-4 py-6"
              keyboardShouldPersistTaps="handled"
            >
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
            </ScrollView>

            {/* Action Buttons */}
            <View className="bg-white px-4 py-4 border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setShowChangePassword(false)}
                  className="flex-1 rounded-xl py-4 items-center border border-gray-300"
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </Pressable>
                
                <Pressable
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 rounded-xl py-4 items-center"
                  style={{ backgroundColor: isChangingPassword ? '#9CA3AF' : '#3B82F6' }}
                >
                  <Text className="text-white font-semibold">
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={showResetPassword}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          <View className="bg-white px-4 py-4 border-b border-gray-200">
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

          <KeyboardAvoidingView 
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              className="flex-1 px-4 py-6"
              keyboardShouldPersistTaps="handled"
            >
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
                <Text className="text-gray-600 text-sm mt-2">
                  We'll send you a link to reset your password
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="bg-white px-4 py-4 border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setShowResetPassword(false)}
                  className="flex-1 rounded-xl py-4 items-center border border-gray-300"
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </Pressable>
                
                <Pressable
                  onPress={handleResetPassword}
                  disabled={isResettingPassword}
                  className="flex-1 rounded-xl py-4 items-center"
                  style={{ backgroundColor: isResettingPassword ? '#9CA3AF' : '#EF4444' }}
                >
                  <Text className="text-white font-semibold">
                    {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default SettingsScreen;