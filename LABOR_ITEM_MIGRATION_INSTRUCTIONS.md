# Labor Item Migration: Add Name Field

## Problem
The labor item form currently only has a "description" field, but we need separate "name" and "description" fields for better organization and clarity.

## Solution
Add a `name` column to the `labor_items` table and update the application to use both fields.

## Database Migration Required

### Step 1: Run the Migration
Execute the migration script in your Supabase SQL editor:

```sql
-- Add the name column to labor_items table
ALTER TABLE labor_items ADD COLUMN name TEXT;

-- Update existing records to use description as name (temporary)
UPDATE labor_items SET name = description WHERE name IS NULL;

-- Make the name column NOT NULL after populating it
ALTER TABLE labor_items ALTER COLUMN name SET NOT NULL;

-- Update the description column to be nullable since it's now optional
ALTER TABLE labor_items ALTER COLUMN description DROP NOT NULL;
```

### Step 2: Verify the Migration
Check that the changes were applied correctly:

```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'labor_items' 
AND column_name IN ('name', 'description')
ORDER BY column_name;
```

Expected result:
- `description`: nullable, text
- `name`: not nullable, text

## Application Changes Made

### ✅ Updated Files:
1. **CreateLaborScreen.tsx** - Added separate name and description fields
2. **EditLaborScreen.tsx** - Added separate name and description fields  
3. **src/types/index.ts** - Updated LaborItem interface (description now optional)
4. **src/types/database.ts** - Updated database types
5. **All schema files** - Updated to include name column

### 🎨 UI Improvements:
- **Name Field**: Required field for the labor item name (e.g., "Electrical Installation")
- **Description Field**: Optional detailed description
- **Better Labels**: Clear field labels and helpful placeholders
- **Professional Header**: Added title and subtitle to forms
- **Validation**: Name is now required, description is optional

### 📊 Data Structure:
**Before:**
```typescript
{
  description: "Electrical Installation - Install new outlets and switches"
}
```

**After:**
```typescript
{
  name: "Electrical Installation",
  description: "Install new outlets and switches" // optional
}
```

## Benefits
- ✅ **Better Organization**: Clear separation between name and detailed description
- ✅ **Improved UX**: Users can quickly identify labor items by name
- ✅ **Consistent with Parts**: Parts already have name + description structure
- ✅ **Better Display**: Labor items will show cleaner in lists and selections
- ✅ **Optional Details**: Description is optional for simple labor items

## Migration Impact
- **Existing Data**: All existing labor items will have their current description copied to the name field
- **Backward Compatibility**: The interface includes both fields for compatibility
- **No Data Loss**: All existing data is preserved during migration

After running the migration, users can edit their labor items to separate the name from the detailed description for better organization.
