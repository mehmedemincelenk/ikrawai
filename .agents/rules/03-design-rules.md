---
name: design-rules
description: Minimalist, library-focused UI/UX standards for the ikrawai reading assistant.
---

# Minimalist & Typography-First Design Rules

## 1. The "Library" Philosophy
- **Content is King:** The UI must be highly readable. It's a reading assistant, so use clean, professional typography (e.g., Inter, Roboto, or serif fonts for articles).
- **Whitespace:** Give text blocks and search results room to breathe. Do not clutter the screen.

## 2. Layout Structure
- **Sidebar/Menu:** A simple sidebar for uploading and listing loaded PDFs/Epubs.
- **Main Area:** Search bar at the top, a clean list of paragraph results in the middle, and a distinct "Makale Oluştur" (Generate Article) button.

## 3. Tailwind Design Patterns
- **Colors:** Use a calm, distraction-free palette. (e.g., Slate, Gray, Zinc). Use a soft primary color (like Indigo or Teal) for action buttons.
- **Cards:** Search results should be displayed in neat cards with a subtle border and soft shadows. Include the Book Name and Page/Chapter visually distinct from the text.

## 4. Feedback
- Provide clear visual feedback (spinners or text) during heavy operations like parsing a PDF, searching, or generating the article.