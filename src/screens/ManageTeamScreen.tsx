import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobStore } from "../state/store";

const ManageTeamScreen = () => {
  const insets = useSafeAreaInsets();
  const listMembers = useJobStore((s) => s.listWorkspaceMembers);
  const inviteMembers = useJobStore((s) => s.inviteMembers);
  const [members, setMembers] = useState<Array<{ email: string; role: string; createdAt: string }>>([]);
  const [emails, setEmails] = useState("");
  const [invites, setInvites] = useState<Array<{ email: string; inviteCode: string }>>([]);

  const load = async () => { const m = await listMembers(); setMembers(m); };
  useEffect(() => { load(); }, []);

  const onInvite = async () => {
    const list = emails.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) return;
    const res = await inviteMembers(list);
    setInvites(res);
    setEmails("");
    await load();
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Team</Text>
        <Text className="text-gray-600 mb-4">Invite teammates by email. Share codes if email delivery is not configured.</Text>

        <Text className="text-gray-700 font-medium mb-2">Add teammates (comma or space separated)</Text>
        <TextInput value={emails} onChangeText={setEmails} placeholder="a@example.com, b@example.com" autoCapitalize="none" className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white" placeholderTextColor="#9CA3AF" />
        <Pressable onPress={onInvite} className="mt-3 bg-blue-600 rounded-lg py-3 items-center">
          <Text className="text-white font-medium">Invite</Text>
        </Pressable>

        {invites.length > 0 && (
          <View className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Text className="text-gray-900 font-semibold mb-2">Invite Codes</Text>
            {invites.map((i) => (
              <Text key={i.email} className="text-blue-700">{i.email}: {i.inviteCode}</Text>
            ))}
          </View>
        )}

        <View className="mt-6">
          <Text className="text-gray-900 font-semibold mb-2">Members</Text>
          {members.length === 0 ? (
            <Text className="text-gray-500">No members yet</Text>
          ) : (
            members.map((m) => (
              <View key={m.email} className="flex-row justify-between items-center border-b border-gray-200 py-3">
                <Text className="text-gray-900">{m.email}</Text>
                <Text className="text-gray-600">{m.role}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ManageTeamScreen;
