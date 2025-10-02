import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';

interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'detailed';
  showButton?: boolean;
  onSyncPress?: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  variant = 'compact',
  showButton = true,
  onSyncPress
}) => {
  const {
    isSyncing,
    syncError,
    isAuthenticated,
    workspaceId,
    workspaceName,
    lastSyncByUser,
    outboxByUser,
    authenticatedUser,
    currentUserId,
    syncNow
  } = useJobStore();

  const getCurrentUserId = () => {
    return authenticatedUser?.id || currentUserId || 'none';
  };

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      await syncNow();
    }
  };

  // Don't show if not authenticated or no workspace
  if (!isAuthenticated || !workspaceId) {
    return (
      <View className="flex-row items-center px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
        <Ionicons name="warning-outline" size={16} color="#D97706" />
        <Text className="ml-2 text-yellow-700 text-sm font-medium">
          Sync not configured
        </Text>
      </View>
    );
  }

  const lastSync = lastSyncByUser?.[getCurrentUserId()];
  const pendingChanges = outboxByUser?.[getCurrentUserId()]?.length || 0;

  if (variant === 'compact') {
    return (
      <View className="flex-row items-center">
        {/* Status Indicator */}
        <View className={`flex-row items-center px-2 py-1 rounded-full ${
          syncError ? 'bg-red-100' : 
          isSyncing ? 'bg-blue-100' : 
          pendingChanges > 0 ? 'bg-yellow-100' : 'bg-green-100'
        }`}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons 
              name={
                syncError ? 'alert-circle' : 
                pendingChanges > 0 ? 'sync-outline' : 'checkmark-circle'
              } 
              size={14} 
              color={
                syncError ? '#DC2626' : 
                pendingChanges > 0 ? '#D97706' : '#059669'
              } 
            />
          )}
          <Text className={`ml-1 text-xs font-medium ${
            syncError ? 'text-red-700' : 
            isSyncing ? 'text-blue-700' : 
            pendingChanges > 0 ? 'text-yellow-700' : 'text-green-700'
          }`}>
            {isSyncing ? 'Syncing' : 
             syncError ? 'Error' : 
             pendingChanges > 0 ? `${pendingChanges} pending` : 'Synced'}
          </Text>
        </View>

        {/* Sync Button */}
        {showButton && !isSyncing && (
          <Pressable
            onPress={handleSyncPress}
            className="ml-2 p-1 rounded-full bg-blue-50"
          >
            <Ionicons name="sync-outline" size={16} color="#3B82F6" />
          </Pressable>
        )}
      </View>
    );
  }

  // Detailed variant
  return (
    <View className="bg-white rounded-lg p-3 border border-gray-200">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-900 font-medium">Sync Status</Text>
        {showButton && (
          <Pressable
            onPress={handleSyncPress}
            disabled={isSyncing}
            className={`flex-row items-center px-3 py-1 rounded-lg ${
              isSyncing ? 'bg-gray-100' : 'bg-blue-500'
            }`}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name="sync-outline" size={14} color="white" />
            )}
            <Text className={`ml-1 text-sm font-medium ${
              isSyncing ? 'text-gray-500' : 'text-white'
            }`}>
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="space-y-1">
        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Workspace:</Text>
          <Text className="text-gray-900 text-sm font-medium">
            {workspaceName || 'Connected'}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Last Sync:</Text>
          <Text className="text-gray-900 text-sm">
            {lastSync 
              ? new Date(lastSync).toLocaleTimeString()
              : 'Never'
            }
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Pending:</Text>
          <Text className="text-gray-900 text-sm font-medium">
            {pendingChanges} changes
          </Text>
        </View>

        {syncError && (
          <View className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
            <Text className="text-red-700 text-sm">{syncError}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default SyncStatusIndicator;
