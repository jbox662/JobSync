import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppNavigator } from "./src/navigation/AppNavigator";
import CreateBusinessScreen from "./src/screens/CreateBusinessScreen";
import JoinBusinessScreen from "./src/screens/JoinBusinessScreen";
import AccountSwitchScreen from "./src/screens/AccountSwitchScreen";

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
  const syncConfig = useJobStore((s) => s.syncConfig);
  const workspaceId = useJobStore((s) => s.workspaceId);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        if (workspaceId && syncConfig) syncNow();
      }
    });
    const int = setInterval(() => {
      if (workspaceId && syncConfig) syncNow();
    }, 30000);
    return () => {
      sub.remove();
      clearInterval(int);
    };
  }, [workspaceId, syncConfig]);

  const OnbStack = createNativeStackNavigator();
  const needsOnboarding = !workspaceId;
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {needsOnboarding ? (
          <OnbStack.Navigator>
            {/* @ts-ignore */}
            <OnbStack.Screen name="CreateBusiness" component={CreateBusinessScreen} options={{ title: 'Create Business' }} />
            {/* @ts-ignore */}
            <OnbStack.Screen name="JoinBusiness" component={JoinBusinessScreen} options={{ title: 'Join Business' }} />
          </OnbStack.Navigator>
        ) : (
          <AppNavigator />
        )}
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
