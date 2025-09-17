import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobStore } from '../state/store';

const SyncSection = () => {
  const users = useJobStore((s) => s.users);
  const currentUserId = useJobStore((s) => s.currentUserId);
  const user = users.find((u) => u.id === currentUserId);
  const syncConfig = useJobStore((s) => s.syncConfig);
  const setSyncConfig = useJobStore((s) => s.setSyncConfig);
  // Business create/join moved to dedicated onboarding screens
  const syncNow = useJobStore((s) => s.syncNow);
  const isSyncing = useJobStore((s) => s.isSyncing);
  const syncError = useJobStore((s) => s.syncError);
  const lastSync = useJobStore((s) => s.lastSyncByUser[currentUserId || ''] || null);

  const [baseUrl, setBaseUrl] = useState(syncConfig?.baseUrl || '');
  const [apiKey, setApiKey] = useState(syncConfig?.apiKey || '');
  const [wsName, setWsName] = useState('');
  const [invite, setInvite] = useState('');

  return (
    <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <View className="mb-3">
        <Text className="text-gray-700">Status</Text>
        <Text className="text-gray-900 font-medium mt-1">
          {user?.remoteWorkspaceId ? `Linked to ${user.remoteWorkspaceId}` : 'Not linked'}
        </Text>
        {user?.inviteCode && (
          <Text className="text-gray-600 mt-1">Invite Code: {user.inviteCode}</Text>
        )}
        {lastSync && (
          <Text className="text-gray-500 mt-1 text-sm">Last synced: {lastSync}</Text>
        )}
        {syncError && (
          <Text className="text-red-600 mt-1">{syncError}</Text>
        )}
      </View>

      <View className="flex-row mb-3">
        <Pressable onPress={syncNow} disabled={!user?.remoteWorkspaceId || isSyncing} className={`flex-1 py-3 rounded-lg ${user?.remoteWorkspaceId ? 'bg-green-600' : 'bg-gray-300'}`}>
          <Text className="text-white font-medium text-center">{isSyncing ? 'Syncing…' : 'Sync Now'}</Text>
        </Pressable>
      </View>

      <Text className="text-gray-900 font-semibold mb-2">Supabase Configuration</Text>
      <Pressable 
        onPress={() => (navigation as any).navigate('SupabaseSetup')}
        className="py-3 rounded-lg bg-purple-600 items-center mb-4 flex-row justify-center"
      >
        <Ionicons name="settings-outline" size={20} color="white" />
        <Text className="text-white font-medium ml-2">Configure Supabase</Text>
      </Pressable>

      <Text className="text-gray-900 font-semibold mb-2">Workspace</Text>
      <View className="flex-row mb-2">
        <TextInput
          value={wsName}
          onChangeText={setWsName}
          placeholder="Workspace name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mr-2"
          placeholderTextColor="#9CA3AF"
        />
        <Pressable disabled className="px-4 rounded-lg bg-gray-400 items-center justify-center">
          <Text className="text-white font-medium">Create (use Onboarding)</Text>
        </Pressable>
      </View>
      <View className="flex-row">
        <TextInput
          value={invite}
          onChangeText={setInvite}
          placeholder="Invite code"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mr-2"
          placeholderTextColor="#9CA3AF"
        />
        <Pressable disabled className="px-4 rounded-lg bg-gray-400 items-center justify-center">
          <Text className="text-white font-medium">Join (use Onboarding)</Text>
        </Pressable>
      </View>
    </View>
  );
};

const AccountSwitchScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const users = useJobStore((s) => s.users);
  const currentUserId = useJobStore((s) => s.currentUserId);
  const createUser = useJobStore((s) => s.createUser);
  const switchUser = useJobStore((s) => s.switchUser);
  const renameUser = useJobStore((s) => s.renameUser);
  const deleteUser = useJobStore((s) => s.deleteUser);

  const [showCreate, setShowCreate] = useState(false);
  const [showRenameId, setShowRenameId] = useState<string | null>(null);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const startCreate = () => {
    setNameInput('');
    setShowCreate(true);
  };

  const confirmCreate = () => {
    const id = createUser(nameInput.trim() || 'User');
    switchUser(id);
    setShowCreate(false);
    navigation.goBack();
  };

  const startRename = (id: string, current: string) => {
    setNameInput(current);
    setShowRenameId(id);
  };

  const confirmRename = () => {
    if (showRenameId) {
      renameUser(showRenameId, nameInput.trim() || 'User');
      setShowRenameId(null);
      setNameInput('');
    }
  };

  const confirmDelete = () => {
    if (showDeleteId) {
      deleteUser(showDeleteId);
      setShowDeleteId(null);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-xl font-semibold text-gray-900">Accounts</Text>
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="close" size={24} color="#111827" />
        </Pressable>
      </View>

      {/* Create Button */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Pressable onPress={startCreate} className="bg-blue-600 rounded-lg px-4 py-3 flex-row items-center justify-center">
          <Ionicons name="person-add-outline" size={20} color="white" />
          <Text className="text-white font-medium ml-2">Add Account</Text>
        </Pressable>
      </View>

      {/* Sync Settings */}
      <View className="px-4 pt-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">Workspace Sync</Text>
        <SyncSection />
      </View>

      {/* Users List */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {users.map((u) => {
          const isActive = u.id === currentUserId;
          return (
            <View key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className={`w-4 h-4 rounded-full border-2 ${isActive ? 'bg-green-600 border-green-600' : 'border-gray-400'}`} />
                  <Text className="ml-3 text-gray-900 font-medium">{u.name}</Text>
                </View>
                <View className="flex-row items-center">
                  {!isActive && (
                    <Pressable onPress={() => { switchUser(u.id); navigation.goBack(); }} className="px-3 py-2 rounded-lg bg-green-600 mr-2">
                      <Text className="text-white font-medium">Switch</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => startRename(u.id, u.name)} className="px-3 py-2 rounded-lg bg-gray-100 mr-2">
                    <Text className="text-gray-700 font-medium">Rename</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowDeleteId(u.id)} className="px-3 py-2 rounded-lg bg-red-50">
                    <Text className="text-red-600 font-medium">Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create Modal */}
      {showCreate && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 items-center justify-center">
          <View className="w-11/12 bg-white rounded-xl p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-2">New Account</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Account name"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row mt-4">
              <Pressable onPress={() => setShowCreate(false)} className="flex-1 py-3 rounded-lg bg-gray-100 mr-2 items-center">
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmCreate} className="flex-1 py-3 rounded-lg bg-blue-600 ml-2 items-center">
                <Text className="text-white font-medium">Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Rename Modal */}
      {showRenameId && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 items-center justify-center">
          <View className="w-11/12 bg-white rounded-xl p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Rename Account</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Account name"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row mt-4">
              <Pressable onPress={() => setShowRenameId(null)} className="flex-1 py-3 rounded-lg bg-gray-100 mr-2 items-center">
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmRename} className="flex-1 py-3 rounded-lg bg-blue-600 ml-2 items-center">
                <Text className="text-white font-medium">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteId && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 items-center justify-center">
          <View className="w-11/12 bg-white rounded-xl p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Delete Account</Text>
            <Text className="text-gray-600">This will remove the account and its local data from this device.</Text>
            <View className="flex-row mt-4">
              <Pressable onPress={() => setShowDeleteId(null)} className="flex-1 py-3 rounded-lg bg-gray-100 mr-2 items-center">
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} className="flex-1 py-3 rounded-lg bg-red-600 ml-2 items-center">
                <Text className="text-white font-medium">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AccountSwitchScreen;
