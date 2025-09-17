import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useJobStore } from "../state/store";
import { generateMockData } from "../utils/mockData";

const CreateBusinessScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const linkBusinessOwner = useJobStore((s) => s.linkBusinessOwner);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setError(null);
    const res = await linkBusinessOwner(name.trim(), email.trim());
    if (!res) { setError("Failed to create business. Check backend config."); return; }
    setInviteCode(res.inviteCode || null);
    
    // Generate mock data for demo purposes
    setTimeout(() => {
      generateMockData();
    }, 1000);
    
    // Navigate into app stack
    // @ts-ignore
    navigation.navigate("Main" as never);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Create Business</Text>
        <Text className="text-gray-600 mb-6">Create a shared workspace and invite your team by email.</Text>

        <Text className="text-gray-700 font-medium mb-2">Business Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Acme Services" className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-4" placeholderTextColor="#9CA3AF" />

        <Text className="text-gray-700 font-medium mb-2">Owner Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-6" placeholderTextColor="#9CA3AF" />

        {error && <Text className="text-red-600 mb-3">{error}</Text>}

        <Pressable onPress={onCreate} className="bg-blue-600 rounded-lg py-4 items-center">
          <Text className="text-white font-semibold text-lg">Create Workspace</Text>
        </Pressable>

        {inviteCode && (
          <View className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Text className="text-gray-900 font-medium">Invite Code</Text>
            <Text className="text-blue-700 text-xl font-bold mt-1">{inviteCode}</Text>
            <Text className="text-gray-600 mt-1">Share this with teammates so they can join.</Text>
          </View>
        )}

        <View className="mt-8 items-center">
          <Text className="text-gray-500">Already have an invite?</Text>
          <Pressable onPress={() => navigation.navigate("JoinBusiness" as never)} className="mt-2 px-4 py-2 rounded-lg bg-gray-900">
            <Text className="text-white font-medium">Join a Business</Text>
          </Pressable>
        </View>

        <View className="mt-6 items-center">
          <Text className="text-gray-400 text-sm">Want to try the demo?</Text>
          <Pressable 
            onPress={() => {
              generateMockData();
              // @ts-ignore
              navigation.navigate("Main" as never);
            }} 
            className="mt-2 px-4 py-2 rounded-lg bg-green-600"
          >
            <Text className="text-white font-medium">Try Demo with Sample Data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default CreateBusinessScreen;
