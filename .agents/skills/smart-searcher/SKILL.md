---
name: smart_searcher
description: Performs a hybrid semantic search using an LLM for query expansion followed by client-side local search.
---

# Smart Search Protocol (Client-Side)

When the user enters a search query, DO NOT use external vector databases. Follow this lightweight flow:

1. **Query Expansion (LLM Call):** Send the user's search keywords to the LLM with a strict prompt: "You are a keyword expander. Return a comma-separated list containing the original keywords, their synonyms, and highly related terms in Turkish. Output ONLY the list, no extra text."
2. **Local Search (Regex/Filter):** Retrieve all text chunks from `localforage`. Using JavaScript, filter the chunks that contain ANY of the words from the expanded comma-separated list (case-insensitive).
3. **Display:** Send the matched chunks, along with their associated `bookTitle` and `location`, to the UI.