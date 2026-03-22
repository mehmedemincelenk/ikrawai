---
name: document_processor
description: Extracts text from uploaded PDF and Epub files, chunks them, and indexes them in browser storage.
---

# Document Processing Protocol

When a user uploads a PDF or Epub file, execute the following steps client-side:

1. **Extraction:** Use `pdfjs-dist` (or similar) for PDFs and `epubjs` for Epubs to extract the raw text.
2. **Chunking Strategy:** Do not save the entire book as a single string. Split the text into meaningful chunks (paragraphs) of approximately 500 to 1000 characters.
3. **Metadata Association:** Attach metadata to every single chunk. The metadata MUST include:
   - `bookTitle`: The name of the file/book.
   - `location`: Page number or chapter name.
4. **Storage:** Save the array of chunks into `localforage` (IndexedDB) for fast retrieval during searches.