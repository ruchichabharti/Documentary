import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  RotateCcw,
  Copy,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { searchSimilarChunks, generateGroundedAnswer } from '../lib/rag.js';

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
      content: 'Hello! I am **DocMind**, your AI document assistant. Ask me questions about any of your ingested documents, and I will synthesize grounded answers with verifiable source citations.',
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

  // Sync selectedDocId prop
  useEffect(() => {
    if (selectedDocId) {
      setFilterDocId(selectedDocId);
    }
  }, [selectedDocId]);

  // Scroll to bottom when messages change
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

    // Add user message
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
      // 1. Vector Search for relevant chunks
      const docScope = filterDocId === 'all' ? null : filterDocId;
      const matchingChunks = await searchSimilarChunks({
        query,
        documentId: docScope,
        matchCount: 4,
        matchThreshold: 0.1,
        localFallbackChunks: allLocalChunks,
      });

      // 2. Stream Grounded LLM Response
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
      console.error('[DocMind Chat Error]', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: 'Sorry, I encountered an error while searching your documents. Please try again.',
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
        content: 'Chat history cleared. What document would you like to explore?',
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const samplePrompts = [
    'Summarize the core takeaways of my documents',
    'What are the key technical architectural decisions?',
    'Find any security or compliance requirements mentioned',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-w-2xl h-full bg-[#0d0f17] border-l border-slate-800 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 bg-[#121422]/90 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>DocMind Q&A Assistant</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  pgvector RAG
                </span>
              </h2>
              <p className="text-xs text-slate-400">Grounded semantic search with verified source citations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scope Filter Bar */}
        <div className="px-6 py-2.5 bg-[#090b12] border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Search Scope:</span>
          </div>

          <select
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value)}
            className="bg-[#151726] border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[280px] truncate"
          >
            <option value="all">All Documents ({documents.length})</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.chunk_count || 0} chunks)
              </option>
            ))}
          </select>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                    : 'bg-[#151726]/90 border border-slate-800/90 text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 mb-1">
                  <span className={msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}>
                    {msg.role === 'user' ? 'You' : 'DocMind AI'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-white transition-colors"
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

                <div className="whitespace-pre-wrap font-sans space-y-1">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                  )}
                </div>

                {/* Grounded Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Verified Source Citations ({msg.citations.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCitation(c)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Source {c.id}</span>
                          <span className="text-[10px] text-indigo-400/80 font-mono">({c.similarity}%)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Quick Prompts if only welcome message exists */}
          {messages.length === 1 && (
            <div className="pt-4 space-y-2">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Suggested Queries:</p>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputQuery(prompt);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-[#151726]/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/30 text-xs text-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
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
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="p-4 bg-[#151829] border-t border-indigo-500/30 space-y-2 shadow-xl relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Source {selectedCitation.id}: {selectedCitation.documentTitle}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                    {selectedCitation.similarity}% Match
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                {selectedCitation.fullContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-[#121422] border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isGenerating}
            placeholder={
              documents.length === 0
                ? 'Please ingest a document first to ask questions...'
                : 'Ask anything about your documents (e.g. What is the key conclusion?)...'
            }
            className="flex-1 bg-[#1a1c2d] border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isGenerating || !inputQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
