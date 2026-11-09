import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  BookOpen,
  User,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  RotateCcw,
  Copy,
  Bookmark
} from 'lucide-react';
import { searchSimilarChunks, generateGroundedAnswer } from '../lib/rag.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function isInsideMath(fullText, index) {
  const textBefore = fullText.slice(0, index);

  const doubleMatches = textBefore.match(/\$\$/g);
  const doubleCount = doubleMatches ? doubleMatches.length : 0;
  if (doubleCount % 2 === 1) return true;

  const cleaned = textBefore.replace(/\$\$/g, '');
  const singleMatches = cleaned.match(/(?<!\\)\$/g);
  const singleCount = singleMatches ? singleMatches.length : 0;
  if (singleCount % 2 === 1) return true;

  return false;
}

function formatMathForDisplay(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  str = str.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');
  str = str.replace(/(\\begin\{(?:b|p|v|V)?matrix\}[\s\S]*?\\end\{(?:b|p|v|V)?matrix\})/g, (match) => {
    return match.replace(/\s*\|\s*/g, ' & ');
  });

  str = str.replace(/(\\begin\{(cases|aligned|align\*?|matrix|pmatrix|bmatrix|vmatrix)\}[\s\S]*?\\end\{\2\})/g, (match, p1, env, offset, fullStr) => {
    if (isInsideMath(fullStr, offset)) return match;
    return `\n$$\n${match.trim()}\n$$\n`;
  });

  str = str.replace(/\${3,}/g, '$$');
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner) => {
    const cleanedInner = inner.replace(/\n\s*\n/g, '\n');
    return `$$${cleanedInner}$$`;
  });

  str = str.replace(/∫\(from\s+([^)]+)\s+to\s+([^)]+)\)/gi, '\\int_{$1}^{$2} ');
  str = str.replace(/∫_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2} ');
  str = str.replace(/∫/g, '\\int ');

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
    if (trimmed.startsWith('```') || trimmed.startsWith('#')) return line;
    if (trimmed.includes('$')) return line;

    let l = line;
    l = l.replace(/\(\(([0-9]+)\s*\/\s*([0-9]+)\)\)/g, '(\\frac{$1}{$2})');
    l = l.replace(/\(([0-9]+)\s*\/\s*([0-9]+)\)/g, '\\frac{$1}{$2}');

    const hasLatexCmd = /\\[a-zA-Z]+/.test(l);
    if (hasLatexCmd) {
      const proseWords = l.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '').match(/[a-zA-Z]{2,}/g) || [];
      if (proseWords.length === 0 && /[=><+\-*\\^]/.test(l)) {
        return `$$${l.trim()}$$`;
      }
    }

    return l;
  });

  return processedLines.join('\n');
}

export default function ChatAssistant({
  isOpen,
  onClose,
  documents = [],
  allLocalChunks = [],
  selectedDocId = null,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to your **Research Companion**. Inquire across your volumes, and I will search the texts to synthesize answers with verified source passage citations.',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [filterDocId, setFilterDocId] = useState(selectedDocId || 'all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedDocId) {
      setFilterDocId(selectedDocId);
    }
  }, [selectedDocId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = inputQuery.trim();
    if (!query || isGenerating) return;

    setInputQuery('');
    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'assistant-' + Date.now();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: [],
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsGenerating(true);

    try {
      const docScope = filterDocId === 'all' ? null : filterDocId;
      const matchingChunks = await searchSimilarChunks({
        query,
        documentId: docScope,
        matchCount: 4,
        matchThreshold: 0.1,
        localFallbackChunks: allLocalChunks,
      });

      await generateGroundedAnswer({
        query,
        retrievedChunks: matchingChunks,
        onStreamChunk: (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: msg.content + delta } : msg
            )
          );
        },
        onComplete: ({ answer, citations }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: answer, citations, isStreaming: false }
                : msg
            )
          );
          setIsGenerating(false);
        },
      });
    } catch (err) {
      console.error('[DocMind Companion Error]', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: 'I encountered an issue searching your texts. Please try again.',
                isStreaming: false,
              }
            : msg
        )
      );
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation cleared. Which volume would you like to inquire about next?',
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const samplePrompts = [
    'Summarize the core thesis and conclusions',
    'What key methodologies are described?',
    'List actionable takeaways from this text',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-w-xl h-full bg-[#faf9f6] border-l border-[#e7e5e4] shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4] bg-[#ffffff] flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="font-serif-editorial text-base text-[#1c1917]">Reading Companion</h2>
              <p className="text-xs text-[#78716c]">Source-grounded synthesis &amp; paragraph citations</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="p-1.5 rounded-lg text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#faf9f6] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#faf9f6] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scope Filter Bar */}
        <div className="px-6 py-2.5 bg-[#faf9f6] border-b border-[#e7e5e4] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#78716c]">
            <Search className="w-3.5 h-3.5 text-[#c2410c]" />
            <span className="font-medium">Search Scope:</span>
          </div>

          <select
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value)}
            className="bg-[#ffffff] border border-[#e7e5e4] rounded-lg px-2.5 py-1 text-xs text-[#1c1917] focus:outline-none focus:border-[#1c1917] cursor-pointer max-w-[280px] truncate shadow-xs font-serif-editorial text-[13px]"
          >
            <option value="all">All Volumes ({documents.length})</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.chunk_count || 0} sections)
              </option>
            ))}
          </select>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <BookOpen className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-[#1c1917] text-[#faf9f6] rounded-br-none shadow-sm'
                    : 'bg-[#ffffff] border border-[#e7e5e4] text-[#1c1917] rounded-bl-none shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] text-[#a8a29e] mb-1">
                  <span className={msg.role === 'user' ? 'text-[#fed7aa] font-medium' : 'text-[#c2410c] font-semibold'}>
                    {msg.role === 'user' ? 'You' : 'Companion'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#a8a29e]">{msg.timestamp}</span>
                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-[#c2410c] transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[14px] leading-relaxed space-y-2">
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap font-sans text-xs text-[#faf9f6] leading-normal">{msg.content}</p>
                  ) : (
                    <div className="space-y-2 text-[#292524] font-serif-editorial text-[15px]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: true, errorColor: '#c2410c' }]]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-normal text-[#1c1917] mt-2 mb-1 border-b border-[#e7e5e4] pb-1 font-serif-editorial">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-semibold text-[#c2410c] mt-2 mb-1 font-sans">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold text-[#1c1917] mt-2 mb-1 font-sans">{children}</h3>,
                          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed font-normal">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1.5 font-normal">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1.5 font-normal">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed font-normal">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-[#1c1917]">{children}</strong>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-[#f5f4f0] text-[#9a3412] px-1 py-0.5 rounded font-mono text-[11px] font-medium">{children}</code>
                            ) : (
                              <pre className="bg-[#1c1917] text-[#faf9f6] p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-2">{children}</pre>
                            ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[#c2410c] pl-3 italic text-[#57534e] my-1.5">{children}</blockquote>
                          ),
                        }}
                      >
                        {formatMathForDisplay(msg.content)}
                      </ReactMarkdown>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-[#c2410c] ml-1 animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                </div>

                {/* Grounded Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-[#f5f4f0] mt-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#78716c] flex items-center gap-1 font-mono">
                      <Layers className="w-3 h-3 text-[#c2410c]" />
                      <span>Referenced Sources ({msg.citations.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2.5 py-1 rounded-md bg-[#fff7ed] hover:bg-[#ffedd5] border border-[#fed7aa] text-[#9a3412] text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3 h-3 text-[#c2410c]" />
                          <span>Passage {c.id}</span>
                          <span className="text-[10px] text-[#c2410c]">({c.similarity}%)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#1c1917] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs font-semibold">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Suggested prompts */}
          {messages.length === 1 && (
            <div className="pt-4 space-y-2">
              <p className="text-[11px] text-[#78716c] uppercase tracking-wider font-mono">Suggested Inquiries:</p>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputQuery(prompt)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#ffffff] hover:bg-[#faf9f6] border border-[#e7e5e4] text-xs text-[#57534e] hover:text-[#1c1917] transition-all flex items-center justify-between group cursor-pointer shadow-xs text-[13px] font-serif-editorial"
                  >
                    <span>{prompt}</span>
                    <Search className="w-3 h-3 text-[#a8a29e] group-hover:text-[#c2410c]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Source Citation Inspector Drawer */}
        <AnimatePresence>
          {selectedCitation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 bg-[#ffffff] border-t border-[#e7e5e4] space-y-2 shadow-lg relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917]">
                  <FileText className="w-3.5 h-3.5 text-[#c2410c]" />
                  <span className="font-serif-editorial text-[14px]">
                    Passage {selectedCitation.id}: {selectedCitation.documentTitle}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] text-[10px] font-mono">
                    {selectedCitation.similarity}% Match
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-[#a8a29e] hover:text-[#1c1917] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-xs text-[#57534e] max-h-36 overflow-y-auto leading-relaxed text-[13px] font-serif-editorial">
                "{selectedCitation.fullContent}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-[#ffffff] border-t border-[#e7e5e4] flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isGenerating}
            placeholder={
              documents.length === 0
                ? 'Upload a volume first to ask questions…'
                : 'Inquire across your library…'
            }
            className="input-notion text-xs text-[13px]"
          />

          <button
            type="submit"
            disabled={isGenerating || !inputQuery.trim()}
            className="btn-ink px-4"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
