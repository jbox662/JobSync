import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';

const DebugScreen = () => {
  const insets = useSafeAreaInsets();
  const store = useJobStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const getCurrentUserId = () => {
    return store.authenticatedUser?.id || store.currentUserId || 'none';
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setLastRefresh(null);
    
    try {
      // Check prerequisites first
      if (!store.isAuthenticated) {
        setLastRefresh('Error: Not authenticated');
        return;
      }
      
      if (!store.workspaceId) {
        setLastRefresh('Error: No workspace ID');
        return;
      }
      
      // Try the sync
      await store.syncNow();
      setLastRefresh(`Success: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Refresh failed:', error);
      setLastRefresh(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
    >
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Debug Info</Text>

        {/* Authentication Status */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Authentication</Text>
          <View className="space-y-2">
            <Text className="text-sm">
              <Text className="font-medium">Is Authenticated:</Text> {store.isAuthenticated ? '✅ Yes' : '❌ No'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Authenticated User ID:</Text> {store.authenticatedUser?.id || 'none'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Current User ID:</Text> {store.currentUserId || 'none'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Active User ID:</Text> {getCurrentUserId()}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">User Email:</Text> {store.userEmail || 'none'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Workspace ID:</Text> {store.workspaceId || 'none'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Workspace Name:</Text> {store.workspaceName || 'none'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Supabase Configured:</Text> {store.isSupabaseConfigured ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
        </View>

        {/* Data Counts */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Current Data</Text>
          <View className="space-y-2">
            <Text className="text-sm">
              <Text className="font-medium">Customers:</Text> {store.customers?.length || 0}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Quotes:</Text> {store.quotes?.length || 0}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Invoices:</Text> {store.invoices?.length || 0}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Jobs:</Text> {store.jobs?.length || 0}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Parts:</Text> {store.parts?.length || 0}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Labor Items:</Text> {store.laborItems?.length || 0}
            </Text>
          </View>
        </View>

        {/* User Data Storage */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Data by User</Text>
          {Object.keys(store.dataByUser || {}).map((userId) => {
            const userData = store.dataByUser[userId];
            return (
              <View key={userId} className="mb-3 p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm font-medium text-gray-800 mb-2">
                  User: {userId.slice(0, 8)}...
                  {userId === getCurrentUserId() && ' (ACTIVE)'}
                </Text>
                <Text className="text-xs text-gray-600">
                  Customers: {userData?.customers?.length || 0} | 
                  Quotes: {userData?.quotes?.length || 0} | 
                  Invoices: {userData?.invoices?.length || 0} | 
                  Jobs: {userData?.jobs?.length || 0}
                </Text>
              </View>
            );
          })}
          {Object.keys(store.dataByUser || {}).length === 0 && (
            <Text className="text-sm text-gray-500">No user data stored</Text>
          )}
        </View>

        {/* Sync Status */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Sync Status</Text>
          <View className="space-y-2">
            <Text className="text-sm">
              <Text className="font-medium">Is Syncing:</Text> {store.isSyncing ? '🔄 Yes' : '✅ No'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Last Sync:</Text> {
                store.lastSyncByUser?.[getCurrentUserId()] 
                  ? new Date(store.lastSyncByUser[getCurrentUserId()]!).toLocaleString()
                  : 'Never'
              }
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Sync Error:</Text> {store.syncError || 'None'}
            </Text>
            <Text className="text-sm">
              <Text className="font-medium">Outbox Items:</Text> {
                store.outboxByUser?.[getCurrentUserId()]?.length || 0
              }
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Actions</Text>
          <Pressable
            onPress={handleRefreshData}
            disabled={isRefreshing}
            className={`flex-row items-center p-3 rounded-lg border ${
              isRefreshing 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#3B82F6" />
            )}
            <View className="ml-3 flex-1">
              <Text className={`font-medium ${isRefreshing ? 'text-gray-600' : 'text-blue-800'}`}>
                {isRefreshing ? 'Syncing...' : 'Refresh Data'}
              </Text>
              <Text className={`text-sm mt-1 ${isRefreshing ? 'text-gray-500' : 'text-blue-600'}`}>
                {isRefreshing 
                  ? 'Fetching data from Supabase...' 
                  : 'Trigger manual sync from Supabase'
                }
              </Text>
              {lastRefresh && (
                <Text className={`text-xs mt-1 ${
                  lastRefresh.startsWith('Error:') ? 'text-red-600' : 'text-green-600'
                }`}>
                  {lastRefresh.startsWith('Error:') ? lastRefresh : `Last refresh: ${lastRefresh}`}
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        <View className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <Text className="text-yellow-800 text-sm">
            💡 This screen helps debug the data sync issue. Take a screenshot before and after refreshing the app to see what changes.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default DebugScreen;
