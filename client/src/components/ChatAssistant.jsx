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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-w-xl h-full bg-[#0f1a18] border-l border-[#233a34] shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#233a34] bg-[#0d1715] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a2d29] border border-[#2e4d45] text-emerald-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f2f7f5]">Research Companion</h2>
              <p className="text-xs text-[#8ca89f]">Source-grounded reading and synthesis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="p-1.5 rounded-lg text-[#526f67] hover:text-[#f2f7f5] hover:bg-[#1a2d29] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#526f67] hover:text-[#f2f7f5] hover:bg-[#1a2d29] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scope Filter Bar */}
        <div className="px-6 py-2.5 bg-[#0b1412] border-b border-[#233a34] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#8ca89f]">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Scope:</span>
          </div>

          <select
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value)}
            className="bg-[#14221f] border border-[#233a34] rounded-lg px-2.5 py-1 text-xs text-[#f2f7f5] focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[280px] truncate shadow-xs"
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
                <div className="w-7 h-7 rounded-lg bg-[#1a2d29] border border-[#2e4d45] text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-[#1b2e2a] border border-[#2e4d45] text-[#f2f7f5] rounded-br-none shadow-xs'
                    : 'bg-[#14221f] border border-[#233a34] text-[#e2ede8] rounded-bl-none shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] text-[#526f67] mb-1">
                  <span className={msg.role === 'user' ? 'text-emerald-300 font-mono' : 'text-emerald-400 font-medium'}>
                    {msg.role === 'user' ? 'You' : 'Companion'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{msg.timestamp}</span>
                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-emerald-300 transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[14px] leading-relaxed space-y-2">
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap font-sans text-xs">{msg.content}</p>
                  ) : (
                    <div className="space-y-2 text-[#e2ede8]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: true, errorColor: '#10b981' }]]}
                        components={{
                          h1: ({ children }) => <h1 className="text-sm font-semibold text-[#f2f7f5] mt-2 mb-1 border-b border-[#233a34] pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xs font-semibold text-emerald-300 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold text-[#f2f7f5] mt-2 mb-1">{children}</h3>,
                          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-[#1a2d29] text-emerald-300 px-1 py-0.5 rounded font-mono text-[11px]">{children}</code>
                            ) : (
                              <pre className="bg-[#0a1110] border border-[#233a34] p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto my-2 text-emerald-200">{children}</pre>
                            ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-emerald-500 pl-3 italic text-[#8ca89f] my-1.5">{children}</blockquote>
                          ),
                        }}
                      >
                        {formatMathForDisplay(msg.content)}
                      </ReactMarkdown>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                </div>

                {/* Grounded Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-[#1f342f] mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8ca89f] flex items-center gap-1 font-mono">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>Referenced Sources ({msg.citations.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2.5 py-1 rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>Passage {c.id}</span>
                          <span className="text-[10px] text-emerald-400/80">({c.similarity}%)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#1a2d29] border border-[#2e4d45] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Suggested prompts */}
          {messages.length === 1 && (
            <div className="pt-4 space-y-2">
              <p className="text-[11px] font-mono text-[#526f67] uppercase tracking-wider">Suggested Questions:</p>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputQuery(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-[#14221f] hover:bg-[#1b2e2a] border border-[#233a34] text-xs text-[#8ca89f] hover:text-[#f2f7f5] transition-all flex items-center justify-between group cursor-pointer shadow-xs text-[13px]"
                  >
                    <span>{prompt}</span>
                    <Search className="w-3 h-3 text-[#526f67] group-hover:text-emerald-400" />
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
              className="p-4 bg-[#14221f] border-t border-[#233a34] space-y-2 shadow-lg relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#f2f7f5]">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Passage {selectedCitation.id}: {selectedCitation.documentTitle}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                    {selectedCitation.similarity}% Match
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-[#526f67] hover:text-[#f2f7f5] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#0d1715] border border-[#1f342f] text-xs text-[#8ca89f] max-h-36 overflow-y-auto leading-relaxed text-[13px] font-mono">
                "{selectedCitation.fullContent}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-[#0d1715] border-t border-[#233a34] flex gap-2">
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
            className="input-nordic text-xs text-[13px]"
          />

          <button
            type="submit"
            disabled={isGenerating || !inputQuery.trim()}
            className="btn-emerald px-4"
          >
            <Send className="w-4 h-4 text-[#051410]" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
