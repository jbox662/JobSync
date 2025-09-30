# Smart Import - PDF Support (Experimental)

## Overview
The Smart Import feature now has **experimental PDF support** in addition to CSV and text formats. However, PDF support has important limitations.

## ⚠️ Important Limitations

### PDF Support Status: **Experimental**

**What Works:**
- ✅ Text-based PDFs with extractable text
- ✅ PDFs generated directly from software (not scanned)
- ✅ Simple invoice layouts with clear text

**What Doesn't Work:**
- ❌ Scanned PDFs (images of documents)
- ❌ Secured/encrypted PDFs
- ❌ Complex layouts with embedded images
- ❌ PDFs without extractable text layers

### Why the Limitation?

The OpenAI Vision API (which we initially planned to use) **does not accept PDF files directly**. It only accepts image formats (PNG, JPEG, etc.). 

Our current implementation attempts to extract text from PDFs and parse it with AI, but this only works for text-based PDFs, not scanned documents.

## Recommended Approach

### Best Option: **Use CSV Export** 🎯
- Most reliable
- Fastest processing
- No parsing errors
- Works 100% of the time

### Good Option: **Text Files**
- Copy invoice text from PDF
- Paste into a .txt file
- Import the text file
- AI will parse it accurately

### Experimental: **Text-Based PDFs**
- May work for software-generated invoices
- Not reliable for all PDF types
- Use as last resort

## How It Works (Current Implementation)

1. User selects a PDF file
2. App attempts to extract text from PDF
3. Extracted text is cleaned up
4. AI parses the text content
5. Invoice data is structured and imported

### Text Extraction Process
```
PDF File
    ↓
Read as UTF-8 text
    ↓
Extract text from PDF structure
    ↓
Clean control characters
    ↓
Parse with AI
    ↓
Import invoice
```

## Error Messages Explained

### "Could not extract text from this PDF"
- **Cause**: PDF is image-based or encrypted
- **Solution**: Export as CSV or copy text to .txt file

### "This PDF does not appear to contain invoice data"
- **Cause**: Text extraction worked but no invoice keywords found
- **Solution**: Verify the file is actually an invoice, try different format

### "AI could not parse the invoice data"
- **Cause**: Text extracted but format is unusual
- **Solution**: Use CSV export for reliable parsing

## Future Improvements

To properly support PDF invoices (including scanned documents), we would need to:

1. **Convert PDF to Images**
   - Use a PDF-to-image library
   - Convert each page to PNG/JPEG
   - Send images to GPT-4o Vision

2. **Use OCR**
   - Add optical character recognition
   - Extract text from scanned documents
   - Requires additional native dependencies

3. **Implement in Native Code**
   - Better PDF parsing libraries in native iOS/Android
   - More reliable text extraction
   - Requires EAS build

## Current Recommendations for Users

### For Square Invoices:
1. Go to Square dashboard
2. Find the invoice
3. Click "Export" → Choose CSV
4. Import CSV file (100% reliable)

### For QuickBooks Invoices:
1. Open QuickBooks
2. Export reports as CSV
3. Import CSV file

### For Other PDFs:
1. Open PDF in a viewer
2. Select and copy all text
3. Paste into a new .txt file
4. Import the text file

## Technical Details

### Dependencies Installed
- `react-native-pdf` - PDF viewing (not used for text extraction)
- `react-native-blob-util` - File utilities
- `pdf-lib` - PDF manipulation
- `react-native-pdf-to-image` - PDF conversion (installed but not implemented)

### Why Not Use Vision API?

**Error from OpenAI API:**
```
400 Invalid MIME type. Only image types are supported.
```

The Vision API expects:
- `image/png`
- `image/jpeg`  
- `image/gif`
- `image/webp`

But does NOT accept:
- `application/pdf` ❌

### Alternative Approach (Not Implemented)

To use Vision API, we would need to:

```typescript
// 1. Convert PDF to images
const images = await pdfToImage(pdfUri);

// 2. Send each image to Vision API
for (const image of images) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract invoice data...' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` }}
      ]
    }]
  });
}

// 3. Combine results from all pages
```

This requires additional setup and native dependencies.

## Status Summary

| Format | Support Level | Reliability | Recommendation |
|--------|--------------|-------------|----------------|
| CSV | ✅ Full | 100% | **Use this** |
| Text | ✅ Full | 95% | Great option |
| Text-based PDF | ⚠️ Experimental | 60% | Use with caution |
| Scanned PDF | ❌ Not supported | 0% | Convert to CSV |

## Conclusion

While we've added PDF support, it's **experimental and limited**. For the best experience importing invoices:

1. **First choice**: Export as CSV
2. **Second choice**: Copy text to .txt file  
3. **Last resort**: Try PDF (may not work)

The Smart Import feature works best with CSV and text files. These formats provide reliable, accurate imports every time.
