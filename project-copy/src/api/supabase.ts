import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { getSupabaseConfigFromEnv } from '../utils/supabase-config';

// Get configuration from environment
const config = getSupabaseConfigFromEnv();

// Only create client if configuration is valid
let supabaseClient: SupabaseClient<Database> | null = null;

if (config.isValid) {
  try {
    supabaseClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        storage: require('@react-native-async-storage/async-storage').default,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn('Failed to create Supabase client:', error);
    supabaseClient = null;
  }
}

// Export the client (can be null if not configured)
export const supabase = supabaseClient;

// Export configuration status
export const isSupabaseConfigured = config.isValid;
export const supabaseConfigError = config.error;

// Helper to check if Supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabaseClient !== null;
};