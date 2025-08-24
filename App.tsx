import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { AppNavigator } from "./src/navigation/AppNavigator";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

import React, { useEffect } from "react";
import { AppState } from "react-native";
import { useJobStore } from "./src/state/store";

export default function App() {
  const syncNow = useJobStore((s) => s.syncNow);
  const users = useJobStore((s) => s.users);
  const currentUserId = useJobStore((s) => s.currentUserId);
  const syncConfig = useJobStore((s) => s.syncConfig);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        const u = users.find((x) => x.id === currentUserId);
        if (u?.remoteWorkspaceId && syncConfig) syncNow();
      }
    });
    const int = setInterval(() => {
      const u = users.find((x) => x.id === currentUserId);
      if (u?.remoteWorkspaceId && syncConfig) syncNow();
    }, 30000);
    return () => {
      sub.remove();
      clearInterval(int);
    };
  }, [users, currentUserId, syncConfig]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
