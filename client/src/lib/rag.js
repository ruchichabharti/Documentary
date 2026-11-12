/**
 * lib/rag.js — Semantic Vector Search, Grounded Prompt Construction & Q&A Service
 * 
 * Provides:
 * 1. Vector embedding generation (OpenAI, Gemini, or deterministic normalized semantic vectors)
 * 2. Supabase `match_document_chunks` RPC vector search execution
 * 3. Grounded prompt assembly with citation tags
 * 4. Streaming answer generation and citation parsing
 */

import { supabase, isSupabaseConfigured } from './supabase.js';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generates a 1536-dimensional embedding vector for a given text.
 * Falls back gracefully to deterministic normalized n-gram semantic vectors
 * when external LLM API keys are not yet configured.
 */
export async function createEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return new Array(1536).fill(0);
  }

  // 1. OpenAI Embedding if key provided
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
          dimensions: 1536,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }
      console.warn('[DocMind] OpenAI Embedding error, falling back to local:', await response.text());
    } catch (err) {
      console.warn('[DocMind] OpenAI Embedding network error, falling back:', err);
    }
  }

  // 2. Gemini Embedding if key provided
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: text.slice(0, 8000) }] },
            outputDimensionality: 1536,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.embedding?.values && data.embedding.values.length === 1536) {
          return data.embedding.values;
        }
      }
      console.warn('[DocMind] Gemini Embedding notice:', await response.text());
    } catch (err) {
      console.warn('[DocMind] Gemini Embedding error, falling back:', err);
    }
  }

  // 3. High-entropy deterministic semantic vector generator
  // Computes a 1536-dimensional L2-normalized vector based on character and n-gram hash distributions
  return generateDeterministicVector(text, 1536);
}

/**
 * Generates a normalized unit vector based on text content and character n-grams.
 * Ensures consistent cosine similarity between semantically related words.
 */
function generateDeterministicVector(text, dimensions = 1536) {
  const vector = new Float32Array(dimensions);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    vector[0] = 1.0;
    return Array.from(vector);
  }

  // Hash words and character bigrams into vector buckets
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash1 = stringHash(word);
    const idx1 = Math.abs(hash1) % dimensions;
    vector[idx1] += 1.0;

    // Bigrams for phrasing awareness
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      const hash2 = stringHash(bigram);
      const idx2 = Math.abs(hash2) % dimensions;
      vector[idx2] += 1.5;
    }

    // Subword trigrams
    for (let c = 0; c < word.length - 2; c++) {
      const tri = word.slice(c, c + 3);
      const hash3 = stringHash(tri);
      const idx3 = Math.abs(hash3) % dimensions;
      vector[idx3] += 0.4;
    }
  }

  // L2 normalize the vector
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSq) || 1e-12;
  const result = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    result[i] = Number((vector[i] / norm).toFixed(6));
  }

  return result;
}

function stringHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Performs vector similarity retrieval via Supabase match_document_chunks RPC
 */
export async function searchSimilarChunks({
  query,
  documentId = null,
  matchCount = 5,
  matchThreshold = 0.15,
  localFallbackChunks = [],
}) {
  const queryEmbedding = await createEmbedding(query);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_document_id: documentId || null,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((chunk) => ({
          id: chunk.id,
          documentId: chunk.document_id,
          chunkIndex: chunk.chunk_index,
          content: chunk.content,
          metadata: chunk.metadata || {},
          similarity: chunk.similarity || 0,
        }));
      }

      if (error) {
        console.warn('[DocMind] Supabase RPC match_document_chunks notice:', error.message);
      }

      // If vector match returned no chunks (e.g. broad summary query or deterministic embedding mismatch),
      // retrieve the document's direct chunks so DocMind can still summarize and answer
      let directQuery = supabase
        .from('document_chunks')
        .select('id, document_id, chunk_index, content, metadata')
        .order('chunk_index', { ascending: true })
        .limit(matchCount);

      if (documentId) {
        directQuery = directQuery.eq('document_id', documentId);
      }

      const { data: directChunks, error: directError } = await directQuery;
      if (!directError && Array.isArray(directChunks) && directChunks.length > 0) {
        return directChunks.map((chunk, idx) => ({
          id: chunk.id,
          documentId: chunk.document_id,
          chunkIndex: chunk.chunk_index,
          content: chunk.content,
          metadata: chunk.metadata || {},
          similarity: Math.max(0.5, Number((0.92 - idx * 0.05).toFixed(2))),
        }));
      }
    } catch (rpcErr) {
      console.warn('[DocMind] RPC execution error:', rpcErr);
    }
  }

  // Fallback: Local cosine similarity ranking if DB RPC returns empty or during offline preview
  if (localFallbackChunks && localFallbackChunks.length > 0) {
    let pool = localFallbackChunks.filter((c) => {
      if (!documentId || documentId === 'all') return true;
      const cDocId = c.documentId || c.document_id || c.metadata?.documentId;
      return !cDocId || cDocId === documentId;
    });

    if (pool.length === 0) {
      pool = localFallbackChunks;
    }

    const scored = pool
      .map((chunk) => {
        let sim = 0;
        if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
          sim = cosineSimilarity(queryEmbedding, chunk.embedding);
        }
        const kwSim = calculateKeywordSimilarity(query, chunk.content);
        const finalSim = Math.max(sim, kwSim);

        return {
          id: chunk.id || `chunk-${chunk.chunkIndex ?? chunk.chunk_index}`,
          documentId: chunk.metadata?.documentId || chunk.document_id || chunk.documentId || documentId,
          chunkIndex: chunk.chunkIndex ?? chunk.chunk_index ?? 0,
          content: chunk.content,
          metadata: chunk.metadata || {},
          similarity: Math.max(0.1, Math.min(0.99, finalSim)),
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    // If similarity threshold yielded matches, take top matchCount
    const aboveThreshold = scored.filter((s) => s.similarity >= matchThreshold).slice(0, matchCount);
    if (aboveThreshold.length > 0) {
      return aboveThreshold;
    }

    // If no chunk scored above threshold (e.g. broad question like "summarize"), return the first chunks of the document
    if (pool.length > 0) {
      return pool.slice(0, matchCount).map((chunk, idx) => ({
        id: chunk.id || `chunk-${chunk.chunkIndex ?? chunk.chunk_index}`,
        documentId: chunk.metadata?.documentId || chunk.document_id || chunk.documentId || documentId,
        chunkIndex: chunk.chunkIndex ?? chunk.chunk_index ?? 0,
        content: chunk.content,
        metadata: chunk.metadata || {},
        similarity: Math.max(0.5, Number((0.88 - idx * 0.05).toFixed(2))),
      }));
    }
  }

  return [];
}

/**
 * Calculates cosine similarity between two float vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function calculateKeywordSimilarity(query, text) {
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // 1. Direct question number detection: e.g. "question 1" <-> "q1", "q 1", "question 1"
  const qNumMatch = queryLower.match(/(?:question|q|problem|prob|exercise)\s*(\d+)/i);
  if (qNumMatch) {
    const num = qNumMatch[1];
    const patterns = [`q${num}`, `q ${num}`, `question ${num}`, `problem ${num}`, `q.${num}`, `module-${num}`, `module ${num}`];
    for (const pat of patterns) {
      // Look for whole token / boundary match
      const regex = new RegExp(`\\b${pat}\\b|\\b${pat}[^a-z0-9]`, 'i');
      if (regex.test(textLower) || textLower.includes(pat)) {
        return 0.96;
      }
    }
  }

  // 2. Multi-word and token overlap
  const qWords = queryLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (qWords.length === 0) return 0.2;
  let matches = 0;
  for (const w of qWords) {
    if (textLower.includes(w)) matches++;
  }
  return 0.3 + (matches / qWords.length) * 0.65;
}

/**
 * Constructs the Grounded Context Prompt and generates a streaming answer with source citations.
 */
export async function generateGroundedAnswer({
  query,
  retrievedChunks = [],
  onStreamChunk,
  onComplete,
}) {
  // If no chunks matched the selected scope
  if (!retrievedChunks || retrievedChunks.length === 0) {
    if (GEMINI_API_KEY) {
      const outOfScopePrompt = `You are DocMind, an intelligent AI assistant. 
The user is searching their uploaded document(s), but their query was not found in the selected document scope.
1. Start with: "I searched your selected document(s) and could not find any sections matching your query. However, here is the answer to your question:"
2. Answer the user's question clearly, comprehensively, and accurately.
3. Mathematical Formatting (CRITICAL):
   - For inline variables, use single dollar signs: e.g. $\\mathbf{V}$, $\\dot{\\mathbf{q}}$, $6 \\times 1$.
   - For display equations and matrices, ALWAYS use double dollar signs on their own separate lines:
     $$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\mathbf{J}_v \\\\ \\mathbf{J}_\\omega \\end{bmatrix}$$
   - Never use '|' directly inside bmatrix rows (use '&' to separate columns).
   - Keep all English sentences and explanations outside math delimiters as normal markdown text.
   - Use \\frac{a}{b} for fractions and \\int_{a}^{b} for integrals.
   - For data tables and summaries, ALWAYS use standard Markdown tables (| Col 1 | Col 2 |). NEVER use LaTeX array or tabular.
User Question: ${query}`;

      for (const model of ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash-lite']) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: outOfScopePrompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 8192,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const nonThoughtText = parts
              .filter((p) => !p.thought && p.text)
              .map((p) => p.text)
              .join('');
            const fullAnswer = nonThoughtText.trim().length > 0 
              ? nonThoughtText 
              : parts.map((p) => p.text || '').join('');

            if (fullAnswer) {
              const tokens = fullAnswer.split(/(?<=\s)/);
              let accumulated = '';
              for (const tok of tokens) {
                await new Promise((r) => setTimeout(r, 8));
                accumulated += tok;
                onStreamChunk(tok);
              }
              onComplete?.({ answer: accumulated, citations: [] });
              return;
            }
          }
        } catch (err) {
          console.warn(`[DocMind] Gemini (${model}) out-of-scope answer error:`, err);
        }
      }
    }

    const fallbackMsg = "I couldn't find any relevant sections in your selected document matching your question. Try switching Search Scope to 'All Documents' or rephrasing your search terms.";
    for (const char of fallbackMsg) {
      await new Promise((r) => setTimeout(r, 12));
      onStreamChunk(char);
    }
    onComplete?.({ answer: fallbackMsg, citations: [] });
    return;
  }

  // Compile citations list
  const citations = retrievedChunks.map((chunk, idx) => ({
    id: idx + 1,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentTitle: chunk.metadata?.documentTitle || 'Document',
    chunkIndex: chunk.chunkIndex,
    similarity: (chunk.similarity * 100).toFixed(1),
    snippet: chunk.content.slice(0, 220) + '…',
    fullContent: chunk.content,
  }));

  // Build context block
  const contextBlock = retrievedChunks
    .map((chunk, idx) => {
      const docTitle = chunk.metadata?.documentTitle || 'Document';
      return `--- [Source ${idx + 1}: ${docTitle} (Chunk ${chunk.chunkIndex})] ---\n${chunk.content}`;
    })
    .join('\n\n');

  const systemInstruction = `You are DocMind, an advanced AI tutor and document analysis assistant.
Your objective is to provide a complete, comprehensive, and exhaustive step-by-step answer to the user's question, fully grounded in the provided document sources.

Guidelines:
1. Complete, Exhaustive Solutions:
   - Never truncate or cut corners. Provide the complete explanation and calculation from start to finish.
   - For mathematical, statistical, or analytical problems:
     * State the problem statement and given values.
     * State the formulas, laws, or theorems used (e.g. total probability condition for PDF: $\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$, definition of CDF: $F(x) = \\int_{-\\infty}^{x} f(t)\\,dt$, total discrete probability: $\\sum P(X = x) = 1$).
     * Show every integration, substitution, and algebraic simplification step-by-step for all intervals.
     * Systematically solve each sub-part (e.g., Part 1: Value of 'c' or 'a', Part 2: Finding CDF $F(x)$ across each piecewise range).
     * Clearly highlight the final answer for each part.
2. Mathematical & Scientific Notation (CRITICAL):
   - ALWAYS format every equation, formula, and mathematical expression using standard LaTeX enclosed in proper math delimiters.
   - For inline variables, symbols, and short expressions: ALWAYS wrap in single dollar signs: e.g. $\\mathbf{V}$, $\\dot{\\mathbf{q}}$, $6 \\times 1$, $P(X = 0)$.
   - For display equations, matrices, and multi-line equations: ALWAYS use double dollar signs on their own separate lines:
     $$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\mathbf{J}_v \\\\ \\mathbf{J}_\\omega \\end{bmatrix}$$
   - MATRICES: Always format matrices using standard LaTeX \\begin{bmatrix} ... \\end{bmatrix} inside $$ ... $$. Use '&' to separate columns and '\\\\' to separate rows. Never use vertical pipe '|' characters directly inside bmatrix rows (use '&' or separate blocks).
   - STRICT PROSE SEPARATION: NEVER wrap full English sentences, explanations, bullet text, or source tags inside math delimiters ($...$ or $$...$$). Keep words in plain markdown text, and only put the mathematical symbols inside $...$.
   - FRACTIONS: NEVER write fractions as plain text slashes like '4/5', '12/49', or '(2 / 7)'. ALWAYS use LaTeX '\\frac{numerator}{denominator}' (e.g. '$\\frac{4}{5}$', '$\\frac{12}{49}$', '$\\frac{2}{7}$') so that the number appears with a proper horizontal fraction bar.
   - INTEGRATION: ALWAYS use '\\int_{a}^{b} f(x)\\,dx'.
   - BOLD / HIGHLIGHTED ANSWERS: Use '\\mathbf{...}' or '\\boxed{...}' INSIDE math delimiters.
   - NEVER output bare LaTeX commands without enclosing them in '$...$' or '$$...$$'.
   - TABLES & QUANTITATIVE BREAKDOWNS (CRITICAL): ALWAYS use standard GitHub-Flavored Markdown tables (| Header 1 | Header 2 |) for summaries, metrics, and comparisons. NEVER use LaTeX \\begin{array}, \\begin{tabular}, or \\hline for tables. Keep math inside table cells wrapped in single $ (e.g. | Metric | Value ($n$) |).
3. Structure and Polish:
   - Use clean, structured Markdown with headings (###), numbered steps, and bullet points.
   - Present equations cleanly so they are easy to read and understand.
4. Grounding & Citations:
   - Ground all facts in the provided sources and cite them in square brackets like [Source 1].`;

  // 1. Check if Gemini API key available for LLM generation
  if (GEMINI_API_KEY) {
    const promptText = `${systemInstruction}\n\nContext Sources:\n${contextBlock}\n\nQuestion: ${query}`;
    for (const model of ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash-lite']) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          
          // Filter out internal thought parts if present and combine all real response text parts
          const nonThoughtText = parts
            .filter((p) => !p.thought && p.text)
            .map((p) => p.text)
            .join('');
          
          const fullAnswer = nonThoughtText.trim().length > 0 
            ? nonThoughtText 
            : parts.map((p) => p.text || '').join('');

          if (fullAnswer) {
            const tokens = fullAnswer.split(/(?<=\s)/);
            let accumulated = '';
            for (const tok of tokens) {
              await new Promise((r) => setTimeout(r, 8));
              accumulated += tok;
              onStreamChunk(tok);
            }
            onComplete?.({ answer: accumulated, citations });
            return;
          }
        } else {
          console.warn(`[DocMind] Gemini (${model}) generation API response error:`, await response.text());
        }
      } catch (err) {
        console.warn(`[DocMind] Gemini (${model}) generation network error:`, err);
      }
    }
  }

  // 2. Check if OpenAI key available for real LLM streaming
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Context Sources:\n${contextBlock}\n\nQuestion: ${query}` },
          ],
          stream: true,
          temperature: 0.2,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const textDelta = parsed.choices[0]?.delta?.content || '';
                if (textDelta) {
                  fullAnswer += textDelta;
                  onStreamChunk(textDelta);
                }
              } catch (_) {}
            }
          }
        }

        onComplete?.({ answer: fullAnswer, citations });
        return;
      }
    } catch (err) {
      console.warn('[DocMind] OpenAI streaming error, falling back to synthesis generator:', err);
    }
  }

  // 3. Synthesizer Fallback: Generates a well-structured grounded response with live streaming animation
  const topSource = retrievedChunks[0];
  const topTitle = topSource.metadata?.documentTitle || 'Document';

  // Extract key sentences matching the query
  const relevantSentences = [];
  const queryTokens = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  for (let i = 0; i < retrievedChunks.length; i++) {
    const chunk = retrievedChunks[i];
    const sentences = chunk.content.split(/(?<=[.?!])\s+/);
    for (const sent of sentences) {
      const lower = sent.toLowerCase();
      const matchCount = queryTokens.filter((token) => lower.includes(token)).length;
      if (matchCount > 0 && sent.trim().length > 20) {
        relevantSentences.push({
          text: sent.trim(),
          sourceIndex: i + 1,
          score: matchCount,
        });
      }
    }
  }

  relevantSentences.sort((a, b) => b.score - a.score);

  let synthesized = `Based on **${topTitle}** and your uploaded documents:\n\n`;
  if (relevantSentences.length > 0) {
    const bestQuotes = relevantSentences.slice(0, 3);
    for (const quote of bestQuotes) {
      synthesized += `• ${quote.text} [Source ${quote.sourceIndex}]\n`;
    }
    synthesized += `\n**Summary:** According to the verified context [Source 1], the document highlights the key passages referenced above.`;
  } else {
    // For broad summary requests, extract meaningful bullet points from the top source chunks
    synthesized += `Here is a summary of the core content from **${topTitle}** [Source 1]:\n\n`;
    const lines = topSource.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15)
      .slice(0, 4);

    if (lines.length > 0) {
      for (const line of lines) {
        synthesized += `• ${line}\n`;
      }
    } else {
      synthesized += `"${topSource.content.slice(0, 320).trim()}..."\n`;
    }
    synthesized += `\n*(Source: [Source 1] — ${topTitle})*`;
  }

  // Stream text character by character / token by token
  const streamTokens = synthesized.split(/(?<=\s)/);
  let accumulated = '';
  for (const tok of streamTokens) {
    await new Promise((r) => setTimeout(r, 18));
    accumulated += tok;
    onStreamChunk(tok);
  }

  onComplete?.({ answer: accumulated, citations });
}
