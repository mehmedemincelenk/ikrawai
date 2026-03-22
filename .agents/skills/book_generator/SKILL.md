---
name: book_generator
description: Uses advanced Prompt Chaining and Iterative Synthesis to generate a full book (outline, content, foreword, back cover) from selected context, and exports as a file.
---

# Book Generation Protocol (Agentic Workflow)

When the user clicks "Kitap Oluştur" (Generate Book), execute the following multi-step iterative process. UI must show a detailed progress state (e.g., "Step 1: İçindekiler oluşturuluyor...").

## Step 1: Context Preparation
Wrap selected paragraphs in the standard `<documents>` XML format.

## Step 2: Architecture & Outline (Chain 1)
Send the XML context to the LLM with this strict prompt:
"Analyze the provided texts. Design a comprehensive book structure. Return ONLY a valid JSON object with this exact structure:
{
  "bookTitle": "Suggested Title",
  "forewordIdea": "Brief idea for foreword",
  "backCoverIdea": "Brief idea for back cover",
  "chapters": [
    {
      "chapterTitle": "...",
      "subtitles": ["..."],
      "description": "Detailed instruction on what to write here using the context"
    }
  ]
}"

## Step 3: Iterative Content Generation (Chain 2)
Parse the JSON. Now, make a new LLM call to write the actual book content.
Prompt the LLM: "You are the author. Using SADECE (ONLY) the provided XML context, write the entire book based on this JSON structure: [Insert JSON here]. 
Sequence to write: 
1. Kitap Adı
2. Önsöz (Foreword)
3. Chapters (Write rich, detailed content for each title/subtitle/description)
4. Arka Kapak Yazısı (Back Cover)
Language: Turkish. Format: Markdown."

## Step 4: Export (File Download)
Take the final Markdown output from Step 3. Create a Blob in the browser and trigger a download as a `.md` or `.txt` file named after the `bookTitle`.