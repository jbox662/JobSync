import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useJobStore } from "../state/store";

const JoinBusinessScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const acceptBusinessInvite = useJobStore((s) => s.acceptBusinessInvite);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onJoin = async () => {
    setError(null);
    const ok = await acceptBusinessInvite(email.trim(), code.trim());
    if (!ok) { setError("Invalid invite or backend not configured"); return; }
    // @ts-ignore
    navigation.navigate("Main" as never);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Join Business</Text>
        <Text className="text-gray-600 mb-6">Enter your email and the invite code from the owner.</Text>

        <Text className="text-gray-700 font-medium mb-2">Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-4" placeholderTextColor="#9CA3AF" />

        <Text className="text-gray-700 font-medium mb-2">Invite Code</Text>
        <TextInput value={code} onChangeText={setCode} placeholder="INV-XXXXXX" autoCapitalize="characters" className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-6" placeholderTextColor="#9CA3AF" />

        {error && <Text className="text-red-600 mb-3">{error}</Text>}

        <Pressable onPress={onJoin} className="bg-green-600 rounded-lg py-4 items-center">
          <Text className="text-white font-semibold text-lg">Join</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default JoinBusinessScreen;
