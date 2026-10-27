/**
 * lib/chunker.js — Document Text Splitting & Sliding Window Chunking Engine
 * 
 * Implements recursive-style boundary chunking (paragraphs -> sentences -> words)
 * with sliding-window overlap to preserve contextual continuity across chunk boundaries.
 */

/**
 * Splits raw text into structured chunks with overlap.
 * 
 * @param {string} text - Raw input document text
 * @param {object} options - Chunking configuration options
 * @param {number} options.chunkSize - Target maximum characters per chunk (default 1200 chars ~ 250-300 tokens)
 * @param {number} options.chunkOverlap - Overlap in characters between sequential chunks (default 200 chars)
 * @param {string} options.documentId - Associated document UUID
 * @returns {Array<{chunkIndex: number, content: string, tokenCount: number, metadata: object}>}
 */
export function chunkDocumentText(text, options = {}) {
  const {
    chunkSize = 1200,
    chunkOverlap = 200,
    documentId = null,
    documentTitle = 'Untitled',
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize line endings and trim
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (cleanText.length === 0) return [];

  // If text is smaller than chunk size, return single chunk
  if (cleanText.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleanText,
        tokenCount: estimateTokens(cleanText),
        metadata: {
          documentId,
          documentTitle,
          startChar: 0,
          endChar: cleanText.length,
          totalChars: cleanText.length,
        },
      },
    ];
  }

  // Split text by paragraphs first
  const paragraphs = cleanText.split(/\n{2,}/);
  const rawSegments = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (trimmedPara.length <= chunkSize) {
      rawSegments.push(trimmedPara);
    } else {
      // Split large paragraph by sentences
      const sentences = trimmedPara.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [trimmedPara];
      for (const sent of sentences) {
        const trimmedSent = sent.trim();
        if (!trimmedSent) continue;

        if (trimmedSent.length <= chunkSize) {
          rawSegments.push(trimmedSent);
        } else {
          // If sentence is still bigger than chunkSize, split by words
          const words = trimmedSent.split(/\s+/);
          let currentSub = '';
          for (const word of words) {
            if ((currentSub + ' ' + word).trim().length > chunkSize) {
              if (currentSub) rawSegments.push(currentSub.trim());
              currentSub = word;
            } else {
              currentSub = currentSub ? currentSub + ' ' + word : word;
            }
          }
          if (currentSub.trim()) rawSegments.push(currentSub.trim());
        }
      }
    }
  }

  // Now assemble segments into chunks with sliding-window overlap
  const chunks = [];
  let currentChunkText = '';
  let currentStartIndex = 0;
  let chunkIndex = 0;

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    const candidate = currentChunkText ? currentChunkText + '\n\n' + segment : segment;

    if (candidate.length <= chunkSize) {
      currentChunkText = candidate;
    } else {
      if (currentChunkText) {
        chunks.push({
          chunkIndex,
          content: currentChunkText.trim(),
          tokenCount: estimateTokens(currentChunkText.trim()),
          metadata: {
            documentId,
            documentTitle,
            startChar: currentStartIndex,
            endChar: currentStartIndex + currentChunkText.length,
          },
        });
        chunkIndex++;

        // Calculate overlap tail from currentChunkText
        const overlapText = getOverlapTail(currentChunkText, chunkOverlap);
        currentStartIndex = Math.max(0, currentStartIndex + currentChunkText.length - overlapText.length);
        currentChunkText = overlapText ? overlapText + '\n\n' + segment : segment;
      } else {
        currentChunkText = segment;
      }
    }
  }

  // Push remaining chunk if any
  if (currentChunkText.trim()) {
    chunks.push({
      chunkIndex,
      content: currentChunkText.trim(),
      tokenCount: estimateTokens(currentChunkText.trim()),
      metadata: {
        documentId,
        documentTitle,
        startChar: currentStartIndex,
        endChar: currentStartIndex + currentChunkText.length,
      },
    });
  }

  return chunks;
}

/**
 * Extracts the tail portion of text up to approximately targetOverlap characters,
 * aligning to a sentence or word boundary.
 */
function getOverlapTail(text, targetOverlap) {
  if (!text || text.length <= targetOverlap) return text;

  const tailSubstring = text.slice(-targetOverlap);
  // Try to break at a newline or space
  const firstSpace = tailSubstring.indexOf(' ');
  if (firstSpace !== -1 && firstSpace < targetOverlap / 2) {
    return tailSubstring.slice(firstSpace + 1).trim();
  }
  return tailSubstring.trim();
}

/**
 * Approximates token count based on the rule of thumb (1 token ≈ 4 characters or 0.75 words)
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Reads a File or Blob object as plain text.
 * Supports txt, md, json, csv, or basic text-extracted content.
 */
export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file: ' + e.target.error));
    reader.readAsText(file);
  });
}
