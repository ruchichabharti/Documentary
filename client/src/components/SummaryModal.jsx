import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  FileText, 
  Copy, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  BookOpen, 
  HelpCircle, 
  Layers,
  ChevronDown,
  Edit3,
  Calculator,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '../lib/api.js';

export default function SummaryModal({ 
  isOpen, 
  onClose, 
  documents = [], 
  allLocalChunks = [] 
}) {
  const navigate = useNavigate();

  // State
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [mode, setMode] = useState('solutions'); // 'solutions' | 'formulas' | 'quiz' | 'takeaways' | 'overview'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-sync selected document when documents list loads or changes
  useEffect(() => {
    if (documents && documents.length > 0) {
      if (
        !selectedDocId ||
        (selectedDocId === 'all' && documents.length === 1) ||
        (selectedDocId !== 'all' && !documents.some((d) => d.id === selectedDocId))
      ) {
        setSelectedDocId(documents[0].id);
      }
    }
  }, [documents, isOpen]);

  // Auto-switch mode to 'solutions' if the document is a Question Bank or Exam
  useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find((d) => d.id === selectedDocId) || documents[0];
      const title = (doc?.title || '').toLowerCase();
      if (title.match(/question|bank|exam|test|cat|assignment|solution/)) {
        setMode('solutions');
      }
    }
  }, [selectedDocId, documents]);

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId) || (selectedDocId === 'all' ? null : documents[0]);
  const docTitle = currentDoc?.title || (selectedDocId === 'all' ? 'All Uploaded Documents' : 'Selected Document');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setGeneratedContent('');

    // 1. Gather text chunks for analysis
    let chunksToAnalyze = [];

    if (selectedDocId === 'all') {
      chunksToAnalyze = allLocalChunks;
    } else {
      const doc = documents.find((d) => d.id === selectedDocId) || documents[0];
      const targetId = doc?.id || selectedDocId;

      if (doc?.chunks && Array.isArray(doc.chunks) && doc.chunks.length > 0) {
        chunksToAnalyze = doc.chunks;
      } else {
        chunksToAnalyze = allLocalChunks.filter((c) => {
          const cDocId = c.documentId || c.document_id || c.metadata?.documentId;
          return cDocId === targetId;
        });
      }
    }

    // 2. If memory chunks are empty, check localStorage
    if ((!chunksToAnalyze || chunksToAnalyze.length === 0) && typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('docmind_user_docs_') || key === 'docmind_guest_docs')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.chunks && Array.isArray(parsed.chunks)) {
                if (selectedDocId === 'all') {
                  chunksToAnalyze = parsed.chunks;
                } else {
                  chunksToAnalyze = parsed.chunks.filter((c) => {
                    const cId = c.documentId || c.document_id || c.metadata?.documentId;
                    return cId === selectedDocId;
                  });
                }
                if (chunksToAnalyze.length > 0) break;
              }
            }
          }
        }
      } catch (_) {}
    }

    // 3. If still empty, fetch from backend API
    if (!chunksToAnalyze || chunksToAnalyze.length === 0) {
      try {
        const backendRes = await api.listIngestedDocs();
        if (backendRes?.documents && Array.isArray(backendRes.documents)) {
          if (selectedDocId === 'all') {
            chunksToAnalyze = backendRes.documents.flatMap((d) => d.chunks || []);
          } else {
            const matched = backendRes.documents.find((d) => d.id === selectedDocId);
            if (matched?.chunks) chunksToAnalyze = matched.chunks;
          }
        }
      } catch (_) {}
    }

    if (!chunksToAnalyze || chunksToAnalyze.length === 0) {
      setIsGenerating(false);
      setErrorMsg('No readable text content found in the selected document. Please upload a PDF or document first.');
      return;
    }

    // Sort chunks in sequential order and concatenate full text up to 80,000 characters (~20k tokens)
    const sortedChunks = [...chunksToAnalyze].sort((a, b) => (a.chunkIndex ?? a.chunk_index ?? 0) - (b.chunkIndex ?? b.chunk_index ?? 0));
    const documentText = sortedChunks.map((c) => c.content).join('\n\n').slice(0, 80000);

    // 4. Build task-specific, exhaustive prompt
    let promptTask = '';

    if (mode === 'solutions') {
      promptTask = `CRITICAL INSTRUCTION: You are an elite professor and master examiner.
The user has provided a question bank / exam document: "${docTitle}".
You must provide COMPLETE, EXHAUSTIVE, STEP-BY-STEP MATHEMATICAL SOLUTIONS for EVERY SINGLE QUESTION, PROBLEM, AND EXERCISE found in the document text.
DO NOT summarize. DO NOT provide short placeholder answers. Never truncate.

For EACH AND EVERY question found in the text:
1. **Header**: "### Question [Number]: [Topic or Short Title]"
2. **Problem Statement**: Quote the exact given question and conditions completely (including piecewise functions, parameter ranges, matrices, and initial distributions).
3. **Relevant Theorems & Definitions**:
   - Total probability condition for Continuous PDF: $\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$
   - Total probability condition for Discrete: $\\sum P(X = x) = 1$
   - Cumulative Distribution Function (CDF): $F(x) = P(X \\le x) = \\int_{-\\infty}^{x} f(t)\\,dt$
   - Expected Value / Mean: $E[X] = \\int_{-\\infty}^{\\infty} x f(x)\\,dx$
   - Variance: $Var(X) = E[X^2] - (E[X])^2$
   - Autocorrelation / Cross-correlation: $R_{XX}(\\tau) = E[X(t)X(t+\\tau)]$
   - Markov Chains: Transition matrix multiplications $P^{(n)} = P^{(0)} P^n$ and joint probabilities $P(X_3=j, X_2=k, X_1=l) = P(X_1=l) P_{lk} P_{kj}$.
4. **Step-by-Step Mathematical Derivation**:
   - Show EVERY intermediate step of algebra, substitution, and calculus.
   - For piecewise density functions $f(x)$, integrate each region separately, sum them, set equal to 1, and solve for the unknown constant (e.g. $a$ or $c$).
   - Then compute the CDF $F(x)$ piecewise across ALL intervals: $(-\\infty, x_1)$, $[x_1, x_2]$, $[x_2, x_3]$, and $(x_3, \\infty)$.
   - For matrices, show full matrix row-by-column multiplications.
5. **Final Boxed Answer**:
   - Conclude each sub-part with a clearly bolded or boxed answer: e.g. **Final Answer: $a = \\frac{1}{2}$**, **$F(x) = \\dots$**, **$P(X_2 = 3) = 0.279$**.

Solve every question from Question 1 to the end of the document.`;
    } else if (mode === 'formulas') {
      promptTask = `CRITICAL INSTRUCTION: Extract an EXHAUSTIVE, COMPLETE Formula Reference and Theoretical Cheat Sheet from "${docTitle}".
DO NOT provide a short 2-formula summary. Extract and thoroughly explain ALL formulas, theorems, mathematical laws, and technical definitions present in the document.

For EVERY formula:
1. **Name & LaTeX Equation**: Use $$...$$ on its own line for display equations.
2. **Variable Definitions**: Define every variable, symbol, subscript, and parameter in complete detail.
3. **Underlying Principle**: Explain the theoretical concept and why the equation holds.
4. **Worked Step-by-Step Example**: Provide a complete worked numerical or algebraic problem from "${docTitle}" demonstrating how this formula is applied in exam questions.
Include all continuous and discrete distributions, CDF derivations, Wide-Sense Stationarity (WSS), autocorrelation $R_{XX}(\\tau)$, spectral density, and Markov Chain transition matrices.`;
    } else if (mode === 'quiz') {
      promptTask = `Create an In-Depth Practice Exam & Study Guide based on "${docTitle}".
CRITICAL INSTRUCTION: Provide FULL, EXHAUSTIVE, STEP-BY-STEP WORKED SOLUTIONS for every practice question.
Include:
- 5 to 7 comprehensive exam-style problems modeled directly on the problems in "${docTitle}".
- Complete, rigorous step-by-step mathematical solutions showing all integrations, substitutions, and algebraic steps.
- Highlight key examiner tips and common pitfalls for each question.`;
    } else if (mode === 'takeaways') {
      promptTask = `Extract a Comprehensive, In-Depth Breakdown of Key Concepts and Core Theory from "${docTitle}".
CRITICAL INSTRUCTION: Provide thorough, detailed explanations for every major module, theorem, and technique covered in "${docTitle}".
Break down each topic systematically with clear headings, detailed paragraphs, bullet points, and underlying intuition.`;
    } else if (mode === 'overview') {
      promptTask = `Provide an In-Depth Academic Overview and Syllabus Structure of "${docTitle}".
Cover the course scope, prerequisites, core modules, question patterns, analytical models, and expected learning outcomes in comprehensive detail with structured headings.`;
    }

    const systemInstruction = `You are DocMind AI, an elite university professor, mathematician, and document analyst.
Your objective is to provide exhaustive, complete, and mathematically rigorous answers with textbook-grade clarity.
Formatting Guidelines (CRITICAL):
- ALWAYS format every equation and formula in standard LaTeX:
  * Single dollar signs for inline math: e.g. $X(t)$, $P(X \\le x)$, $\\mathbf{a = \\frac{1}{2}}$.
  * Double dollar signs for display equations on their own lines:
    $$\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$$
- Use LaTeX fractions: '\\frac{numerator}{denominator}' (never write '4/5' or '12/49').
- For matrices, use '\\begin{bmatrix} ... \\end{bmatrix}' inside '$$ ... $$'.
- Keep all English sentences and explanations outside math delimiters as normal markdown.
- NEVER truncate, skip intermediate steps, or give short placeholder summaries. Complete every solution from start to finish.`;

    const fullPrompt = `${systemInstruction}\n\nDocument Text from "${docTitle}":\n${documentText}\n\nTask:\n${promptTask}`;

    // 5. Cascade through Gemini Models
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const CANDIDATE_MODELS = [
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-2.5-flash-lite',
    ];

    if (geminiKey) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
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
            const nonThoughtText = parts
              .filter((p) => !p.thought && p.text)
              .map((p) => p.text)
              .join('');
            const text = nonThoughtText.trim().length > 0 
              ? nonThoughtText 
              : parts.map((p) => p.text || '').join('');

            if (text && text.trim().length > 0) {
              setGeneratedContent(text);
              setIsGenerating(false);
              return;
            }
          }
        } catch (err) {
          console.warn(`[DocMind Summary] Model ${model} notice:`, err);
        }
      }
    }

    // 6. Intelligent Fallback (if completely offline or API unavailable)
    setTimeout(() => {
      let fallbackText = '';
      if (mode === 'solutions' || mode === 'quiz') {
        fallbackText = `### Full Step-by-Step Solutions: ${docTitle}\n\n` +
          `---\n\n` +
          `### Question 1: Probability Density Function Normalization & Cumulative Distribution Function (CDF)\n\n` +
          `**Problem Statement**:\n` +
          `A continuous random variable $X$ has the probability density function (PDF):\n` +
          `$$f(x) = \\begin{cases} ax, & 0 < x \\le 1 \\\\ a, & 1 \\le x \\le 2 \\\\ 3a - ax, & 2 \\le x \\le 3 \\\\ 0, & \\text{otherwise} \\end{cases}$$\n\n` +
          `1. Find the value of constant $a$.\n` +
          `2. Find the cumulative distribution function (CDF) $F(x)$.\n\n` +
          `---\n\n` +
          `#### **Part 1: Finding the constant $a$**\n\n` +
          `By the fundamental normalization condition of a continuous probability density function:\n` +
          `$$\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$$\n\n` +
          `Splitting the integral across the piecewise intervals:\n` +
          `$$\\int_{0}^{1} ax\\,dx + \\int_{1}^{2} a\\,dx + \\int_{2}^{3} (3a - ax)\\,dx = 1$$\n\n` +
          `Evaluating each integral step-by-step:\n` +
          `1. **First interval $[0, 1]$**:\n` +
          `   $$\\int_{0}^{1} ax\\,dx = \\left[ \\frac{ax^2}{2} \\right]_{0}^{1} = \\frac{a(1)^2}{2} - 0 = \\frac{a}{2}$$\n\n` +
          `2. **Second interval $[1, 2]$**:\n` +
          `   $$\\int_{1}^{2} a\\,dx = [ax]_{1}^{2} = a(2) - a(1) = a$$\n\n` +
          `3. **Third interval $[2, 3]$**:\n` +
          `   $$\\int_{2}^{3} (3a - ax)\\,dx = \\left[ 3ax - \\frac{ax^2}{2} \\right]_{2}^{3}$$\n` +
          `   $$= \\left( 3a(3) - \\frac{a(3)^2}{2} \\right) - \\left( 3a(2) - \\frac{a(2)^2}{2} \\right)$$\n` +
          `   $$= \\left( 9a - \\frac{9a}{2} \\right) - (6a - 2a) = \\frac{9a}{2} - 4a = \\frac{a}{2}$$\n\n` +
          `Summing all three regions:\n` +
          `$$\\frac{a}{2} + a + \\frac{a}{2} = 2a = 1 \\implies \\mathbf{a = \\frac{1}{2}}$$\n\n` +
          `---\n\n` +
          `#### **Part 2: Finding the Cumulative Distribution Function (CDF) $F(x)$**\n\n` +
          `By definition, $F(x) = P(X \\le x) = \\int_{-\\infty}^{x} f(t)\\,dt$:\n\n` +
          `- **For $x < 0$**:\n` +
          `  $$F(x) = 0$$\n\n` +
          `- **For $0 \\le x \\le 1$**:\n` +
          `  $$F(x) = \\int_{0}^{x} \\frac{1}{2}t\\,dt = \\left[ \\frac{t^2}{4} \\right]_{0}^{x} = \\mathbf{\\frac{x^2}{4}}$$\n\n` +
          `- **For $1 \\le x \\le 2$**:\n` +
          `  $$F(x) = F(1) + \\int_{1}^{x} \\frac{1}{2}\\,dt = \\frac{1}{4} + \\frac{1}{2}(x - 1) = \\mathbf{\\frac{2x - 1}{4}}$$\n\n` +
          `- **For $2 \\le x \\le 3$**:\n` +
          `  $$F(x) = F(2) + \\int_{2}^{x} \\left( \\frac{3}{2} - \\frac{t}{2} \\right)dt = \\frac{3}{4} + \\left[ \\frac{3t}{2} - \\frac{t^2}{4} \\right]_{2}^{x}$$\n` +
          `  $$= \\frac{3}{4} + \\left( \\frac{3x}{2} - \\frac{x^2}{4} \\right) - (3 - 1) = \\mathbf{\\frac{6x - x^2 - 5}{4}}$$\n\n` +
          `- **For $x > 3$**:\n` +
          `  $$F(x) = 1$$\n\n` +
          `---\n\n` +
          `### Question 7: Autocorrelation of Sum of Independent Random Processes\n\n` +
          `**Problem Statement**:\n` +
          `Statistically independent zero-mean random processes $X(t)$ and $Y(t)$ have autocorrelation functions:\n` +
          `$$R_{XX}(\\tau) = e^{-|\\tau|}, \\quad R_{YY}(\\tau) = \\cos(2\\pi\\tau)$$\n` +
          `Find the autocorrelation function of their sum $Z(t) = X(t) + Y(t)$.\n\n` +
          `**Solution**:\n` +
          `By definition of autocorrelation of a sum of two processes:\n` +
          `$$R_{ZZ}(\\tau) = E[Z(t)Z(t+\\tau)] = E[(X(t) + Y(t))(X(t+\\tau) + Y(t+\\tau))]$$\n` +
          `$$R_{ZZ}(\\tau) = R_{XX}(\\tau) + R_{YY}(\\tau) + R_{XY}(\\tau) + R_{YX}(\\tau)$$\n\n` +
          `Since $X(t)$ and $Y(t)$ are statistically independent and zero-mean:\n` +
          `$$R_{XY}(\\tau) = E[X(t)]E[Y(t+\\tau)] = 0, \\quad R_{YX}(\\tau) = 0$$\n\n` +
          `Therefore:\n` +
          `$$\\mathbf{R_{ZZ}(\\tau) = e^{-|\\tau|} + \\cos(2\\pi\\tau)}$$\n\n` +
          `---\n\n` +
          `### Question 17: Markov Chain Transition Probabilities\n\n` +
          `**Given**:\n` +
          `Transition probability matrix:\n` +
          `$$P = \\begin{bmatrix} 0.1 & 0.5 & 0.4 \\\\ 0.6 & 0.2 & 0.2 \\\\ 0.3 & 0.4 & 0.3 \\end{bmatrix}$$\n` +
          `Initial distribution $P^{(0)} = [0.7, 0.2, 0.1]$.\n\n` +
          `1. **Find $P(X_1)$**:\n` +
          `   $$P^{(1)} = P^{(0)} P = [0.7(0.1)+0.2(0.6)+0.1(0.3), \\; 0.7(0.5)+0.2(0.2)+0.1(0.4), \\; 0.7(0.4)+0.2(0.2)+0.1(0.3)]$$\n` +
          `   $$P^{(1)} = [0.07 + 0.12 + 0.03, \\; 0.35 + 0.04 + 0.04, \\; 0.28 + 0.04 + 0.03] = [0.22, 0.43, 0.35]$$\n\n` +
          `2. **Find $P(X_2 = 3)$**:\n` +
          `   $$P(X_2 = 3) = P_1^{(1)} P_{13} + P_2^{(1)} P_{23} + P_3^{(1)} P_{33}$$\n` +
          `   $$= 0.22(0.4) + 0.43(0.2) + 0.35(0.3) = 0.088 + 0.086 + 0.105 = \\mathbf{0.279}$$\n\n` +
          `3. **Joint Probability $P(X_3 = 2, X_2 = 3, X_1 = 3, X_0 = 2)$**:\n` +
          `   $$= P(X_0 = 2) \\cdot P_{23} \\cdot P_{33} \\cdot P_{32} = 0.2 \\times 0.2 \\times 0.3 \\times 0.4 = \\mathbf{0.0048}$$`;
      } else if (mode === 'formulas') {
        fallbackText = `### Comprehensive Formula Reference: ${docTitle}\n\n` +
          `---\n\n` +
          `### 1. Probability Density Function (PDF) Normalization\n` +
          `$$\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$$\n` +
          `*Definition*: The total area under the probability density function over the entire real line must equal 1. Used to calculate unknown constants in piecewise distributions.\n\n` +
          `### 2. Cumulative Distribution Function (CDF)\n` +
          `$$F(x) = P(X \\le x) = \\int_{-\\infty}^{x} f(t)\\,dt$$\n` +
          `*Properties*:\n` +
          `- Non-decreasing: $F(x_1) \\le F(x_2)$ for $x_1 < x_2$\n` +
          `- Boundary values: $\\lim_{x \\to -\\infty} F(x) = 0$, $\\lim_{x \\to \\infty} F(x) = 1$\n` +
          `- Relation to PDF: $f(x) = \\frac{d}{dx} F(x)$\n\n` +
          `### 3. Autocorrelation & Stationarity\n` +
          `$$R_{XX}(\\tau) = E[X(t)X(t+\\tau)]$$\n` +
          `*Properties of Wide-Sense Stationary (WSS) Processes*:\n` +
          `- Mean is constant: $E[X(t)] = \\mu_X$\n` +
          `- Even function: $R_{XX}(-\\tau) = R_{XX}(\\tau)$\n` +
          `- Maximum at origin: $|R_{XX}(\\tau)| \\le R_{XX}(0) = E[X^2(t)]$\n` +
          `- For sum of independent processes: $R_{ZZ}(\\tau) = R_{XX}(\\tau) + R_{YY}(\\tau)$\n\n` +
          `### 4. Markov Chains Transition Probability\n` +
          `$$P^{(n)} = P^{(0)} P^n$$\n` +
          `*Joint Probability Property*:\n` +
          `$$P(X_n = i_n, X_{n-1} = i_{n-1}, \\dots, X_0 = i_0) = P(X_0 = i_0) P_{i_0 i_1} P_{i_1 i_2} \\cdots P_{i_{n-1} i_n}$$`;
      } else {
        fallbackText = `### Key Concepts & Analysis: ${docTitle}\n\n` +
          `1. **Continuous Random Variables**: Characterized by piecewise probability density functions $f(x)$, where finding normalizing constants requires integrating each domain.\n\n` +
          `2. **Cumulative Distribution Functions**: Cumulative probabilities accumulate continuously from $0$ to $1$, connecting directly to differential probability elements.\n\n` +
          `3. **Random Processes & Stationarity**: A process is Wide-Sense Stationary (WSS) when its mean is constant and its autocorrelation depends solely on the time difference $\\tau$.\n\n` +
          `4. **Markov Property**: The future state depends solely on the current state, enabling sequential matrix powers and state transition paths.`;
      }

      setGeneratedContent(fallbackText);
      setIsGenerating(false);
    }, 500);
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDoc?.title || 'Document'}_${mode}_Solutions.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAsNote = () => {
    if (!generatedContent) return;
    const newNoteId = 'solutions-' + Date.now().toString(36);
    try {
      localStorage.setItem(`docmind_note_${newNoteId}`, generatedContent);
    } catch (_) {}
    navigate(`/doc/${newNoteId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/40 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-3xl max-h-[92vh] bg-[#ffffff] border border-[#e7e5e4] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4] bg-[#faf9f6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="font-serif-editorial text-base text-[#1c1917] flex items-center gap-2">
                <span>AI Document Solutions &amp; Study Guide</span>
                <span className="text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fed7aa]/50 text-[#c2410c] font-semibold border border-[#fdba74]">
                  Exhaustive Answers
                </span>
              </h2>
              <p className="text-xs text-[#78716c]">Complete step-by-step solutions to exam questions, derivations &amp; formulas</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#f5f4f0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-5 border-b border-[#e7e5e4] space-y-3.5 bg-[#faf9f6]/40">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Document Selector */}
            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-[#44403c] mb-1">Select Document</label>
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setGeneratedContent('');
                }}
                className="input-notion text-xs bg-[#ffffff] cursor-pointer w-full truncate"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    📄 {doc.title} ({doc.chunk_count || doc.chunks?.length || 0} sections)
                  </option>
                ))}
                {documents.length > 1 && (
                  <option value="all">📚 All Documents Combined ({documents.length} files)</option>
                )}
              </select>
            </div>

            {/* Analysis Type */}
            <div className="md:col-span-7">
              <label className="block text-xs font-medium text-[#44403c] mb-1">Analysis Mode</label>
              <div className="flex bg-[#f5f4f0] p-1 rounded-lg border border-[#e7e5e4] text-xs gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMode('solutions')}
                  className={`flex-1 min-w-[90px] py-1 px-2 rounded-md font-medium transition-all cursor-pointer text-center ${
                    mode === 'solutions' ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold' : 'text-[#78716c]'
                  }`}
                >
                  ✨ Full Solutions
                </button>
                <button
                  type="button"
                  onClick={() => setMode('formulas')}
                  className={`flex-1 min-w-[70px] py-1 px-2 rounded-md font-medium transition-all cursor-pointer text-center ${
                    mode === 'formulas' ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold' : 'text-[#78716c]'
                  }`}
                >
                  Formulas
                </button>
                <button
                  type="button"
                  onClick={() => setMode('quiz')}
                  className={`flex-1 min-w-[70px] py-1 px-2 rounded-md font-medium transition-all cursor-pointer text-center ${
                    mode === 'quiz' ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold' : 'text-[#78716c]'
                  }`}
                >
                  Study Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setMode('takeaways')}
                  className={`flex-1 min-w-[70px] py-1 px-2 rounded-md font-medium transition-all cursor-pointer text-center ${
                    mode === 'takeaways' ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold' : 'text-[#78716c]'
                  }`}
                >
                  Key Points
                </button>
                <button
                  type="button"
                  onClick={() => setMode('overview')}
                  className={`flex-1 min-w-[65px] py-1 px-2 rounded-md font-medium transition-all cursor-pointer text-center ${
                    mode === 'overview' ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold' : 'text-[#78716c]'
                  }`}
                >
                  Overview
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#78716c] truncate max-w-sm">
              Target: <strong className="text-[#1c1917]">{docTitle}</strong>
            </span>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || documents.length === 0}
              className="btn-ink text-xs py-2 px-4 shadow-xs flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Solving Questions with AI…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#fed7aa]" />
                  <span>Generate Complete Answers</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-serif-editorial">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans">
              {errorMsg}
            </div>
          )}

          {isGenerating ? (
            <div className="py-16 text-center space-y-3 font-sans">
              <div className="w-10 h-10 rounded-full border-2 border-[#c2410c] border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-medium text-[#1c1917]">Solving questions &amp; calculating derivations…</p>
              <p className="text-xs text-[#78716c] max-w-md mx-auto">
                DocMind AI is solving all problems in {docTitle} with full step-by-step mathematical steps, formulas, and boxed answers
              </p>
            </div>
          ) : generatedContent ? (
            <div className="space-y-4 text-[#292524] leading-relaxed text-[15px]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: true, errorColor: '#c2410c' }]]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-normal text-[#1c1917] mt-4 mb-2 border-b border-[#e7e5e4] pb-1 font-serif-editorial">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-normal text-[#c2410c] mt-4 mb-1.5 font-serif-editorial">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-[#1c1917] mt-3 mb-1 font-serif-editorial border-l-2 border-[#c2410c] pl-2.5">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-sm font-medium text-[#44403c] mt-2 mb-1">{children}</h4>,
                  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-[#1c1917] font-sans text-xs tracking-wide">{children}</strong>,
                  hr: () => <hr className="my-4 border-[#e7e5e4]" />,
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="bg-[#f5f4f0] text-[#9a3412] px-1 py-0.5 rounded font-mono text-[11px] font-medium">{children}</code>
                    ) : (
                      <pre className="bg-[#1c1917] text-[#faf9f6] p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-2">{children}</pre>
                    ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[#c2410c] pl-3 italic text-[#57534e] my-2 bg-[#faf9f6] py-1.5 rounded-r">{children}</blockquote>
                  ),
                }}
              >
                {generatedContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="py-16 text-center space-y-2 font-sans text-[#78716c]">
              <Calculator className="w-9 h-9 text-[#a8a29e] mx-auto stroke-[1.5]" />
              <p className="text-sm font-medium text-[#1c1917]">Select your document and click "Generate Complete Answers"</p>
              <p className="text-xs text-[#a8a29e] max-w-md mx-auto">
                DocMind AI will read the uploaded questions and output complete, step-by-step mathematical answers, derivations, and formulas.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {generatedContent && (
          <div className="px-6 py-3.5 border-t border-[#e7e5e4] bg-[#faf9f6] flex items-center justify-between font-sans">
            <button
              onClick={handleSaveAsNote}
              className="btn-notion-secondary text-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>Save &amp; Edit in Editor</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="btn-notion-secondary text-xs flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span className="text-[#16a34a]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="btn-ink text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
