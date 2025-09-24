#!/usr/bin/env node

/**
 * EAS Credential Management Setup
 * Configures automatic credential management for iOS and Android builds
 */

const fs = require('fs');
const path = require('path');

// Enhanced EAS configuration with credential management
const easCredentialConfig = {
  cli: {
    version: ">=3.0.0",
    appVersionSource: "remote"
  },
  build: {
    development: {
      developmentClient: true,
      distribution: "internal",
      ios: {
        simulator: true,
        credentials: {
          provisioningProfile: "automatic",
          distributionCertificate: "automatic"
        }
      },
      android: {
        gradleCommand: ":app:assembleDebug",
        credentials: {
          keystore: "automatic"
        }
      }
    },
    preview: {
      distribution: "internal",
      ios: {
        credentials: {
          provisioningProfile: "automatic", 
          distributionCertificate: "automatic"
        }
      },
      android: {
        buildType: "apk",
        credentials: {
          keystore: "automatic"
        }
      }
    },
    production: {
      ios: {
        credentials: {
          provisioningProfile: "automatic",
          distributionCertificate: "automatic"
        }
      },
      android: {
        credentials: {
          keystore: "automatic"
        }
      }
    }
  },
  submit: {
    production: {
      ios: {
        appleId: process.env.APPLE_ID,
        ascAppId: process.env.ASC_APP_ID,
        appleTeamId: process.env.APPLE_TEAM_ID
      },
      android: {
        serviceAccountKeyPath: "./google-service-account-key.json",
        track: "production"
      }
    }
  }
};

// Update app.json with additional credential-related configurations  
const appConfigUpdates = {
  expo: {
    ios: {
      bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.yourcompany.jobmanager",
      buildNumber: "1",
      appleTeamId: process.env.APPLE_TEAM_ID,
      config: {
        usesAppleSignIn: false
      }
    },
    android: {
      package: process.env.ANDROID_PACKAGE || "com.yourcompany.jobmanager", 
      versionCode: 1,
      config: {
        googleServicesFile: "./google-services.json"
      }
    }
  }
};

// Environment template for credential management
const credentialEnvTemplate = `# EAS Credential Management
# Copy this file to .env.eas and fill in your values

# Expo Configuration
EXPO_TOKEN=your_expo_access_token_here

# iOS Configuration
APPLE_ID=your_apple_id@email.com
ASC_APP_ID=your_app_store_connect_app_id
APPLE_TEAM_ID=your_apple_team_id
IOS_BUNDLE_ID=com.yourcompany.jobmanager

# Android Configuration  
ANDROID_PACKAGE=com.yourcompany.jobmanager

# GitHub Actions (add these to repository secrets)
# EXPO_TOKEN - Your Expo access token
# APPLE_ID - Apple ID for App Store Connect
# ASC_APP_ID - App Store Connect app ID
# APPLE_TEAM_ID - Apple Developer Team ID
`;

// Credential setup instructions
const credentialInstructions = `# Credential Setup Instructions

## Automatic Credential Management

EAS Build can automatically manage your app signing credentials. This is the recommended approach as it handles certificate generation, renewal, and secure storage.

### iOS Setup

1. **Apple Developer Account**: Ensure you have an active Apple Developer account
2. **Team ID**: Find your team ID in Apple Developer portal > Membership
3. **App Store Connect**: Create your app in App Store Connect and note the App ID

### Android Setup

1. **Google Play Console**: Create your app in Google Play Console
2. **Service Account**: Create a service account key for Play Console API access
3. **Google Services**: Download google-services.json if using Firebase

### Environment Configuration

1. Copy \`.env.eas.example\` to \`.env.eas\`
2. Fill in your Apple Developer and Google Play details
3. For GitHub Actions, add the same values as repository secrets

### Manual Credential Management (Advanced)

If you prefer to manage credentials manually:

1. **iOS**: 
   - Generate distribution certificate (.p12)
   - Create provisioning profile (.mobileprovision)
   - Update credentials.json with file paths

2. **Android**:
   - Generate keystore file (.jks)
   - Update credentials.json with keystore details

### Build Commands

\`\`\`bash
# Development builds (automatic credentials)
bun run build:dev:ios
bun run build:dev:android

# Production builds (automatic credentials)  
bun run build:production:ios
bun run build:production:android

# Check credential status
npx eas credentials
\`\`\`

### Troubleshooting

- **iOS signing issues**: Verify Team ID and bundle identifier match
- **Android keystore issues**: Ensure keystore password is correct
- **Expo token issues**: Regenerate token from expo.dev/settings/access-tokens
`;

async function setupCredentials() {
  console.log('🔐 Setting up EAS credential management...');

  try {
    // Update eas.json with credential configuration
    console.log('📝 Updating eas.json with credential management...');
    fs.writeFileSync(
      path.join(process.cwd(), 'eas.json'),
      JSON.stringify(easCredentialConfig, null, 2)
    );

    // Create credential environment template
    console.log('📝 Creating credential environment template...');
    fs.writeFileSync(
      path.join(process.cwd(), '.env.eas.credentials.example'),
      credentialEnvTemplate
    );

    // Create setup instructions
    console.log('📖 Creating credential setup instructions...');
    fs.writeFileSync(
      path.join(process.cwd(), 'CREDENTIAL_SETUP.md'),
      credentialInstructions
    );

    // Update package.json with credential management scripts
    console.log('📦 Adding credential management scripts...');
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    packageJson.scripts = {
      ...packageJson.scripts,
      "credentials:check": "npx eas credentials",
      "credentials:ios": "npx eas credentials --platform ios",
      "credentials:android": "npx eas credentials --platform android",
      "credentials:clear": "npx eas credentials --clear-cache"
    };

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

    console.log('✅ Credential management setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy .env.eas.credentials.example to .env.eas');
    console.log('2. Fill in your Apple Developer and Google Play details');
    console.log('3. Run: bun run credentials:check');
    console.log('4. Test with: bun run build:dev:ios');
    console.log('\n📖 See CREDENTIAL_SETUP.md for detailed instructions');

  } catch (error) {
    console.error('❌ Error setting up credentials:', error.message);
    process.exit(1);
  }
}

// Run setup
setupCredentials();