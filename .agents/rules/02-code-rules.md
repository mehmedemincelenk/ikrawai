---
name: code-rules
description: Solo-developer coding standards. Focuses on KISS, client-side persistence, and highly readable React components.
---

# KISS & Solo-Developer Coding Rules

## 1. Anti-Complexity (The Single-File/Simple-Folder Rule)
- Avoid creating deep, enterprise-level folder structures. Keep components in `src/components/` and logic in `src/App.jsx` or a simple `src/hooks/` folder.
- Do not use Redux, Zustand, or Context API unless absolutely unavoidable. Stick to React `useState` and `useEffect`.

## 2. Data Persistence (`localforage`)
- All document texts, chunks, and metadata must be stored in the browser using `localforage` (IndexedDB) to ensure persistence across reloads without a server.
- Handle async operations cleanly with try/catch blocks and loading states.

## 3. Tailwind for Speed
- Group colors and spacing logically. Avoid complex CSS files; use Tailwind classes directly in the components.

## 4. UI Language Constraint
- All button texts, placeholders, alerts, and loading messages MUST be in Turkish.