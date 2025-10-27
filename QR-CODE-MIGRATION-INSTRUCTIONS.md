# QR Code Detection Migration Instructions

## Overview
Your app has been upgraded with QR code detection functionality for parts. This feature allows you to scan QR codes and barcodes to automatically populate part information when creating parts, quotes, and invoices.

## What's New
The QR code scanner can:
- Scan QR codes, barcodes (EAN-13, EAN-8, Code-128, Code-39)
- Parse JSON-formatted QR codes with structured part data
- Extract part information from text-based QR codes with labels (e.g., "Part Name: XXX", "SKU: XXX")
- Auto-fill part details including: name, SKU, price, brand, category, description, stock, and low stock threshold

## Database Changes Required

### New Fields Added to Parts Table
Your QR code feature uses two additional fields that need to be added to your Supabase `parts` table:

1. **`brand`** (TEXT) - Stores the brand name from QR codes
2. **`low_stock_threshold`** (INTEGER) - Alert threshold when stock falls below this value

---

## 🚀 How to Run the Migration

### Option 1: Run the Migration Script (Recommended)
This is the safest option as it checks if columns already exist before adding them.

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of: **`migration-add-qr-fields-to-parts.sql`**
4. Click **Run**
5. You should see a success message confirming the migration

### Option 2: Update Your Full Schema
If you're setting up a fresh database or want to recreate everything:

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Use the updated schema file: **`supabase-schema-safe.sql`**
4. This file now includes the `brand` and `low_stock_threshold` fields

---

## 📋 SQL to Run

If you prefer to run the SQL manually, here's what you need:

```sql
-- Add brand column to parts table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parts' AND column_name = 'brand'
  ) THEN
    ALTER TABLE parts ADD COLUMN brand TEXT;
    COMMENT ON COLUMN parts.brand IS 'Brand name from QR code scanning';
  END IF;
END $$;

-- Add low_stock_threshold column to parts table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parts' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE parts ADD COLUMN low_stock_threshold INTEGER DEFAULT 0;
    COMMENT ON COLUMN parts.low_stock_threshold IS 'Alert threshold when stock falls below this value';
  END IF;
END $$;
```

---

## ✅ Verification

After running the migration, verify it worked by running this query:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parts' 
  AND column_name IN ('brand', 'low_stock_threshold')
ORDER BY column_name;
```

You should see both columns listed in the results.

---

## 📱 How the QR Feature Works

### In CreatePartScreen
- Tap the QR scanner button
- Scan a QR code or barcode on a part
- The app will auto-fill all available fields from the scanned data

### In CreateQuoteScreen and CreateInvoiceScreen
- Tap the QR scanner button when adding items
- Scan a part's QR code
- If the part exists in your database (matched by SKU), it will be added to the quote/invoice
- If not found, you'll be prompted to create it first

### Supported QR Code Formats

**JSON Format:**
```json
{
  "sku": "ABC123",
  "name": "Brake Pad Set",
  "price": 49.99,
  "brand": "Acme Parts",
  "category": "Brakes",
  "description": "Premium ceramic brake pads",
  "stock": 10,
  "lowStockThreshold": 5
}
```

**Text Format with Labels:**
```
Part Name: Brake Pad Set
SKU: ABC123
Price: $49.99
Brand: Acme Parts
Category: Brakes
Description: Premium ceramic brake pads
```

---

## 🔧 Files Updated

1. **`migration-add-qr-fields-to-parts.sql`** - NEW migration file to add columns
2. **`supabase-schema-safe.sql`** - Updated with new columns in parts table
3. **`src/types/database.ts`** - Updated TypeScript types for the database
4. **`src/components/QRScanner.tsx`** - QR scanner component (already implemented)
5. **`src/screens/CreatePartScreen.tsx`** - Uses QR scanner (already implemented)
6. **`src/screens/CreateQuoteScreen.tsx`** - Uses QR scanner (already implemented)
7. **`src/screens/CreateInvoiceScreen.tsx`** - Uses QR scanner (already implemented)
8. **`src/screens/EditInvoiceScreen.tsx`** - Uses QR scanner (already implemented)

---

## ⚠️ Important Notes

- The migration script is **idempotent** - it's safe to run multiple times
- Existing parts data will not be affected
- The new columns are optional (nullable/default values)
- The TypeScript types have been updated to match the database schema
- Both columns will be synced automatically via the existing sync infrastructure

---

## 🎯 Next Steps

1. **Run the migration in Supabase** (use `migration-add-qr-fields-to-parts.sql`)
2. **Test the QR scanner** in your app
3. **Create or scan a QR code** with part information
4. **Verify the data syncs** properly to Supabase

That's it! Your QR code detection feature should now work perfectly with full database support.

