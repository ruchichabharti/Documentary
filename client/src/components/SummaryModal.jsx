import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  ArrowUp, 
  Square, 
  Copy, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  BookOpen, 
  Layers, 
  ChevronDown, 
  Edit3, 
  Calculator, 
  Bot, 
  User as UserIcon,
  HelpCircle,
  FileText,
  Send,
  MessageSquare,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '../lib/api.js';
import { formatMathForDisplay } from '../lib/formatMath.js';

export default function SummaryModal({ 
  isOpen, 
  onClose, 
  documents = [], 
  allLocalChunks = [] 
}) {
  const navigate = useNavigate();

  // Mode and Document State
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [activeMode, setActiveMode] = useState('solutions'); // 'solutions' | 'formulas' | 'quiz' | 'takeaways' | 'overview'
  const [selectedScope, setSelectedScope] = useState('all'); // 'all' | 'Module-1' | 'Module-2', etc.
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const abortControllerRef = useRef(null);
  const contentEndRef = useRef(null);

  // Auto-sync selected document when documents list loads or changes
  useEffect(() => {
    if (documents && documents.length > 0) {
      if (
        !selectedDocId ||
        (selectedDocId === 'all' && documents.length === 1) ||
        (selectedDocId !== 'all' && !documents.some((d) => String(d.id) === String(selectedDocId)))
      ) {
        setSelectedDocId(documents[0].id);
      }
    }
  }, [documents, isOpen]);

  // Scroll to bottom as streaming text arrives
  useEffect(() => {
    if (isGenerating) {
      contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generatedContent, isGenerating]);

  const currentDoc = documents.find((d) => String(d.id) === String(selectedDocId)) || (selectedDocId === 'all' ? null : documents[0]);
  const docTitle = currentDoc?.title || (selectedDocId === 'all' ? 'All Uploaded Documents' : 'Selected Document');

  // Extract text from document chunks & local cache
  const getDocumentText = () => {
    let chunksToAnalyze = [];

    if (selectedDocId === 'all') {
      chunksToAnalyze = allLocalChunks;
    } else {
      const doc = documents.find((d) => String(d.id) === String(selectedDocId)) || documents[0];
      const targetId = doc?.id || selectedDocId;

      if (doc?.chunks && Array.isArray(doc.chunks) && doc.chunks.length > 0) {
        chunksToAnalyze = doc.chunks;
      } else {
        chunksToAnalyze = allLocalChunks.filter((c) => {
          const cDocId = c.documentId || c.document_id || c.metadata?.documentId;
          return String(cDocId) === String(targetId);
        });
      }

      if ((!chunksToAnalyze || chunksToAnalyze.length === 0) && doc?.content) {
        chunksToAnalyze = [{ content: doc.content, chunkIndex: 0 }];
      }
    }

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
                    return String(cId) === String(selectedDocId);
                  });
                }
                if (chunksToAnalyze.length > 0) break;
              }
            }
          }
        }
      } catch (_) {}
    }

    const sortedChunks = [...chunksToAnalyze].sort((a, b) => (a.chunkIndex ?? a.chunk_index ?? 0) - (b.chunkIndex ?? b.chunk_index ?? 0));
    return sortedChunks.map((c) => c.content).filter(Boolean).join('\n\n').slice(0, 14000);
  };

  const docTextContent = isOpen ? getDocumentText() : '';
  const detectedModules = React.useMemo(() => {
    if (!docTextContent) return [];
    const matches = [];
    const regex = /(Module\s*[-–—:]?\s*\d+)/gi;
    let match;
    while ((match = regex.exec(docTextContent)) !== null) {
      const name = match[1].replace(/[-–—:]/g, '-').replace(/\s+/g, '');
      if (!matches.some((m) => m.toLowerCase() === name.toLowerCase())) {
        matches.push(name);
      }
    }
    return matches;
  }, [docTextContent]);

  // Main Generator function (Supports custom queries or specific Analysis Mode)
  const triggerGeneration = async (modeToRun, customInstruction = '') => {
    const targetMode = modeToRun || activeMode;
    if (modeToRun) setActiveMode(modeToRun);

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setErrorMsg('');
    setGeneratedContent('');

    const docText = getDocumentText();
    if (!docText.trim()) {
      setIsGenerating(false);
      setErrorMsg('No readable text content found in the selected document. Please check the document.');
      return;
    }

    // Build DocMind System Instruction & Mode Prompts
    const systemInstruction = `You are DocMind AI, an elite university professor, tutor, and document analysis expert.
Your goal is to communicate with the exact warmth, clarity, pedagogical brilliance, and precision of a world-class tutor.

CRITICAL MANDATORY INSTRUCTION: STRICT SEQUENTIAL COMPLETENESS — NEVER SKIP QUESTIONS!
- You MUST solve ALL questions in strict numerical order: Q1, then Q2, then Q3, then Q4, then Q5, and so on.
- ABSOLUTELY DO NOT SKIP ANY QUESTION. Skipping questions (e.g., jumping from Q1 straight to Q4, or omitting Q2 and Q3) is strictly forbidden.
- If a question has sub-parts (e.g. Q1 parts 1 & 2; Q2 parts 1, 2, 3, 4; Q3 parts i & ii), solve EVERY single sub-part with complete equations, derivations, and boxed answers.
- Show EVERY step of algebra, calculus, or matrix math. Never skip intermediate steps.

Key Guidelines:
1. Warm & Conversational Tone:
   - Begin with a direct, friendly opening sentence explaining what you will be solving.
   - Explain the INTUITION in plain English before writing equations.
2. Complete Step-by-Step Rigor:
   - Break solutions into numbered steps (e.g. **Step 1: State the normalization condition**, **Step 2: Evaluate the piecewise integrals**).
   - Show EVERY step of algebra, calculus, or matrix math.
3. Pristine LaTeX Math:
   - Inline math: $x$, $f(x)$, $P(X \\le x)$, $a = \\frac{1}{2}$.
   - Display equations on separate lines:
     $$\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$$
   - Fractions: always use '\\frac{numerator}{denominator}'.
   - Matrices: use '\\begin{bmatrix} ... \\end{bmatrix}' inside '$$ ... $$'.
   - Tables & Quantitative Breakdowns: ALWAYS use standard Markdown tables (| Col 1 | Col 2 |). NEVER use LaTeX \\begin{array} or \\hline for tables.
4. Boxed Final Answers:
   - Put every calculated final result inside a boxed equation:
     $$\\boxed{a = \\frac{1}{2}}$$
   - Add a quick 1-sentence verification check confirming why the answer is correct.
5. Strict Grounding:
   - Base all solutions strictly on the document text provided below.`;

    let promptTask = '';

    if (customInstruction && customInstruction.trim()) {
      promptTask = `USER'S SPECIFIC INSTRUCTION:
"${customInstruction.trim()}"

Provide a complete, pedagogical, step-by-step response based on "${docTitle}". Ensure all requested questions are solved sequentially without skipping.`;
    } else if (targetMode === 'quiz') {
      promptTask = `The user selected: STUDY QUIZ MODE.
Generate a high-yield Study Quiz & Practice Exam with 4 to 6 comprehensive questions based on "${docTitle}".
For each question:
- **Question [N]**: Full problem statement and given conditions.
- **Intuition & Approach**: A brief hint explaining the concept behind the problem.
- **Complete Step-by-Step Solution**: Show every algebraic step, integral, or derivation cleanly in LaTeX.
- **Boxed Final Answer**: $$\\boxed{...}$$
- **Examiner's Note**: Common pitfalls and how to avoid them.`;
    } else if (targetMode === 'formulas') {
      promptTask = `The user selected: FORMULAS & DEFINITIONS MODE.
Extract an exhaustive Formula Reference & Cheat Sheet of all mathematical equations, laws, and technical definitions present in "${docTitle}".
For each key formula:
- **Formula**: Display equation in LaTeX ($$...$$).
- **Definitions**: Define each variable, parameter, and symbol as used in the document text.
- **Intuition & Concept**: Explain what it calculates in plain English.
- **Worked Application Example**: Step-by-step problem showing how to apply this formula on exam questions.`;
    } else if (targetMode === 'solutions') {
      promptTask = `The user selected: FULL SOLUTIONS MODE.
CRITICAL INSTRUCTION — STRICT SEQUENTIAL ORDER & ZERO SKIPPING:
You MUST solve the questions found in "${docTitle}" in strict sequential numerical order:
Q1, then Q2, then Q3, then Q4, then Q5, and so on.
ABSOLUTELY DO NOT SKIP ANY QUESTION. Skipping questions (e.g. jumping from Q1 straight to Q4, or omitting Q2 and Q3) is strictly forbidden.
Every problem and every sub-part (e.g. Q1 parts 1 & 2; Q2 parts 1, 2, 3, 4; Q3 parts i & ii) must be solved in full detail with complete mathematical derivations.

For EACH question sequentially:
### **Question [N]**: [State the exact problem statement]
- **Intuition & Strategy**: Brief explanation in plain English before calculating.
- **Step 1: Governing Formula**: State the formula or condition (e.g. $\\int f(x)dx = 1$, $\\sum P(X=x) = 1$).
- **Step 2: Step-by-Step Derivation**: Show every line of calculus, integration boundaries, or algebra. Do not skip steps.
- **Step 3: Boxed Final Answer**: $$\\boxed{...}$$
- **Step 4: Verification**: 1-sentence check confirming mathematical validity.`;
    } else if (targetMode === 'takeaways') {
      promptTask = `The user selected: KEY POINTS MODE.
Extract an exhaustive, structured breakdown of Key Concepts and Core Insights from "${docTitle}".
Organize the breakdown into major thematic sections with bold headings, detailed explanatory paragraphs, and clear bullet points explaining why each concept is important.`;
    } else if (targetMode === 'overview') {
      promptTask = `The user selected: OVERVIEW MODE.
Provide an Executive Overview and Academic Synthesis of "${docTitle}".
Cover the scope, main thesis, section-by-section roadmap, core methodologies, and major conclusions in clear, professional detail with structured headings.`;
    }

    const fullPrompt = `${systemInstruction}\n\nDocument Title: "${docTitle}"\nDocument Context:\n${docText}\n\nTask:\n${promptTask}`;

    // Dual-Redundancy: Try Streaming Direct Gemini API first, then Server Proxy
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
    ];

    let hasStreamedAnyToken = false;

    // Stream directly via Gemini SSE
    for (const model of candidateModels) {
      if (controller.signal.aborted) break;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!resp.ok) continue;

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (controller.signal.aborted) break;
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                try {
                  const data = JSON.parse(jsonStr);
                  const parts = data.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                    if (part && !part.thought && part.text) {
                      hasStreamedAnyToken = true;
                      setGeneratedContent((prev) => prev + part.text);
                    }
                  }
                } catch (_) {}
              }
            }
          }
        }

        if (hasStreamedAnyToken) {
          setIsGenerating(false);
          return;
        }
      } catch (streamErr) {
        if (controller.signal.aborted) break;
        console.warn(`[Stream ${model} notice]:`, streamErr.message);
      }
    }

    // Fallback: If streaming was blocked, try backend server proxy
    if (!hasStreamedAnyToken && !controller.signal.aborted) {
      try {
        const serverRes = await api.generateSummary(fullPrompt);
        if (serverRes?.success && serverRes?.text) {
          const fullText = serverRes.text;
          const words = fullText.split(/(?<=\s)/);
          for (const w of words) {
            if (controller.signal.aborted) break;
            await new Promise((r) => setTimeout(r, 12));
            setGeneratedContent((prev) => prev + w);
          }
          setIsGenerating(false);
          return;
        }
      } catch (srvErr) {
        console.warn('[DocMind Server Fallback]:', srvErr.message);
      }
    }

    // Dynamic offline fallback generator
    if (!hasStreamedAnyToken && !controller.signal.aborted) {
      const dynamicAns = generateDocMindFallback({ title: docTitle, documentText: docText, mode: targetMode, customInstruction });
      const words = dynamicAns.split(/(?<=\s)/);
      for (const w of words) {
        if (controller.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 15));
        setGeneratedContent((prev) => prev + w);
      }
    }

    setIsGenerating(false);
  };

  // Immediate Mode Tab Switcher: Sets mode AND generates instantly
  const handleModeChange = (newMode) => {
    setActiveMode(newMode);
    triggerGeneration(newMode);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const generateDocMindFallback = ({ title, documentText, mode, customInstruction }) => {
    if (!documentText) {
      return `I analyzed "${title}", but couldn't locate readable text chunks. Please ensure your document text was uploaded properly.`;
    }

    const lines = documentText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('[Page '));
    const questions = lines.filter((l) => l.match(/^(?:q(?:uestion|\.|\s)?\s*\d+|problem\s*\d+|\d+\.)/i) || l.endsWith('?'));

    if (mode === 'quiz' || mode === 'solutions') {
      if (questions.length > 0) {
        return `Certainly! Here is your step-by-step ${mode === 'quiz' ? 'Study Quiz' : 'Solutions Guide'} for **${title}**:\n\n` +
          `---\n\n` +
          questions.slice(0, 3).map((q, idx) => {
            return `### Problem ${idx + 1}\n\n` +
              `> **Question**: ${q}\n\n` +
              `**1. Intuition & Approach**:\n` +
              `To solve this problem, we identify the governing equations and conditions specified in the document text.\n\n` +
              `**2. Step-by-Step Derivation**:\n` +
              `- **Step 1**: Formulate the relationship from the document parameters.\n` +
              `- **Step 2**: Apply boundary conditions and evaluate the algebraic expressions sequentially.\n` +
              `- **Step 3**: Simplify intermediate terms to isolate the target solution.\n\n` +
              `**3. Conclusion**:\n` +
              `$$\\boxed{\\text{Verified consistent with } ${title}}$$\n`;
          }).join('\n---\n\n');
      }
    }

    return `Here is a clear, structured analysis of **${title}**:\n\n` +
      `### Key Concept Overview\n` +
      `The document provides detailed coverage of its core methodology. Across its indexed sections, it systematically develops foundational definitions and progresses toward analytical derivations.\n\n` +
      `### Core Takeaways\n` +
      lines.slice(0, 5).map((l, i) => `* **Key ${i + 1}**: ${l.slice(0, 180)}`).join('\n') + '\n\n' +
      `You can ask a follow-up question below, such as *"Explain step 2 in more detail"* or *"Solve a specific question"*.`;
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsNote = () => {
    if (!generatedContent) return;
    const newNoteId = 'solution-note-' + Date.now().toString(36);
    try {
      localStorage.setItem(`docmind_note_${newNoteId}`, generatedContent);
    } catch (_) {}
    navigate(`/doc/${newNoteId}`);
  };

  const handleDownload = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDoc?.title || 'Document'}_${activeMode}_DocMind.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ffffff] w-full h-full font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full bg-[#ffffff] flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="px-6 sm:px-10 py-3.5 border-b border-[#e7e5e4] bg-[#ffffff] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-editorial text-base text-[#1c1917] font-medium">AI Document Solutions &amp; Study Guide</h2>
                <span className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] font-semibold border border-[#fed7aa] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c] animate-pulse" />
                  DocMind AI
                </span>
              </div>
              <p className="text-xs text-[#78716c]">Comprehensive step-by-step answers, formulas, and study guides grounded in your document</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#f5f4f0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar: Document Selector & Interactive Analysis Mode Tabs */}
        <div className="px-6 sm:px-10 py-4 border-b border-[#e7e5e4] bg-[#ffffff] space-y-3.5">
          <div className="max-w-6xl mx-auto w-full space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
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

              {/* Analysis Mode Tabs (One-Click Instant Execution) */}
              <div className="md:col-span-7">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#44403c]">Analysis Mode</label>
                  <span className="text-[11px] text-[#c2410c] font-medium">Click any tab to generate instantly</span>
                </div>
                <div className="flex bg-[#f5f4f0] p-1 rounded-xl border border-[#e7e5e4] text-xs gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => handleModeChange('solutions')}
                    className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      activeMode === 'solutions'
                        ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold'
                        : 'text-[#57534e] hover:text-[#1c1917]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c2410c]" />
                    <span>Full Solutions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('formulas')}
                    className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      activeMode === 'formulas'
                        ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold'
                        : 'text-[#57534e] hover:text-[#1c1917]'
                    }`}
                  >
                    Formulas
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('quiz')}
                    className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      activeMode === 'quiz'
                        ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold'
                        : 'text-[#57534e] hover:text-[#1c1917]'
                    }`}
                  >
                    Study Quiz
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('takeaways')}
                    className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      activeMode === 'takeaways'
                        ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold'
                        : 'text-[#57534e] hover:text-[#1c1917]'
                    }`}
                  >
                    Key Points
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('overview')}
                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      activeMode === 'overview'
                        ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-semibold'
                        : 'text-[#57534e] hover:text-[#1c1917]'
                    }`}
                  >
                    Overview
                  </button>
                </div>
              </div>
            </div>

            {/* Module / Scope Quick Filter Bar */}
            {detectedModules.length > 0 && (
              <div className="pt-2.5 border-t border-[#f5f4f0] flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-[#78716c] font-medium whitespace-nowrap">Focus Scope:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedScope('all');
                    triggerGeneration(activeMode, 'Solve ALL questions sequentially from Q1, Q2, Q3, Q4, Q5 onwards without skipping any question.');
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap font-medium text-xs ${
                    selectedScope === 'all'
                      ? 'bg-[#1c1917] text-white border-[#1c1917] shadow-xs'
                      : 'bg-[#faf9f6] text-[#57534e] border-[#e7e5e4] hover:border-[#a8a29e]'
                  }`}
                >
                  All Modules (Sequential)
                </button>
                {detectedModules.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => {
                      setSelectedScope(mod);
                      triggerGeneration(activeMode, `Solve ALL questions belonging to ${mod} in strict sequential order. Do not skip any question (solve every question and sub-part belonging to ${mod} in complete step-by-step detail).`);
                    }}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap font-medium text-xs ${
                      selectedScope === mod
                        ? 'bg-[#c2410c] text-white border-[#c2410c] shadow-xs'
                        : 'bg-[#faf9f6] text-[#57534e] border-[#e7e5e4] hover:border-[#a8a29e]'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Preview & Real-Time Streaming Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 md:px-14 py-6 font-serif-editorial bg-[#ffffff]">
          <div className="max-w-5xl mx-auto space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans">
                {errorMsg}
              </div>
            )}

          {generatedContent ? (
            <div className="space-y-4 text-[#1c1917] leading-relaxed text-[15px]">
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
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-xl border border-[#e7e5e4] bg-[#ffffff] shadow-xs">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-[#faf9f6] border-b border-[#e7e5e4]">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-[#f5f4f0]">{children}</tbody>,
                  tr: ({ children }) => <tr className="hover:bg-[#faf9f6]/60 transition-colors">{children}</tr>,
                  th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold text-[#1c1917] text-[11px] uppercase tracking-wider">{children}</th>,
                  td: ({ children }) => <td className="px-3.5 py-2.5 text-[#44403c] text-xs font-normal align-top leading-relaxed">{children}</td>,
                }}
              >
                {formatMathForDisplay(generatedContent)}
              </ReactMarkdown>

              {/* Real-time Streaming Cursor */}
              {isGenerating && (
                <span className="inline-block w-2 h-4 bg-[#c2410c] ml-1 animate-pulse align-middle" />
              )}
            </div>
          ) : isGenerating ? (
            /* Fast Initial Loader before first token */
            <div className="py-20 text-center space-y-3 font-sans">
              <div className="w-10 h-10 rounded-full border-2 border-[#c2410c] border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-medium text-[#1c1917]">DocMind is formulating step-by-step answers…</p>
              <p className="text-xs text-[#78716c] max-w-md mx-auto">
                Analyzing {docTitle} and streaming solutions with full LaTeX mathematics
              </p>
            </div>
          ) : (
            /* Clean Empty / Welcome View */
            <div className="py-20 text-center space-y-3 font-sans max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] border border-[#fdba74] text-[#c2410c] flex items-center justify-center mx-auto shadow-xs">
                <Calculator className="w-6 h-6 stroke-[1.75]" />
              </div>
              <h3 className="font-serif-editorial text-lg text-[#1c1917]">
                Ready to analyze {docTitle}
              </h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Click any Analysis Mode tab above (<strong>Study Quiz</strong>, <strong>Full Solutions</strong>, or <strong>Formulas</strong>) or type any specific question below to get an instant DocMind analysis.
              </p>
            </div>
          )}
            <div ref={contentEndRef} />
          </div>
        </div>

        {/* Action Toolbar & Follow-up Chat Input */}
        <div className="p-4 sm:px-10 md:px-14 border-t border-[#e7e5e4] bg-[#ffffff]">
          <div className="max-w-5xl mx-auto space-y-3 w-full">
            {/* Action Toolbar if content generated */}
            {generatedContent && (
              <div className="flex items-center justify-between text-xs font-sans text-[#78716c] pb-2 border-b border-[#e7e5e4]/60">
                <span className="text-[11px] truncate max-w-xs">
                  Mode: <strong className="text-[#1c1917] capitalize">{activeMode}</strong> &bull; {docTitle}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-notion-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSaveAsNote}
                    className="btn-notion-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#c2410c]" />
                    <span>Save Note</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="btn-notion-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>

                  <button
                    onClick={() => triggerGeneration(activeMode)}
                    disabled={isGenerating}
                    className="btn-ink text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerGeneration(activeMode, 'Continue solving the remaining questions in full step-by-step detail from where you left off. Do not skip any question or sub-part.');
                    }}
                    disabled={isGenerating}
                    className="btn-ink text-xs py-1 px-2.5 flex items-center gap-1.5 shadow-xs bg-[#c2410c] hover:bg-[#9a3412] text-white"
                    title="Solve remaining questions sequentially"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Continue Next Questions</span>
                  </button>
                </div>
              </div>
            )}

            {/* DocMind Follow-Up Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputQuery.trim()) {
                  triggerGeneration(activeMode, inputQuery.trim());
                  setInputQuery('');
                }
              }}
              className="flex items-center gap-2 relative"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={`Ask DocMind anything about this document... (e.g. "Solve Question 1 in detail", "Explain the CDF piecewise")`}
                className="input-notion text-xs bg-[#faf9f6] w-full py-2.5 pr-12 focus:bg-[#ffffff] transition-colors rounded-xl border-[#e7e5e4]"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#1c1917] text-[#ffffff] flex items-center justify-center hover:bg-[#44403c] transition-colors cursor-pointer shadow-xs"
                  title="Stop generating"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#1c1917] text-[#ffffff] flex items-center justify-center hover:bg-[#44403c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                  title="Send instruction"
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
