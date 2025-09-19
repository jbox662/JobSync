# Reset App Data Guide

If you're experiencing issues with "user already registered" errors after deleting Supabase database rows, this guide will help you clear all local app data.

## Problem
The app stores data locally using AsyncStorage via Zustand persistence. Even after deleting data from your Supabase database, the app may still show authentication errors because local data persists.

## Solution: Clear All Local Data

### Method 1: Settings Screen (Recommended)
1. Navigate to the Settings screen in the app
2. Scroll to the "Data Management" section
3. Tap "Clear All Data"
4. The app will reset and show sign-up screens

### Method 2: Developer Reset (Quick)
1. Go to the sign-in screen
2. Tap the "Welcome Back" title 7 times quickly
3. The app will automatically reset all data

## What Gets Cleared
- ✅ All authentication state (`isAuthenticated`, `authenticatedUser`, etc.)
- ✅ All business data (customers, jobs, quotes, invoices, parts, labor)
- ✅ All user profiles and workspace information
- ✅ All AsyncStorage keys (including Supabase config)
- ✅ All sync data and outbox queues
- ✅ All app settings (reset to defaults)

## After Reset
- The app will show the sign-up/sign-in screens
- You can create a new account or sign in with existing credentials
- You can generate sample data from the dashboard
- All previous local data will be gone

## Technical Details
- Uses `AsyncStorage.clear()` to remove all stored data
- Resets Zustand store to initial state
- Preserves environment-based Supabase configuration
- Generates new device ID and user IDs

## Testing the Reset
1. Generate some sample data in the app
2. Use either reset method above
3. Verify the app shows sign-up screens
4. Check that no old data remains in the dashboard

This reset functionality is particularly useful for:
- Development and testing
- Fixing authentication sync issues
- Starting fresh after Supabase database changes
- Resolving "user already registered" errors