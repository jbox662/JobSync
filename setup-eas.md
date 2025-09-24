# EAS Build Setup Guide

This guide will help you complete the EAS Build configuration for your JobSync React Native app.

## Prerequisites Completed ✅

- ✅ Updated `eas.json` with proper `appVersionSource: "remote"` configuration
- ✅ Updated `app.json` with complete app configuration including version management
- ✅ Added EAS build scripts to `package.json`
- ✅ Installed `expo-dev-client` for development builds
- ✅ Updated CLI version to latest (16.19.3)

## Next Steps (Manual Authentication Required)

### Step 1: Login to EAS
You need to authenticate with your Expo account:

```bash
npx eas-cli@latest login
```

If you don't have an Expo account, create one at: https://expo.dev/signup

### Step 2: Initialize EAS Project
After authentication, initialize the EAS project:

```bash
npx eas-cli@latest init
```

This will:
- Link your project to EAS Build servers
- Create the project in your Expo dashboard
- Configure project-specific settings

### Step 3: Configure Build Credentials

#### For iOS (if building for iOS):
```bash
npx eas-cli@latest credentials
```
- Select iOS platform
- Choose "Set up new credentials" 
- EAS will guide you through Apple Developer account linking

#### For Android:
```bash
npx eas-cli@latest credentials
```
- Select Android platform
- Choose "Generate new keystore" for new apps
- EAS will create and manage your keystore securely

### Step 4: Set Up Version Management
Since we configured remote version management, sync your current versions:

```bash
npx eas-cli@latest build:version:set
```
- Select the platform (iOS/Android/All)
- When prompted about remote version source, select "Yes"
- Enter your current version number (currently 1.0.0)

### Step 5: Test Build Configuration
Validate your configuration:

```bash
npx eas-cli@latest build:configure
```

### Step 6: Run Your First Build

#### Development Build (Recommended for testing):
```bash
npm run build:dev
```
This creates a development build with expo-dev-client for testing.

#### Production Build:
```bash
npm run build:production
```
This creates a production build for app store submission.

## Build Profiles Configured

### 🛠️ Development Profile
- **Purpose**: Testing and development
- **Features**: 
  - Includes expo-dev-client
  - iOS simulator builds
  - APK builds for Android
  - Internal distribution

### 🔍 Preview Profile  
- **Purpose**: Internal testing and QA
- **Features**:
  - Internal distribution
  - APK builds for easier sharing

### 🚀 Production Profile
- **Purpose**: App store submission
- **Features**:
  - Automatic version incrementing
  - Store distribution format
  - Optimized builds

## Environment Variables (Optional)

If your app needs environment variables for builds, create a `.env.production` file or configure them in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "SUPABASE_URL": "your-production-url",
        "SUPABASE_ANON_KEY": "your-production-key"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues:

1. **Authentication timeout**: Try `eas login` again
2. **Project not found**: Ensure `eas init` completed successfully
3. **Version conflicts**: Use `eas build:version:sync` to synchronize
4. **Credential issues**: Run `eas credentials` to reconfigure

### Build Commands Reference:

```bash
# Check authentication
npx eas-cli@latest whoami

# List builds
npx eas-cli@latest build:list

# Check project info
npx eas-cli@latest project:info

# Configure credentials
npx eas-cli@latest credentials

# Build commands
npm run build:dev        # Development build
npm run build:preview    # Preview build  
npm run build:production # Production build
npm run build:android    # Android only
npm run build:ios        # iOS only

# Version management
npm run version:set      # Set remote version
npm run version:sync     # Sync local with remote

# Submission (after successful build)
npm run submit:android   # Submit to Google Play
npm run submit:ios       # Submit to Apple App Store
```

## What's Been Fixed

1. **✅ EAS Project Configuration**: Added proper `appVersionSource: "remote"` to prevent manual version management errors
2. **✅ App Version Management**: Configured automatic build number incrementing for production builds
3. **✅ Build Profiles**: Set up development, preview, and production profiles with appropriate settings
4. **✅ Platform Support**: Configured both iOS and Android with proper bundle identifiers and permissions
5. **✅ Development Setup**: Added expo-dev-client for faster development iteration
6. **✅ CLI Version**: Updated to latest EAS CLI version (16.19.3)
7. **✅ Build Scripts**: Added comprehensive npm scripts for all build scenarios

## Next Steps After Setup

1. Run `eas login` to authenticate
2. Run `eas init` to initialize the project
3. Configure credentials with `eas credentials`
4. Run your first development build: `npm run build:dev`
5. Test the build on your device/simulator
6. When ready for production, run: `npm run build:production`

Your app is now properly configured for EAS Build! 🎉