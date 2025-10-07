import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppNavigator } from "./src/navigation/AppNavigator";
import CreateBusinessScreen from "./src/screens/CreateBusinessScreen";
import JoinBusinessScreen from "./src/screens/JoinBusinessScreen";
import OnboardingChoiceScreen from "./src/screens/OnboardingChoiceScreen";
// import AccountSwitchScreen from "./src/screens/AccountSwitchScreen";
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useJobStore } from "./src/state/store";
import { authService } from "./src/services/auth";
import { appSyncService } from "./src/services/appSync";

// Global function to force app remount
let forceAppRemount: (() => void) | null = null;

export const triggerAppRemount = () => {
  if (forceAppRemount) {
    forceAppRemount();
  } else {
    console.warn('App remount function not available');
  }
};

export default function App() {
  const syncNow = useJobStore((s) => s.syncNow);
  const workspaceId = useJobStore((s) => s.workspaceId);
  const isAuthenticated = useJobStore((s) => s.isAuthenticated);
  const authenticatedUser = useJobStore((s) => s.authenticatedUser);
  const setAuthenticatedUser = useJobStore((s) => s.setAuthenticatedUser);
  const clearAuthentication = useJobStore((s) => s.clearAuthentication);
  const syncError = useJobStore ((s) => s.syncError);
  
  const [isLoading, setIsLoading] = useState(true);
  const [forceRender, setForceRender] = useState(0);
  const [appKey, setAppKey] = useState(0);

  // Set up global remount function
  useEffect(() => {
    forceAppRemount = () => {
      console.log('🔄 Forcing complete app remount');
      setAppKey(prev => prev + 1);
    };
    
    return () => {
      forceAppRemount = null;
    };
  }, []);

  // Debug: Log when authentication state changes
  useEffect(() => {
    console.log('🔄 App state changed:', {
      isAuthenticated,
      workspaceId,
      isLoading,
      forceRender
    });
  }, [isAuthenticated, workspaceId, isLoading, forceRender]);

  // Additional effect to handle authentication state changes
  useEffect(() => {
    console.log('🔄 Authentication effect triggered:', {
      isAuthenticated,
      workspaceId,
      authenticatedUserWorkspaceId: authenticatedUser?.workspaceId,
      hasWorkspace: workspaceId || authenticatedUser?.workspaceId
    });
  }, [isAuthenticated, workspaceId, authenticatedUser?.workspaceId]);

  // Polling mechanism to ensure we catch state changes (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = useJobStore.getState();
      const currentHasWorkspace = currentState.workspaceId || currentState.authenticatedUser?.workspaceId;
      const currentIsAuthenticated = currentState.isAuthenticated;
      
      // Check if state has changed from what React thinks it is
      if (currentIsAuthenticated !== isAuthenticated || 
          currentHasWorkspace !== (workspaceId || authenticatedUser?.workspaceId)) {
        console.log('🔄 Polling detected state change, forcing re-render');
        setForceRender(prev => prev + 1);
      }
    }, 500); // Check every 500ms
    
    return () => clearInterval(interval);
  }, [isAuthenticated, workspaceId, authenticatedUser?.workspaceId]);

  // Force re-render when authentication state changes (development mode fix)
  useEffect(() => {
    const unsubscribe = useJobStore.subscribe(
      (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        workspaceId: state.workspaceId,
        authenticatedUser: state.authenticatedUser 
      }),
      (newState, prevState) => {
        console.log('🔄 Zustand state change detected:', { newState, prevState });
        
        if (newState.isAuthenticated !== prevState.isAuthenticated || 
            newState.workspaceId !== prevState.workspaceId ||
            newState.authenticatedUser?.workspaceId !== prevState.authenticatedUser?.workspaceId) {
          console.log('🔄 Authentication state changed, forcing re-render');
          setForceRender(prev => prev + 1);
        }
      }
    );
    
    return unsubscribe;
  }, []);

  // Removed problematic migration that was interfering with authentication flow

  // Check for existing authentication on app start with robust error handling
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication state...');
        console.log('Current store state:', { 
          isAuthenticated: useJobStore.getState().isAuthenticated,
          workspaceId: useJobStore.getState().workspaceId,
          authenticatedUser: useJobStore.getState().authenticatedUser?.email
        });
        
        const user = await authService.getCurrentUser();
        
        if (user) {
          console.log('✅ Valid user session found:', user.email);
          console.log('User workspace info:', { 
            workspaceId: user.workspaceId, 
            workspaceName: user.workspaceName 
          });
          setAuthenticatedUser(user);
          
          // Force full sync on app start
          if (user.id && user.workspaceId) {
            const currentState = useJobStore.getState();
            useJobStore.setState({
              lastSyncByUser: {
                ...currentState.lastSyncByUser,
                [user.id]: null  // Force full sync
              }
            });
            // Trigger sync after a small delay to ensure store is ready
            setTimeout(() => {
              syncNow();
            }, 100);
          }
        } else {
          console.log('❌ No valid user session, clearing authentication state');
          // No user found, ensure we're in unauthenticated state
          clearAuthentication();
        }
      } catch (error: any) {
        console.warn('🚨 Auth check failed:', error);
        
        // Handle specific authentication errors
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('refresh_token') ||
            error.message?.includes('Refresh Token Not Found') ||
            error.message?.includes('JWT') ||
            error.message?.includes('token')) {
          console.log('🔄 Token-related error detected, clearing all authentication state');
          
          // Clear authentication state via auth service (which also clears Supabase session)
          try {
            await authService.clearStaleSession();
          } catch (clearError) {
            console.log('Note: Error clearing stale session (likely already cleared)');
            clearAuthentication(); // Fallback to clear app state
          }
        } else {
          console.log('🧹 General authentication error, clearing app state');
          clearAuthentication();
        }
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

  // Initialize automatic sync service
  useEffect(() => {
    if (isAuthenticated && workspaceId) {
      appSyncService.initialize();
    }
    
    return () => {
      appSyncService.cleanup();
    };
  }, [isAuthenticated, workspaceId]);

  // Force full sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated && workspaceId) {
        console.log('📱 App became active - triggering full sync');
        const currentUserId = useJobStore.getState().authenticatedUser?.id || useJobStore.getState().currentUserId;
        if (currentUserId) {
          const currentState = useJobStore.getState();
          useJobStore.setState({
            lastSyncByUser: {
              ...currentState.lastSyncByUser,
              [currentUserId]: null  // Force full sync
            }
          });
          syncNow();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, workspaceId, syncNow]);

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
    console.log('🔐 Showing authentication screens - not authenticated');
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            {/* @ts-ignore */}
            <AuthStack.Screen name="SignIn" component={SignInScreen} />
            {/* @ts-ignore */}
            <AuthStack.Screen name="SignUp" component={SignUpScreen} />
            {/* @ts-ignore */}
            <AuthStack.Screen name="JoinBusiness" component={JoinBusinessScreen} />
          </AuthStack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if authenticated but no workspace
  const hasWorkspace = workspaceId || authenticatedUser?.workspaceId;
  const needsOnboarding = isAuthenticated && !hasWorkspace;
  console.log('🔐 Authentication state:', { 
    isAuthenticated, 
    workspaceId, 
    authenticatedUserWorkspaceId: authenticatedUser?.workspaceId,
    hasWorkspace,
    needsOnboarding,
    authenticatedUser: authenticatedUser?.email,
    forceRender
  });
  
  if (needsOnboarding) {
    console.log('🏢 Showing onboarding screens - authenticated but no workspace');
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <OnbStack.Navigator screenOptions={{ headerShown: false }}>
            {/* @ts-ignore */}
            <OnbStack.Screen name="OnboardingChoice" component={OnboardingChoiceScreen} />
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
    <SafeAreaProvider key={`app-${appKey}`}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
