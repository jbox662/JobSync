#!/usr/bin/env node

/**
 * EAS Project Initialization Script
 * 
 * This script initializes your EAS Build project without requiring terminal access.
 * Run this after setting up your .env.eas file with your EXPO_TOKEN.
 * 
 * Usage: node initialize-eas-project.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.eas
function loadEnvironment() {
  const envPath = path.join(__dirname, '.env.eas');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.eas file not found!');
    console.log('Please copy .env.eas.example to .env.eas and add your EXPO_TOKEN');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

// Execute EAS CLI commands with proper error handling
function runEASCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`Running: ${command}`);
  
  try {
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1'
      }
    });
    
    console.log('✅ Success!');
    if (output.trim()) {
      console.log(output);
    }
    return true;
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }
    return false;
  }
}

// Check if EAS CLI is available
function checkEASCLI() {
  console.log('🔍 Checking EAS CLI availability...');
  
  try {
    const version = execSync('npx eas-cli@latest --version', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log(`✅ EAS CLI found: ${version.trim()}`);
    return true;
  } catch (error) {
    console.log('❌ EAS CLI not available');
    return false;
  }
}

// Validate environment setup
function validateEnvironment() {
  console.log('🔍 Validating environment setup...');
  
  if (!process.env.EXPO_TOKEN) {
    console.log('❌ EXPO_TOKEN not found in .env.eas');
    console.log('Please add your Expo access token to .env.eas');
    return false;
  }
  
  if (process.env.EXPO_TOKEN === 'your_expo_access_token_here') {
    console.log('❌ EXPO_TOKEN not configured properly');
    console.log('Please replace the example token with your actual token');
    return false;
  }
  
  console.log('✅ Environment validation passed');
  return true;
}

// Check authentication with Expo
function checkAuthentication() {
  console.log('🔍 Checking Expo authentication...');
  
  const result = runEASCommand('npx eas-cli@latest whoami', 'Checking authentication');
  
  if (result) {
    console.log('✅ Successfully authenticated with Expo');
    return true;
  } else {
    console.log('❌ Authentication failed');
    console.log('Please check your EXPO_TOKEN in .env.eas');
    return false;
  }
}

// Initialize EAS project
function initializeProject() {
  console.log('🚀 Initializing EAS project...');
  
  // Check if already initialized
  if (fs.existsSync('./app.json') || fs.existsSync('./app.config.js')) {
    const appConfig = fs.existsSync('./app.json') 
      ? JSON.parse(fs.readFileSync('./app.json', 'utf8'))
      : null;
    
    if (appConfig?.expo?.extra?.eas?.projectId) {
      console.log('✅ EAS project already initialized');
      console.log(`Project ID: ${appConfig.expo.extra.eas.projectId}`);
      return true;
    }
  }
  
  // Run eas init
  return runEASCommand(
    'npx eas-cli@latest init --non-interactive', 
    'Initializing EAS project'
  );
}

// Set up version management
function setupVersionManagement() {
  console.log('🔢 Setting up version management...');
  
  // Check current configuration
  const easConfig = JSON.parse(fs.readFileSync('./eas.json', 'utf8'));
  
  if (easConfig.cli?.appVersionSource === 'remote') {
    console.log('✅ Remote version management already configured');
    
    // Try to sync versions
    const syncResult = runEASCommand(
      'npx eas-cli@latest build:version:sync --non-interactive',
      'Syncing version management'
    );
    
    if (!syncResult) {
      // If sync fails, try to set initial version
      runEASCommand(
        'npx eas-cli@latest build:version:set --non-interactive',
        'Setting initial version'
      );
    }
    
    return true;
  } else {
    console.log('⚠️  Remote version management not configured in eas.json');
    return false;
  }
}

// Configure build credentials
function setupCredentials() {
  console.log('🔐 Setting up build credentials...');
  
  // For now, we'll let EAS handle this during the first build
  // The user can run: npx eas-cli@latest credentials
  console.log('ℹ️  Credentials will be set up during first build');
  console.log('To manually configure: npx eas-cli@latest credentials');
  return true;
}

// Main initialization process
async function main() {
  console.log('🚀 EAS Project Initialization\n');
  console.log('This script will initialize your BizFlow app for EAS Build');
  console.log('=' * 60);
  
  // Step 1: Load environment
  loadEnvironment();
  
  // Step 2: Check EAS CLI
  if (!checkEASCLI()) {
    process.exit(1);
  }
  
  // Step 3: Validate environment
  if (!validateEnvironment()) {
    process.exit(1);
  }
  
  // Step 4: Check authentication
  if (!checkAuthentication()) {
    process.exit(1);
  }
  
  // Step 5: Initialize project
  if (!initializeProject()) {
    console.log('❌ Project initialization failed');
    process.exit(1);
  }
  
  // Step 6: Set up version management
  setupVersionManagement();
  
  // Step 7: Set up credentials
  setupCredentials();
  
  console.log('\n' + '=' * 60);
  console.log('🎉 EAS Project Initialization Complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run your first build: npm run build:dev');
  console.log('2. Configure credentials if needed: npx eas-cli@latest credentials');
  console.log('3. Set up GitHub Actions for automated builds');
  console.log('');
  console.log('Your project is ready for EAS Build! 🚀');
  console.log('=' * 60);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  });
}