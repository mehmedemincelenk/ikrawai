---
name: vibecoder-standards
description: Enforces a solo-dev friendly "Single File" architecture. Prioritizes KISS over SOLID to ensure the intern/solo-developer can manage the app alone.
---

# Solo-Vibecoder & Lightweight Architecture

This skill ensures the code stays fun, "high-vibe," and easy to fix. We ignore complex engineering patterns in favor of speed and readability.

## 1. The "Cheat Sheet" Config
- **Rule:** Every component must have a `CONFIG` object at the very top.
- **Why:** To change the app's look or text, you shouldn't have to look at the logic. Just change the top 10 lines.
- **Turkish UI:** Every label, placeholder, and button text in the `CONFIG` must be in **Turkish**.

## 2. Flat & Fast Structure (Anti-Folder Hell)
- **Single-File Logic:** Keep the Logic and the UI in the same file as much as possible. 
- **LEGO-Block (Lite):** Build components as simple functions. If you can copy-paste a function to another project and it works, it's a good LEGO block.
- **Avoid Over-Engineering:** Do NOT use complex State Management (Redux, etc.) or deep prop-drilling. Use simple `useState` and `localStorage`.

## 3. High-Vibe & Fun Naming
- Use names that make you smile and explain the function.
- **Examples:** `magicAnswerGenerator()`, `coolActionButton`, `studentVibeContainer`.
- **Note:** Avoid robotic names like `handleDataSubmission`.

## 4. Maintenance for "Future You"
- Since you are a solo dev, your "intern" is actually you, 3 months from now.
- **Rule:** Write comments like you're explaining it to a friend. 
- **Example:** `// If this breaks, the student won't see the Arabic analogy. Check the bridge logic.`

## 5. Minimalist Tailwind Layers
- Use Tailwind for everything. 
- **Aesthetic Rule:** Use one "Special Effect" (like a subtle gradient or a soft blur) per screen. Don't stack 5 different effects; it makes the code a nightmare to read.

## KEYWORDS
KISS, Single-File, Rapid Development, Vibecoder, Solo-Developer, Turkish UI, Tailwind CSS, Minimalist Architecture, Stajyer-Friendly.