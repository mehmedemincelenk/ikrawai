---
name: ikrawai-master-rules
description: Core architectural vision and constraints for the ikrawai PDF/Epub reading assistant.
---

# PROJECT CONTEXT & ARCHITECTURAL MEMORY

## 1. PROJECT VISION (THE "SOUL")
"ikrawai" is a serverless, browser-based, AI-powered PDF and Epub reading assistant. It allows users to upload local documents, search through them semantically, and synthesize selected paragraphs into academic articles.

## 2. SOLO-DEV TECH STACK (SERVERLESS)
- **Framework:** React (Vite).
- **Styling:** Tailwind CSS (Utility-first).
- **Storage:** `localforage` (IndexedDB). No backend, no Node.js servers, no external databases.
- **Document Parsing:** `pdfjs-dist` (or `pdf-lib`) for PDFs, `epubjs` for Epubs.
- **Markdown:** `react-markdown` for rendering generated articles.

## 3. CORE WORKFLOWS
1. **Upload & Parse:** Read files client-side, chunk texts, save to `localforage`.
2. **Semantic Search:** LLM generates synonyms -> Regex/text search runs on local DB -> UI displays results with book/page metadata.
3. **Article Synthesis:** User selects paragraphs -> LLM synthesizes an academic article with citations via Prompt Chaining.

## 4. SYSTEM SPIRIT & LANGUAGE
- **Internal Logic:** English.
- **User Interface (UI) & LLM Outputs:** Strictly high-quality **Turkish**.
- **Constraint:** Do NOT use vector databases (like ChromaDB or Pinecone) or server-side APIs. Everything must run in the browser to keep it lightweight.