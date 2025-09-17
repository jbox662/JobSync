import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';

interface SyncStatusIndicatorProps {
  onConfigurePress?: () => void;
  onLinkWorkspacePress?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onConfigurePress,
  onLinkWorkspacePress,
  showActions = true,
  compact = false
}) => {
  const isSupabaseConfigured = useJobStore((s) => s.isSupabaseConfigured);
  const supabaseConfigError = useJobStore((s) => s.supabaseConfigError);
  const workspaceId = useJobStore((s) => s.workspaceId);
  const isSyncing = useJobStore((s) => s.isSyncing);
  const syncError = useJobStore((s) => s.syncError);
  const currentUserId = useJobStore((s) => s.currentUserId);
  const lastSyncByUser = useJobStore((s) => s.lastSyncByUser);
  const lastSync = lastSyncByUser[currentUserId || ''] || null;

  // Determine current status
  const getStatus = () => {
    if (!isSupabaseConfigured) {
      return {
        level: 'warning' as const,
        title: 'Supabase Not Configured',
        message: supabaseConfigError || 'Supabase connection not set up',
        action: 'Configure Supabase',
        onAction: onConfigurePress,
        icon: 'warning-outline' as const
      };
    }

    if (!workspaceId) {
      return {
        level: 'warning' as const,
        title: 'Workspace Not Linked',
        message: 'Create or join a business workspace to sync data',
        action: 'Link Workspace',
        onAction: onLinkWorkspacePress,
        icon: 'business-outline' as const
      };
    }

    if (isSyncing) {
      return {
        level: 'info' as const,
        title: 'Syncing',
        message: 'Synchronizing data with cloud...',
        action: null,
        onAction: null,
        icon: 'sync-outline' as const
      };
    }

    if (syncError) {
      return {
        level: 'error' as const,
        title: 'Sync Failed',
        message: syncError,
        action: 'Retry Sync',
        onAction: () => useJobStore.getState().syncNow(),
        icon: 'alert-circle-outline' as const
      };
    }

    return {
      level: 'success' as const,
      title: 'Sync Active',
      message: lastSync ? `Last synced: ${lastSync}` : 'Ready to sync',
      action: null,
      onAction: null,
      icon: 'checkmark-circle-outline' as const
    };
  };

  const status = getStatus();

  const getColors = (level: string) => {
    switch (level) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-900',
          subtext: 'text-green-700',
          icon: '#059669',
          button: 'bg-green-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          subtext: 'text-amber-700',
          icon: '#d97706',
          button: 'bg-amber-600'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-900',
          subtext: 'text-red-700',
          icon: '#dc2626',
          button: 'bg-red-600'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          subtext: 'text-blue-700',
          icon: '#2563eb',
          button: 'bg-blue-600'
        };
    }
  };

  const colors = getColors(status.level);

  if (compact) {
    return (
      <View className="flex-row items-center">
        <Ionicons name={status.icon} size={16} color={colors.icon} />
        <Text className={`ml-2 text-sm font-medium ${colors.text}`}>
          {status.title}
        </Text>
        {status.action && status.onAction && showActions && (
          <Pressable onPress={status.onAction} className="ml-2">
            <Text className={`text-sm font-medium ${colors.subtext} underline`}>
              {status.action}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View className={`p-4 rounded-lg border ${colors.bg}`}>
      <View className="flex-row items-center mb-2">
        <Ionicons name={status.icon} size={20} color={colors.icon} />
        <Text className={`ml-2 font-semibold ${colors.text}`}>
          {status.title}
        </Text>
      </View>
      
      <Text className={`text-sm leading-5 ${colors.subtext} mb-3`}>
        {status.message}
      </Text>

      {status.action && status.onAction && showActions && (
        <Pressable
          onPress={status.onAction}
          className={`py-2 px-4 rounded-lg ${colors.button}`}
        >
          <Text className="text-white text-center font-medium">
            {status.action}
          </Text>
        </Pressable>
      )}
    </View>
  );
};