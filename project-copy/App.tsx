import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppNavigator } from "./src/navigation/AppNavigator";
import CreateBusinessScreen from "./src/screens/CreateBusinessScreen";
import JoinBusinessScreen from "./src/screens/JoinBusinessScreen";
import AccountSwitchScreen from "./src/screens/AccountSwitchScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";

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

import React, { useEffect, useState } from "react";
import { AppState, View, Text, ActivityIndicator } from "react-native";
import { useJobStore } from "./src/state/store";
import { authService } from "./src/services/auth";

export default function App() {
  const syncNow = useJobStore((s) => s.syncNow);
  const workspaceId = useJobStore((s) => s.workspaceId);
  const isAuthenticated = useJobStore((s) => s.isAuthenticated);
  const setAuthenticatedUser = useJobStore((s) => s.setAuthenticatedUser);
  const clearAuthentication = useJobStore((s) => s.clearAuthentication);
  const syncError = useJobStore((s) => s.syncError);
  
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        
        if (user) {
          setAuthenticatedUser(user);
          // Sync is automatically triggered by setAuthenticatedUser
        } else {
          // No user found, ensure we're in unauthenticated state
          clearAuthentication();
        }
      } catch (error) {
        console.warn('Auth check failed:', error);
        // Authentication failed, clear any stale auth state
        clearAuthentication();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Monitor sync errors and clear authentication if needed
  useEffect(() => {
    if (syncError && (
      syncError.includes('No authenticated user') || 
      syncError.includes('Authentication failed') ||
      syncError.includes('Invalid session') ||
      syncError.includes('User not found')
    )) {
      console.warn('Authentication-related sync error, clearing auth state:', syncError);
      clearAuthentication();
    }
  }, [syncError, clearAuthentication]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        // Only sync if authenticated and workspace is linked
        if (isAuthenticated && workspaceId) {
          // Immediate sync when app becomes active (e.g., after refresh)
          syncNow();
        }
      }
    });
    const int = setInterval(() => {
      // Only sync if authenticated and workspace is linked
      if (isAuthenticated && workspaceId) {
        syncNow();
      }
    }, 10000); // Sync every 10 seconds for better responsiveness
    return () => {
      sub.remove();
      clearInterval(int);
    };
  }, [isAuthenticated, workspaceId]);

  const AuthStack = createNativeStackNavigator();
  const OnbStack = createNativeStackNavigator();
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Loading" component={() => (
              <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 text-gray-600">Loading...</Text>
              </View>
            )} />
          </AuthStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show authentication screens if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            {/* @ts-ignore */}
            <AuthStack.Screen name="SignIn" component={SignInScreen} />
            {/* @ts-ignore */}
            <AuthStack.Screen name="SignUp" component={SignUpScreen} />
            {/* @ts-ignore */}
            <AuthStack.Screen name="CreateBusiness" component={CreateBusinessScreen} />
            {/* @ts-ignore */}
            <AuthStack.Screen name="JoinBusiness" component={JoinBusinessScreen} />
          </AuthStack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if authenticated but no workspace
  const needsOnboarding = !workspaceId;
  if (needsOnboarding) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <OnbStack.Navigator screenOptions={{ headerShown: false }}>
            {/* @ts-ignore */}
            <OnbStack.Screen name="CreateBusiness" component={CreateBusinessScreen} />
            {/* @ts-ignore */}
            <OnbStack.Screen name="JoinBusiness" component={JoinBusinessScreen} />
          </OnbStack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show main app if authenticated and has workspace
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
