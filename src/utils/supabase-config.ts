/**
 * Utilities for validating and managing Supabase configuration
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a URL is a proper Supabase project URL
 */
export const isValidSupabaseUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for placeholder values
  if (url.includes('your-project-id') || url.includes('placeholder')) {
    return false;
  }
  
  // Check for proper Supabase URL format
  const supabaseUrlRegex = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
  return supabaseUrlRegex.test(url);
};

/**
 * Validates if an anon key is a proper JWT token
 */
export const isValidSupabaseKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  
  // Check for placeholder values
  if (key.includes('your-supabase') || key.includes('placeholder') || key === 'your-supabase-anon-key') {
    return false;
  }
  
  // Check if it starts with eyJ (JWT format)
  if (!key.startsWith('eyJ')) {
    return false;
  }
  
  // Basic JWT structure check (3 parts separated by dots)
  const parts = key.split('.');
  return parts.length === 3;
};

/**
 * Validates complete Supabase configuration
 */
export const validateSupabaseConfig = (url?: string, key?: string): SupabaseConfig => {
  if (!url || !key) {
    return {
      url: url || '',
      anonKey: key || '',
      isValid: false,
      error: 'Missing Supabase URL or API key'
    };
  }

  if (!isValidSupabaseUrl(url)) {
    return {
      url,
      anonKey: key,
      isValid: false,
      error: 'Invalid Supabase URL format. Expected: https://your-project.supabase.co'
    };
  }

  if (!isValidSupabaseKey(key)) {
    return {
      url,
      anonKey: key,
      isValid: false,
      error: 'Invalid API key format. Expected: JWT token starting with eyJ'
    };
  }

  return {
    url,
    anonKey: key,
    isValid: true
  };
};

/**
 * Gets Supabase configuration from environment variables
 */
export const getSupabaseConfigFromEnv = (): SupabaseConfig => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  return validateSupabaseConfig(url, key);
};

/**
 * Test if Supabase connection is working
 */
export const testSupabaseConnection = async (url: string, key: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `Connection failed with status ${response.status}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error' 
    };
  }
};