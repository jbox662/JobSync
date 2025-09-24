#!/usr/bin/env node

/**
 * EAS Configuration Validation Script
 * Run this to verify your EAS Build configuration is correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating EAS Build Configuration...\n');

// Check if required files exist
const requiredFiles = {
  'eas.json': 'EAS Build configuration',
  'app.json': 'App configuration', 
  'package.json': 'Package configuration'
};

let allValid = true;

// Validate file existence
Object.entries(requiredFiles).forEach(([file, description]) => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} - ${description}`);
  } else {
    console.log(`❌ ${file} - ${description} (MISSING)`);
    allValid = false;
  }
});

console.log('');

// Validate eas.json configuration
try {
  const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  
  console.log('📋 EAS Configuration Check:');
  
  // Check CLI version
  if (easConfig.cli?.version) {
    console.log(`✅ CLI Version: ${easConfig.cli.version}`);
  } else {
    console.log('❌ CLI Version: Missing');
    allValid = false;
  }
  
  // Check appVersionSource
  if (easConfig.cli?.appVersionSource === 'remote') {
    console.log('✅ App Version Source: remote (automatic version management)');
  } else {
    console.log('❌ App Version Source: Missing or incorrect');
    allValid = false;
  }
  
  // Check build profiles
  const profiles = ['development', 'preview', 'production'];
  profiles.forEach(profile => {
    if (easConfig.build?.[profile]) {
      console.log(`✅ Build Profile: ${profile}`);
      
      if (profile === 'production' && easConfig.build[profile].autoIncrement) {
        console.log('  ✅ Auto-increment enabled for production');
      }
    } else {
      console.log(`❌ Build Profile: ${profile} (MISSING)`);
      allValid = false;
    }
  });
  
} catch (error) {
  console.log('❌ Failed to parse eas.json:', error.message);
  allValid = false;
}

console.log('');

// Validate app.json configuration
try {
  const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  console.log('📱 App Configuration Check:');
  
  const expo = appConfig.expo;
  if (!expo) {
    console.log('❌ Missing expo configuration');
    allValid = false;
    return;
  }
  
  // Check required fields
  const required = ['name', 'slug', 'version'];
  required.forEach(field => {
    if (expo[field]) {
      console.log(`✅ ${field}: ${expo[field]}`);
    } else {
      console.log(`❌ ${field}: Missing`);
      allValid = false;
    }
  });
  
  // Check platform configurations
  if (expo.ios?.bundleIdentifier) {
    console.log(`✅ iOS Bundle ID: ${expo.ios.bundleIdentifier}`);
  } else {
    console.log('❌ iOS Bundle ID: Missing');
    allValid = false;
  }
  
  if (expo.android?.package) {
    console.log(`✅ Android Package: ${expo.android.package}`);
  } else {
    console.log('❌ Android Package: Missing');
    allValid = false;
  }
  
} catch (error) {
  console.log('❌ Failed to parse app.json:', error.message);
  allValid = false;
}

console.log('');

// Validate package.json build scripts
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('📦 Package Scripts Check:');
  
  const expectedScripts = [
    'build:android',
    'build:ios', 
    'build:dev',
    'build:production',
    'version:set',
    'version:sync'
  ];
  
  expectedScripts.forEach(script => {
    if (packageJson.scripts?.[script]) {
      console.log(`✅ ${script}`);
    } else {
      console.log(`❌ ${script}: Missing`);
      allValid = false;
    }
  });
  
} catch (error) {
  console.log('❌ Failed to parse package.json:', error.message);
  allValid = false;
}

console.log('\n' + '='.repeat(50));

if (allValid) {
  console.log('🎉 Configuration validation PASSED!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npx eas-cli@latest login');
  console.log('2. Run: npx eas-cli@latest init');
  console.log('3. Run: npm run build:dev');
  console.log('');
  console.log('See setup-eas.md for detailed instructions.');
} else {
  console.log('❌ Configuration validation FAILED!');
  console.log('');
  console.log('Please fix the issues above before proceeding.');
  console.log('Refer to setup-eas.md for configuration details.');
}

console.log('='.repeat(50));