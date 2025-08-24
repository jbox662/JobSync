import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobStore } from '../state/store';

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
