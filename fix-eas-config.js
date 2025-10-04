#!/usr/bin/env node

/**
 * Fix EAS Configuration Script
 * 
 * This script restores the correct eas.json configuration if it gets overwritten
 * by Vibecode or other processes.
 */

const fs = require('fs');
const path = require('path');

const correctEasConfig = {
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY": "sk-proj-anielepohng9eing5Ol6Phex3oin9geg-n0tr3al",
        "EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY": "sk-ant-api03-gu2gohc4sha1Thohpeep7ro9vie1ikai-n0tr3al",
        "EXPO_PUBLIC_VIBECODE_GROK_API_KEY": "xai-ahDi8ofei1Em2chaichoac2Beehi8thu-n0tr3al",
        "EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY": "UeHoh2oot2IWe6ooW4Oofahd6waebeiw-n0tr3al",
        "EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY": "elevenlabs-api-key-oa9Shahx4Zi4oof2bei5kee9nee7eeng-n0tr3al",
        "EXPO_PUBLIC_SUPABASE_URL": "https://fyymdsvxylcnbeacwgkd.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eW1kc3Z4eWxjbmJlYWN3Z2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTkyMjMsImV4cCI6MjA2OTQ5NTIyM30.BMRmivHeekCWKkaaXW2LN7cBfLYFezerEGSj9w2fHbI"
      },
      "ios": {
        "distribution": "store"
      },
      "android": {
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {}
    }
  }
};

function fixEasConfig() {
  const easPath = path.join(__dirname, 'eas.json');
  
  try {
    // Read current eas.json
    const currentConfig = JSON.parse(fs.readFileSync(easPath, 'utf8'));
    
    // Check if it has the problematic version constraint
    if (currentConfig.cli?.version === "16.17.4" || 
        (currentConfig.cli?.version && !currentConfig.cli?.appVersionSource)) {
      
      console.log('🔧 Detected problematic EAS configuration, fixing...');
      
      // Write the correct configuration
      fs.writeFileSync(easPath, JSON.stringify(correctEasConfig, null, 2));
      
      console.log('✅ EAS configuration fixed!');
      console.log('   - Removed problematic version constraint');
      console.log('   - Added appVersionSource: remote for robot users');
      console.log('   - Restored Android build configuration');
      
      return true;
    } else {
      console.log('✅ EAS configuration is already correct');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error fixing EAS configuration:', error.message);
    return false;
  }
}

// Run the fix
if (require.main === module) {
  fixEasConfig();
}

module.exports = { fixEasConfig };
