import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useJobStore } from "../state/store";
import { isSupabaseAvailable, supabase } from "../api/supabase";

const JoinBusinessScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const acceptBusinessInvite = useJobStore((s) => s.acceptBusinessInvite);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'invite' | 'details'>('invite');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateInviteCode = async () => {
    console.log('Validating invite code:', { email: email.trim(), code: code.trim() });
    setError(null);
    setLoading(true);
    
    // Validate inputs
    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }
    
    if (!code.trim()) {
      setError("Please enter the invite code");
      setLoading(false);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
    
    try {
      console.log('Checking invite code validity...');
      
      // Handle demo mode
      if (!isSupabaseAvailable() || !supabase) {
        console.log('Using demo mode - invite code valid');
        setLoading(false);
        setStep('details');
        return;
      }
      
      // Check if invite code exists in database
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name, invite_code')
        .eq('invite_code', code.trim())
        .single();

      if (workspaceError || !workspace) {
        setError("Invalid invite code. Please check with the business owner.");
        setLoading(false);
        return;
      }
      
      console.log('Invite code valid, moving to details step');
      setLoading(false);
      setStep('details');
      
    } catch (error) {
      console.error("Error validating invite code:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      // Try to sign in with a dummy password to check if user exists
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'dummy-password-check'
      });
      
      // If we get a user but wrong password, user exists
      if (data.user && error?.message?.includes('password')) {
        console.log('User exists - password error detected');
        return true;
      }
      
      // If we get a specific "user not found" error, user doesn't exist
      if (error?.message?.includes('Invalid login credentials') || 
          error?.message?.includes('user not found') ||
          error?.message?.includes('not found')) {
        console.log('User does not exist - invalid credentials');
        return false;
      }
      
      // If we get any other error, assume user might exist
      if (error) {
        console.log('Auth error during user check:', error.message);
        return true; // Assume user exists to be safe
      }
      
      // If no error and no user, user doesn't exist
      return false;
    } catch (error) {
      console.log('Error checking user existence:', error);
      return false;
    }
  };

  const completeJoin = async () => {
    console.log('Completing join process with:', { name: name.trim(), email: email.trim(), password: '***' });
    setError(null);
    setLoading(true);
    
    // Validate inputs
    if (!name.trim()) {
      setError("Please enter your full name");
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    
    try {
      console.log('Creating user account and joining business...');
      
      // Handle demo mode
      if (!isSupabaseAvailable() || !supabase) {
        console.log('Using demo mode - account created');
        const store = useJobStore.getState();
        store.workspaceId = `demo-workspace-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        store.role = "member";
        store.userEmail = email.trim();
        setLoading(false);
        Alert.alert('Success', 'Successfully joined the business!', [
          { text: 'OK', onPress: () => {
            // The app will automatically navigate to main app due to authentication state change
            console.log('Join successful - app will navigate automatically');
          }}
        ]);
        return;
      }

      // Check if user already exists
      console.log('Checking if user already exists...');
      try {
        const userExists = await checkUserExists(email.trim().toLowerCase());
        if (userExists) {
          setError('An account with this email already exists. Please try signing in instead.');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Error checking user existence, proceeding with registration:', error);
        // Continue with registration attempt
      }
      
      // Create user account
      console.log('Attempting to create user account for:', email.trim().toLowerCase());
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            full_name: name.trim()
          }
        }
      });

      console.log('Auth signup result:', { 
        user: authData.user ? 'User created' : 'No user', 
        error: authError ? authError.message : 'No error',
        session: authData.session ? 'Session created' : 'No session'
      });

      if (authError) {
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        });
        
        // Handle specific error cases
        if (authError.message.includes('already') || 
            authError.message.includes('exist') ||
            authError.message.includes('registered') ||
            authError.message.includes('user_already_exists') ||
            authError.status === 422) {
          setError('An account with this email already exists. Please try signing in instead.');
        } else {
          setError(`Registration failed: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Find workspace by invite code
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('invite_code', code.trim())
        .single();

      if (workspaceError || !workspace) {
        setError("Invalid invite code. Please check with the business owner.");
        setLoading(false);
        return;
      }

      // Add user as workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          email: email.trim().toLowerCase(),
          role: 'member',
          device_id: useJobStore.getState().deviceId
        });

      if (memberError) {
        setError("Failed to join workspace. Please try again.");
        setLoading(false);
        return;
      }

      console.log('Join successful, updating authentication state...');
      
      // Update authentication state immediately
      const store = useJobStore.getState();
      store.setAuthenticatedUser({
        id: authData.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'member',
        workspaceId: workspace.id,
        workspaceName: workspace.name
      });
      
      setLoading(false);
      
      // Show success message
      Alert.alert(
        'Success!', 
        'Account created! Welcome to ' + (workspace.name || 'the business') + '!',
        [{ 
          text: 'OK',
          onPress: () => {
            // The authentication state is already set
            // The app should automatically navigate due to the state change
            // If it doesn't work, the user can manually restart the app
            console.log('Authentication complete - app should navigate automatically');
          }
        }]
      );
      
    } catch (error) {
      console.error("Error completing join:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Join Business</Text>
        
        {step === 'invite' ? (
          <>
            <Text className="text-gray-600 mb-6">Enter your email and the invite code from the business owner.</Text>

            <Text className="text-gray-700 font-medium mb-2">Email</Text>
            <TextInput 
              value={email} 
              onChangeText={setEmail} 
              placeholder="you@example.com" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-4" 
              placeholderTextColor="#9CA3AF" 
            />

            <Text className="text-gray-700 font-medium mb-2">Invite Code</Text>
            <TextInput 
              value={code} 
              onChangeText={setCode} 
              placeholder="INV-XXXXXX" 
              autoCapitalize="characters" 
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-6" 
              placeholderTextColor="#9CA3AF" 
            />

            {error && <Text className="text-red-600 mb-3">{error}</Text>}

            <Pressable 
              onPress={() => {
                console.log('Validate invite code button pressed!');
                validateInviteCode();
              }} 
              disabled={loading}
              className={`${loading ? 'bg-gray-400' : 'bg-blue-600'} rounded-lg py-4 items-center`}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? 'Checking...' : 'Check Invite Code'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-gray-600 mb-6">Create your account to join the business.</Text>

            <Text className="text-gray-700 font-medium mb-2">Full Name</Text>
            <TextInput 
              value={name} 
              onChangeText={setName} 
              placeholder="John Doe" 
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white mb-4" 
              placeholderTextColor="#9CA3AF" 
            />

            <Text className="text-gray-700 font-medium mb-2">Email</Text>
            <TextInput 
              value={email} 
              editable={false}
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-500 bg-gray-100 mb-4" 
              placeholderTextColor="#9CA3AF" 
            />

            <Text className="text-gray-700 font-medium mb-2">Password</Text>
            <View className="relative mb-4">
              <TextInput 
                value={password} 
                onChangeText={setPassword} 
                placeholder="Create a password" 
                secureTextEntry={!showPassword}
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white pr-12" 
                placeholderTextColor="#9CA3AF" 
              />
              <Pressable 
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                <Text className="text-gray-500 text-sm">
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Text className="text-gray-700 font-medium mb-2">Confirm Password</Text>
            <View className="relative mb-6">
              <TextInput 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                placeholder="Confirm your password" 
                secureTextEntry={!showConfirmPassword}
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white pr-12" 
                placeholderTextColor="#9CA3AF" 
              />
              <Pressable 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3"
              >
                <Text className="text-gray-500 text-sm">
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            {error && <Text className="text-red-600 mb-3">{error}</Text>}

            <Pressable 
              onPress={() => {
                console.log('Complete join button pressed!');
                completeJoin();
              }} 
              disabled={loading}
              className={`${loading ? 'bg-gray-400' : 'bg-green-600'} rounded-lg py-4 items-center mb-4`}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? 'Creating Account...' : 'Join Business'}
              </Text>
            </Pressable>

            <Pressable 
              onPress={() => {
                setStep('invite');
                setError(null);
              }} 
              className="py-2 items-center"
            >
              <Text className="text-gray-600 text-sm">← Back to invite code</Text>
            </Pressable>
          </>
        )}
        
        {!isSupabaseAvailable() && (
          <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="text-blue-800 text-sm font-medium mb-1">Demo Mode Active</Text>
            <Text className="text-blue-700 text-sm">
              Try any invite code like: DEMO123, TEST-CODE, or INV-SAMPLE
            </Text>
          </View>
        )}
        
        {!isSupabaseAvailable() && (
          <Pressable 
            onPress={() => {
              setEmail("demo@example.com");
              setCode("DEMO123");
            }}
            className="mt-2 py-2 px-4 bg-gray-100 rounded-lg"
          >
            <Text className="text-gray-600 text-center text-sm">Fill Demo Data</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default JoinBusinessScreen;
