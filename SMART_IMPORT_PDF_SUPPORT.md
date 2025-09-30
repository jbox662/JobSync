# Smart Import - PDF Support Added

## Overview
The Smart Import feature now supports PDF invoices in addition to CSV and text formats!

## What's New
- ✅ **PDF Support**: Import invoices directly from PDF files
- ✅ **AI Vision**: Uses GPT-4o Vision to read and extract invoice data from PDFs
- ✅ **Automatic Data Extraction**: Extracts all invoice details including:
  - Invoice number
  - Customer information (name, email, phone, address)
  - Line items with quantities and prices
  - Dates (issue date, due date)
  - Totals (subtotal, tax, total)
  - Payment status

## How It Works

### PDF Processing
1. User selects a PDF invoice file
2. The PDF is converted to base64 format
3. GPT-4o Vision analyzes the PDF and extracts structured data
4. The app parses the AI response and creates the invoice
5. Customer is automatically created if they don't exist

### Supported Formats
- **PDF**: Any invoice PDF (Square, QuickBooks, custom invoices, etc.)
- **CSV**: Structured CSV data from invoicing systems
- **Text**: Plain text invoice data

## Technical Implementation

### Key Changes
- Updated `src/services/smartInvoiceParser.ts`:
  - Added `parsePDFInvoice()` method
  - Uses GPT-4o Vision API with base64 PDF encoding
  - Extracts structured JSON data from PDF images
  - Handles multi-page PDFs automatically

### Dependencies Added
- `react-native-pdf` - PDF rendering support
- `react-native-blob-util` - File handling utilities
- `pdf-lib` - PDF manipulation capabilities

### API Usage
The PDF parser uses OpenAI's GPT-4o model with vision capabilities:
```typescript
model: 'gpt-4o'
messages: [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Extract invoice data...' },
      { type: 'image_url', image_url: { url: 'data:application/pdf;base64,...' } }
    ]
  }
]
```

## User Experience

### Import Flow
1. Go to Invoices → Import tab
2. Tap "Smart Import (PDF/CSV/Text)" button
3. Select any invoice file (PDF, CSV, or text)
4. Preview extracted data
5. Confirm to import

### Preview Dialog
Before importing, users see:
- Invoice number
- Customer name
- Total amount
- Option to confirm or cancel

### Error Handling
- Clear error messages for parsing failures
- Fallback to manual entry if AI extraction fails
- Validation of required fields before import

## Benefits

1. **Time Saving**: No manual data entry for invoice imports
2. **Accuracy**: AI extracts data with high precision
3. **Flexibility**: Works with any invoice format or layout
4. **Automation**: Automatically creates customers if needed
5. **Smart Parsing**: Handles various invoice styles and formats

## Limitations

1. PDF quality affects extraction accuracy
2. Scanned/low-quality PDFs may have reduced accuracy
3. API costs for GPT-4o Vision calls
4. Requires internet connection for AI processing

## Future Enhancements

Potential improvements:
- Batch PDF import (multiple invoices at once)
- OCR preprocessing for scanned documents
- Support for invoice attachments
- Historical data import from accounting systems
- Multi-language invoice support

## Testing

To test PDF import:
1. Export an invoice from Square, QuickBooks, or any invoicing system as PDF
2. Navigate to Invoices → Import tab
3. Select the PDF file
4. Verify the extracted data in the preview
5. Confirm import

## Status: ✅ Complete

PDF support is now fully functional and ready to use!
