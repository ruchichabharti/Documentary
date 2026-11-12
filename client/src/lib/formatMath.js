/**
 * lib/formatMath.js — Robust Pre-processor for LaTeX Math and Markdown Tables
 * 
 * Ensures:
 * 1. LaTeX \begin{array} and \begin{tabular} blocks are converted into clean native Markdown tables.
 * 2. Unclosed $$ and $ math delimiters are balanced so KaTeX never swallows Markdown headings or paragraphs.
 * 3. Standalone \hline tags are stripped to eliminate KaTeX parse errors.
 * 4. Matrices and display math equations are formatted cleanly for KaTeX.
 */

function isInsideMath(str, offset) {
  const before = str.slice(0, offset);
  const doubleMatches = before.match(/\$\$/g);
  const doubleCount = doubleMatches ? doubleMatches.length : 0;
  if (doubleCount % 2 === 1) return true;

  const cleaned = before.replace(/\$\$[\s\S]*?\$\$/g, '');
  const singleMatches = cleaned.match(/(?<!\\)\$/g);
  const singleCount = singleMatches ? singleMatches.length : 0;
  if (singleCount % 2 === 1) return true;

  return false;
}

/**
 * Converts LaTeX \begin{array}{...} and \begin{tabular}{...} blocks into
 * native GitHub-Flavored Markdown tables (| Col 1 | Col 2 |).
 */
export function convertLatexTableToMarkdown(text) {
  if (!text || typeof text !== 'string') return '';

  // Match optional enclosing $$ followed by \begin{array|tabular} ... \end{array|tabular} and optional closing $$
  return text.replace(
    /(?:\$\$\s*)?\\begin\{(?:array|tabular)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{(?:array|tabular)\}(?:\s*\$\$)?/gi,
    (match, body) => {
      // Split rows by double backslash \\
      const rawRows = body.split(/\\\\/g);
      const tableRows = [];

      for (const r of rawRows) {
        // Strip \hline and trim whitespace
        let cleanedRow = r.replace(/\\hline/g, '').trim();
        if (!cleanedRow) continue;

        // Split cells by &
        const cells = cleanedRow.split('&').map((cell) => {
          let c = cell.trim();
          // Convert LaTeX font formatting into Markdown
          c = c.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
          c = c.replace(/\\textit\{([^}]*)\}/g, '*$1*');
          c = c.replace(/\\text\{([^}]*)\}/g, '$1');
          c = c.replace(/\\(quad|qquad|,|;|!)/g, ' ');
          c = c.replace(/\\%/g, '%');

          // If cell contains formulas without $, wrap in $
          if (/(\\frac|\\times|\\approx|\\le|\\ge|=|\^|_)/.test(c) && !c.includes('$')) {
            c = `$${c}$`;
          }

          // Escape pipe characters inside cells so Markdown table doesn't split
          return c.replace(/\|/g, '\\|');
        });

        if (cells.length > 0 && cells.some((c) => c.length > 0)) {
          tableRows.push(cells);
        }
      }

      if (tableRows.length === 0) return '';

      const maxCols = Math.max(...tableRows.map((r) => r.length));
      if (maxCols === 0) return '';

      let md = '\n\n';

      // Header row
      const headerRow = tableRows[0];
      while (headerRow.length < maxCols) headerRow.push('');
      md += '| ' + headerRow.join(' | ') + ' |\n';

      // Separator row
      md += '| ' + new Array(maxCols).fill('---').join(' | ') + ' |\n';

      // Body rows
      for (let i = 1; i < tableRows.length; i++) {
        const row = tableRows[i];
        while (row.length < maxCols) row.push('');
        md += '| ' + row.join(' | ') + ' |\n';
      }

      md += '\n\n';
      return md;
    }
  );
}

/**
 * Balances unclosed $$ delimiters before Markdown headings, horizontal rules,
 * or at the end of the text so math mode never leaks into subsequent text.
 */
export function balanceMathDelimiters(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // Clean orphan \hline and $$\hline$$
  str = str.replace(/\$\$\s*\\hline\s*\$\$/g, '');
  str = str.replace(/\\hline/g, '');

  const lines = str.split('\n');
  let inDisplay = false;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check count of $$ in this line
    const matches = line.match(/\$\$/g);
    const count = matches ? matches.length : 0;

    // If display math is unclosed and a markdown heading or divider is reached, close the math block immediately
    if (inDisplay && (trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('***'))) {
      processedLines.push('$$\n');
      inDisplay = false;
    }

    if (count % 2 === 1) {
      inDisplay = !inDisplay;
    }

    processedLines.push(line);
  }

  // If still unclosed at the end of the document, close it
  if (inDisplay) {
    processedLines.push('\n$$');
  }

  return processedLines.join('\n');
}

/**
 * Comprehensive formatter for math and tables before passing to ReactMarkdown.
 */
export function formatMathForDisplay(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // 1. Convert LaTeX array/tabular to native Markdown tables first
  str = convertLatexTableToMarkdown(str);

  // 2. Normalize display brackets \[ ... \] and inline brackets \( ... \)
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');

  // 3. Fix pipe chars inside matrices
  str = str.replace(/(\\begin\{(?:b|p|v|V)?matrix\}[\s\S]*?\\end\{(?:b|p|v|V)?matrix\})/g, (match) => {
    return match.replace(/\s*\|\s*/g, ' & ');
  });

  // 4. Wrap standalone LaTeX environments in $$ if not already inside math
  str = str.replace(
    /(\\begin\{(cases|aligned|align\*?|matrix|pmatrix|bmatrix|vmatrix)\}[\s\S]*?\\end\{\2\})/g,
    (match, p1, env, offset, fullStr) => {
      if (isInsideMath(fullStr, offset)) return match;
      return `\n$$\n${match.trim()}\n$$\n`;
    }
  );

  // 5. Clean redundant $$$
  str = str.replace(/\${3,}/g, '$$');
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner) => {
    const cleanedInner = inner.replace(/\n\s*\n/g, '\n');
    return `$$${cleanedInner}$$`;
  });

  // 6. Handle unicode integral symbols
  str = str.replace(/∫\(from\s+([^)]+)\s+to\s+([^)]+)\)/gi, '\\int_{$1}^{$2} ');
  str = str.replace(/∫_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2} ');
  str = str.replace(/∫/g, '\\int ');

  // 7. Auto-balance unclosed delimiters
  str = balanceMathDelimiters(str);

  // 8. Line-by-line fine-tuning for inline math
  const lines = str.split('\n');
  let inDisplayBlock = false;

  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed === '$$') {
      inDisplayBlock = !inDisplayBlock;
      return line;
    }
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) return line;
    if (inDisplayBlock) return line;

    // Never wrap lines that are markdown tables, headings, lists, or code blocks
    if (
      trimmed.startsWith('|') ||
      trimmed.startsWith('```') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('*')
    ) {
      return line;
    }
    if (trimmed.includes('$')) return line;

    let l = line;
    l = l.replace(/\(\(([0-9]+)\s*\/\s*([0-9]+)\)\)/g, '(\\frac{$1}{$2})');
    l = l.replace(/\(([0-9]+)\s*\/\s*([0-9]+)\)/g, '\\frac{$1}{$2}');

    // Only wrap lines that are pure mathematical derivations without prose words
    const hasLatexCmd = /\\[a-zA-Z]+/.test(l);
    if (hasLatexCmd) {
      // Do not touch lines with table separators
      if (l.includes('&') || l.includes('\\hline')) return l;
      const proseWords = l.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '').match(/[a-zA-Z]{2,}/g) || [];
      if (proseWords.length === 0 && /[=><+\-*^]/.test(l)) {
        return `$$${l.trim()}$$`;
      }
    }

    return l;
  });

  return processedLines.join('\n');
}

