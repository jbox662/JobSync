# EAS Build Setup - Complete Guide

## Overview

Your React Native app is now fully configured for EAS Build with automatic credential management, GitHub Actions CI/CD, and web-based build management interfaces. This setup enables building and deploying iOS/Android apps without requiring terminal access.

## 🚀 Quick Start (5 Minutes)

### 1. Create Expo Account
- Go to [expo.dev/signup](https://expo.dev/signup)
- Create account with your email

### 2. Generate Access Token
- Visit [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
- Click "Create token" 
- Name it "GitHub Actions" 
- Copy the token (starts with `eas_`)

### 3. Configure Environment
```bash
# Copy template and add your token
cp .env.eas.example .env.eas
# Edit .env.eas and paste your token
```

### 4. Initialize EAS Project
```bash
node initialize-eas-project.js
```

### 5. Setup GitHub Actions (Optional)
- Go to your GitHub repository
- Settings > Secrets and variables > Actions
- Add secret: `EXPO_TOKEN` with your token value

### 6. Test Your Setup
Open `build-trigger.html` in browser or run:
```bash
bun run build:dev:ios
```

## 📁 Files Created/Modified

### Core Configuration
- **`eas.json`** - EAS Build configuration with 3 profiles
- **`app.json`** - Enhanced with iOS/Android build settings  
- **`package.json`** - Added 15+ build/management scripts

### Environment & Security
- **`.env.eas.example`** - Template for Expo token
- **`.gitignore`** - Updated to exclude tokens/builds
- **`credentials.json`** - Credential management template

### Automation Scripts
- **`initialize-eas-project.js`** - Auto EAS project setup
- **`setup-credentials.js`** - Credential management setup
- **`validate-eas-config.js`** - Configuration validator

### GitHub Actions
- **`.github/workflows/eas-build.yml`** - Complete CI/CD pipeline

### Web Interfaces  
- **`build-trigger.html`** - Manual build triggering interface
- **`build-status.html`** - Real-time build monitoring dashboard

### Documentation
- **`CREDENTIAL_SETUP.md`** - Detailed credential instructions
- **`EAS-BUILD-SETUP-COMPLETE.md`** - This complete guide

## 🛠 Build Commands

### Development Builds
```bash
bun run build:dev:ios        # iOS development build
bun run build:dev:android    # Android development build  
bun run build:dev:all        # Both platforms
```

### Production Builds
```bash
bun run build:production:ios     # iOS App Store build
bun run build:production:android # Android Play Store build
bun run build:production:all     # Both platforms
```

### Preview Builds (Testing)
```bash
bun run build:preview:ios    # iOS internal testing
bun run build:preview:android # Android internal testing
```

### Management Commands
```bash
bun run build:status        # Check build status
bun run build:cancel        # Cancel running builds
bun run version:patch        # Increment version (1.0.0 -> 1.0.1)
bun run version:minor        # Increment version (1.0.0 -> 1.1.0)
bun run credentials:check    # View credential status
```

## 🌐 Web Interfaces

### Build Trigger Interface (`build-trigger.html`)
- **Purpose**: Manually trigger builds without terminal
- **Features**:
  - Platform selection (iOS/Android/Both)
  - Profile selection (dev/preview/production)
  - GitHub Actions integration
  - Repository configuration
- **Usage**: Open in browser, configure, click "Trigger Build"

### Build Status Dashboard (`build-status.html`)
- **Purpose**: Monitor build progress and download apps
- **Features**:
  - Real-time status updates
  - Download links for completed builds
  - QR codes for easy installation
  - Auto-refresh for in-progress builds
- **Usage**: Open in browser, enter project info, monitor builds

## ⚙️ GitHub Actions Workflow

### Triggers
- **Manual**: Use Actions tab or `build-trigger.html`
- **Automatic**: Push to main branch
- **Pull Request**: Comment `/build` to trigger

### Features
- Multi-platform builds (iOS/Android)
- Multiple profiles (dev/preview/production)
- App Store submission automation
- Build artifact management
- PR notifications with download links

### Workflow Configuration
```yaml
# Manual trigger with options
workflow_dispatch:
  inputs:
    platform:
      description: 'Platform to build'
      required: true
      default: 'all'
      type: choice
      options: [ios, android, all]
    profile:
      description: 'Build profile'
      required: true
      default: 'preview'
      type: choice
      options: [development, preview, production]
```

## 🔐 Credential Management

### Automatic (Recommended)
EAS automatically handles:
- iOS: Distribution certificates, provisioning profiles
- Android: Keystore generation and management
- Secure storage and renewal

### Manual (Advanced)
For custom credential management:
1. Run `node setup-credentials.js`
2. Follow `CREDENTIAL_SETUP.md` instructions
3. Update `credentials.json` with your files

### Required Information
- **iOS**: Apple Developer Team ID, Bundle ID
- **Android**: Package name, Google Play service account
- **Both**: App Store Connect and Play Console app IDs

## 🚨 Troubleshooting

### Common Issues

#### "EAS project not configured"
```bash
node initialize-eas-project.js
```

#### "Invalid access token"
1. Generate new token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Update `.env.eas` file
3. For GitHub: Update repository secret

#### "Build failed - credentials"
```bash
bun run credentials:check
bun run credentials:clear  # If needed
```

#### "GitHub Actions not triggering"
1. Check `EXPO_TOKEN` secret exists
2. Verify workflow file is in `.github/workflows/`
3. Check repository permissions

### Build Status Codes
- **Pending**: Build queued
- **In Progress**: Currently building  
- **Finished**: Build completed successfully
- **Errored**: Build failed (check logs)
- **Canceled**: Build was canceled

### Getting Help
- **Expo Docs**: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- **EAS Build Issues**: [github.com/expo/eas-cli/issues](https://github.com/expo/eas-cli/issues)
- **Build Logs**: Available in build status dashboard

## 📈 Version Management

### Automatic Versioning
- **Development**: Uses Git commit hash
- **Preview/Production**: Auto-increments from remote

### Manual Version Control
```bash
# Patch version (1.0.0 -> 1.0.1)
bun run version:patch

# Minor version (1.0.0 -> 1.1.0)  
bun run version:minor

# Check current version
bun run version:check
```

### Build Numbers
- **iOS**: Auto-increments buildNumber
- **Android**: Auto-increments versionCode

## 🎯 Next Steps

### 1. Test Your Setup
- Trigger a development build
- Install on your device using QR code
- Verify app functionality

### 2. Configure App Stores
- **iOS**: Create app in App Store Connect
- **Android**: Create app in Google Play Console
- Add app IDs to your environment configuration

### 3. Setup Submission
- Configure automatic app store submission
- Add store credentials to GitHub secrets
- Test production build pipeline

### 4. Team Collaboration
- Share build trigger interface with team
- Configure GitHub branch protection rules
- Setup automated testing before builds

## 🔧 Advanced Configuration

### Custom Build Hooks
Add to `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "ENVIRONMENT": "production"
      },
      "cache": {
        "disabled": false
      }
    }
  }
}
```

### Build Optimization
- **Cache**: Enabled by default for faster builds
- **Dependencies**: Only production dependencies included
- **Assets**: Automatic optimization and compression

### Multi-Environment Setup
- Development: Internal testing
- Preview: External testing/stakeholder review
- Production: App store submission

## ✅ Success Checklist

- [ ] Expo account created
- [ ] Access token generated and configured
- [ ] EAS project initialized
- [ ] Test build completed successfully
- [ ] GitHub Actions configured (if using)
- [ ] Web interfaces tested
- [ ] Credentials properly configured
- [ ] App store accounts created
- [ ] Team members have access

---

**🎉 Congratulations!** Your EAS Build setup is complete. You can now build and deploy React Native apps to iOS and Android without requiring terminal access. The web interfaces and GitHub Actions provide a complete build management system for your team.