# PDF Export Setup Guide

## Issue
PDF export requires the native `expo-print` module, which needs a native build to work properly.

## Current Status
- ✅ `expo-print` package installed
- ✅ PDF export functions implemented
- ✅ CSV export works without native build
- ⚠️ PDF export will show error message in development mode

## Solution Options

### Option 1: Build with EAS (Recommended)
Use the EAS Build system that's already configured:

```bash
# Development build
bun run build:dev:ios

# Or use the build-trigger.html interface
# Open build-trigger.html in a browser and trigger an iOS development build
```

### Option 2: Local Native Build (Advanced)
If you have a Mac with Xcode:

```bash
# Rebuild native modules
npx expo prebuild --clean

# Run on iOS simulator
npx expo run:ios

# Or build for device
npx expo run:ios --device
```

### Option 3: Use CSV Export Only
CSV export works without any native build and provides all the same data in spreadsheet format.

## How PDF Export Works

When you tap "Export as PDF":
1. **With Native Build**: Creates a professional PDF document with tables, colors, and summaries
2. **Without Native Build**: Shows helpful error message suggesting to use CSV or rebuild

## Error Messages

If you see:
- `Cannot find native module 'ExpoPrint'` - Need to rebuild with EAS or locally
- `PDF export requires a native build` - User-friendly message from our code

## Testing

### To Test PDF Export:
1. Build app with EAS: `bun run build:dev:ios`
2. Install build on device using QR code
3. Go to Quotes or Invoices screen
4. Tap "Export" tab
5. Tap "Export as PDF"
6. PDF should generate and open share sheet

### To Test CSV Export (Works Now):
1. Go to Quotes or Invoices screen
2. Tap "Export" tab
3. Tap "Export as CSV"
4. CSV file opens in share sheet immediately

## Files Modified
- `src/services/importExport.ts` - Added PDF export methods with error handling
- `src/screens/QuotesScreen.tsx` - Added PDF export button and info message
- `src/screens/InvoicesScreen.tsx` - Added PDF export button and info message
- `package.json` - Added `expo-print` dependency

## Next Steps
1. Build app with EAS Build
2. Test PDF export on actual device
3. If issues persist, check EAS build logs
4. CSV export remains fully functional as fallback