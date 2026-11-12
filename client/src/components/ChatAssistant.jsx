import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Clock,
  Sparkles,
  Filter,
  History
} from 'lucide-react';
import { searchSimilarChunks, generateGroundedAnswer } from '../lib/rag.js';
import { formatMathForDisplay } from '../lib/formatMath.js';
import { api } from '../lib/api.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const defaultWelcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! Ask me any question about your uploaded documents, and I will give you clear answers with exact page citations so you can verify the facts.',
  citations: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

function createNewThread(docId = 'all', docTitle = 'All Documents') {
  return {
    id: 'thread-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title: 'New Conversation',
    docId: docId || 'all',
    docTitle: docTitle || 'All Documents',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        ...defaultWelcomeMessage,
        id: 'welcome-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };
}

export default function ChatAssistant({
  isOpen,
  onClose,
  documents = [],
  allLocalChunks = [],
  selectedDocId = null,
  user = null,
}) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDocFilter, setHistoryDocFilter] = useState('all');

  const [inputQuery, setInputQuery] = useState('');
  const [filterDocId, setFilterDocId] = useState(selectedDocId || 'all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  const storageKey = useMemo(() => {
    const email = user?.email?.trim()?.toLowerCase() || 'guest';
    return `docmind_chat_threads_${email}`;
  }, [user?.email]);

  // Load chat history from localStorage and sync with server
  useEffect(() => {
    if (!isOpen) return;

    let loaded = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch (e) {
      console.warn('[DocMind] Error loading chat threads from localStorage:', e);
    }

    // Background server fetch to sync and merge
    api.listChats()
      .then((res) => {
        if (res?.threads && Array.isArray(res.threads) && res.threads.length > 0) {
          setThreads((current) => {
            const map = new Map();
            current.forEach((t) => map.set(t.id, t));
            res.threads.forEach((t) => {
              if (!map.has(t.id) || new Date(t.updatedAt) > new Date(map.get(t.id).updatedAt)) {
                map.set(t.id, t);
              }
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      })
      .catch(() => {});

    // If no threads exist in localStorage, create the first one
    if (loaded.length === 0) {
      const targetDoc = documents.find((d) => String(d.id) === String(selectedDocId));
      const initial = createNewThread(
        selectedDocId || 'all',
        targetDoc?.title || 'All Documents'
      );
      loaded = [initial];
      try {
        localStorage.setItem(storageKey, JSON.stringify(loaded));
      } catch (_) {}
    }

    setThreads(loaded);

    // If user opened Chat Assistant from a specific document card, switch to or create thread for that doc
    if (selectedDocId && selectedDocId !== 'all') {
      const docMatch = documents.find((d) => String(d.id) === String(selectedDocId));
      const existingDocThread = loaded.find((t) => String(t.docId) === String(selectedDocId));
      if (existingDocThread) {
        setActiveThreadId(existingDocThread.id);
        setFilterDocId(selectedDocId);
      } else {
        const newDocThread = createNewThread(selectedDocId, docMatch?.title || 'Selected Document');
        const updated = [newDocThread, ...loaded];
        setThreads(updated);
        setActiveThreadId(newDocThread.id);
        setFilterDocId(selectedDocId);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (_) {}
      }
    } else {
      setActiveThreadId(loaded[0].id);
      setFilterDocId(loaded[0].docId || 'all');
    }
  }, [isOpen, selectedDocId, storageKey]);

  // Sync selectedDocId if prop changes while modal is open
  useEffect(() => {
    if (selectedDocId) {
      setFilterDocId(selectedDocId);
    }
  }, [selectedDocId]);

  // Current active thread and messages
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0] || null;
  }, [threads, activeThreadId]);

  const messages = activeThread?.messages || [];

  // Scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Helper to persist threads to localStorage and sync active thread to backend
  const persistThreads = (updatedList, syncThread = null) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('[DocMind] Storage write error:', e);
    }
    if (syncThread) {
      api.saveChat(syncThread).catch(() => {});
    }
  };

  // Create a brand new conversation thread
  const handleNewChat = (customDocId = null) => {
    const targetDocId = customDocId || filterDocId || 'all';
    const doc = documents.find((d) => String(d.id) === String(targetDocId));
    const newThread = createNewThread(targetDocId, doc?.title || 'All Documents');

    const updated = [newThread, ...threads];
    setThreads(updated);
    setActiveThreadId(newThread.id);
    setFilterDocId(targetDocId);
    persistThreads(updated, newThread);
  };

  // Switch to a previous conversation thread
  const handleSelectThread = (threadId) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    setActiveThreadId(thread.id);
    setFilterDocId(thread.docId || 'all');
  };

  // Delete a specific conversation thread
  const handleDeleteThread = (threadId, e) => {
    e?.stopPropagation();
    const remaining = threads.filter((t) => t.id !== threadId);
    if (remaining.length === 0) {
      const fresh = createNewThread(filterDocId, 'All Documents');
      remaining.push(fresh);
    }
    setThreads(remaining);
    if (activeThreadId === threadId) {
      setActiveThreadId(remaining[0].id);
      setFilterDocId(remaining[0].docId || 'all');
    }
    persistThreads(remaining);
    api.deleteChat(threadId).catch(() => {});
  };

  // Clear all previous conversation threads
  const handleClearAllThreads = () => {
    if (!window.confirm('Delete all previous chat conversations? This cannot be undone.')) return;
    const fresh = createNewThread(filterDocId, 'All Documents');
    const reset = [fresh];
    setThreads(reset);
    setActiveThreadId(fresh.id);
    setFilterDocId('all');
    persistThreads(reset);
    api.clearChats().catch(() => {});
  };

  // Reset the current active conversation
  const handleResetCurrentChat = () => {
    if (!activeThread) return;
    const resetThread = {
      ...activeThread,
      title: 'New Conversation',
      messages: [
        {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: 'Conversation reset. What would you like to ask about next?',
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const updated = threads.map((t) => (t.id === resetThread.id ? resetThread : t));
    setThreads(updated);
    persistThreads(updated, resetThread);
  };

  // Send query and stream answer
  const handleSend = async (e, customQuery) => {
    e?.preventDefault();
    const query = (typeof customQuery === 'string' ? customQuery : inputQuery).trim();
    if (!query || isGenerating || !activeThread) return;

    setInputQuery('');
    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'assistant-' + Date.now();

    // Auto-generate conversation title from first question if untitled
    const isFirstQuestion =
      activeThread.messages.length <= 1 || activeThread.title === 'New Conversation';
    const updatedTitle = isFirstQuestion
      ? query.length > 42
        ? query.slice(0, 40) + '…'
        : query
      : activeThread.title;

    const currentDoc = documents.find((d) => String(d.id) === String(filterDocId));
    const currentDocTitle =
      filterDocId === 'all' ? 'All Documents' : currentDoc?.title || activeThread.docTitle;

    const updatedMessages = [
      ...activeThread.messages,
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
    ];

    const currentThreadUpdated = {
      ...activeThread,
      title: updatedTitle,
      docId: filterDocId,
      docTitle: currentDocTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    // Update state & persist user question
    const updatedThreadsList = [
      currentThreadUpdated,
      ...threads.filter((t) => t.id !== activeThread.id),
    ];
    setThreads(updatedThreadsList);
    persistThreads(updatedThreadsList);

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
          setThreads((prevThreads) =>
            prevThreads.map((t) => {
              if (t.id !== currentThreadUpdated.id) return t;
              return {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
                ),
              };
            })
          );
        },
        onComplete: ({ answer, citations }) => {
          setThreads((prevThreads) => {
            const finalThreads = prevThreads.map((t) => {
              if (t.id !== currentThreadUpdated.id) return t;
              const completedThread = {
                ...t,
                updatedAt: new Date().toISOString(),
                messages: t.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: answer, citations, isStreaming: false }
                    : m
                ),
              };
              persistThreads(prevThreads, completedThread);
              return completedThread;
            });
            return finalThreads;
          });
          setIsGenerating(false);
        },
      });
    } catch (err) {
      console.error('[DocMind Companion Error]', err);
      setThreads((prevThreads) => {
        const withError = prevThreads.map((t) => {
          if (t.id !== currentThreadUpdated.id) return t;
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: 'I encountered an issue searching your texts. Please try again.',
                    isStreaming: false,
                  }
                : m
            ),
          };
        });
        persistThreads(withError);
        return withError;
      });
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    'Summarize the main points of this document',
    'What are the key takeaways and conclusions?',
    'Explain the most important findings step-by-step',
  ];

  // Filtered threads for sidebar
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // Document filter
      if (historyDocFilter !== 'all' && String(t.docId) !== String(historyDocFilter)) {
        return false;
      }
      // Search query filter
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const docMatch = (t.docTitle || '').toLowerCase().includes(q);
        const hasMsg = t.messages?.some((m) => (m.content || '').toLowerCase().includes(q));
        return titleMatch || docMatch || hasMsg;
      }
      return true;
    });
  }, [threads, historyDocFilter, historySearch]);

  // Group threads by date (Today, Yesterday, Previous 7 Days, Older)
  const groupedThreads = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filteredThreads.forEach((thread) => {
      const date = new Date(thread.updatedAt || thread.createdAt);
      if (date >= today) {
        groups.Today.push(thread);
      } else if (date >= yesterday) {
        groups.Yesterday.push(thread);
      } else if (date >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(thread);
      } else {
        groups.Older.push(thread);
      }
    });

    return groups;
  }, [filteredThreads]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-[#ffffff] w-full h-full font-sans antialiased">
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full bg-[#ffffff] flex flex-row relative overflow-hidden"
      >
        {/* ── Left Sidebar: ChatGPT-style Previous Chat History ──────────────── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 310, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full bg-[#faf9f6] border-r border-[#e7e5e4] flex flex-col shrink-0 overflow-hidden select-none z-20"
            >
              {/* Sidebar Header */}
              <div className="p-3.5 border-b border-[#e7e5e4] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917]">
                  <History className="w-4 h-4 text-[#c2410c]" />
                  <span className="font-serif-editorial text-[14px]">Previous Chats</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e7e5e4] text-[#57534e] font-mono">
                    {threads.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  title="Collapse Chat History"
                  className="p-1 rounded-md text-[#78716c] hover:text-[#1c1917] hover:bg-[#e7e5e4]/50 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Action: + New Chat Button */}
              <div className="p-3 border-b border-[#e7e5e4] space-y-2">
                <button
                  onClick={() => handleNewChat()}
                  className="w-full btn-ink text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </button>

                {/* Filter & Search Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#a8a29e] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search previous chats…"
                      className="w-full bg-[#ffffff] border border-[#e7e5e4] rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917]"
                    />
                  </div>

                  <select
                    value={historyDocFilter}
                    onChange={(e) => setHistoryDocFilter(e.target.value)}
                    className="w-full bg-[#ffffff] border border-[#e7e5e4] rounded-lg px-2 py-1 text-[11px] text-[#57534e] focus:outline-none focus:border-[#1c1917] cursor-pointer truncate"
                  >
                    <option value="all">All Documents ({threads.length} chats)</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thread Feed (Grouped Chronologically) */}
              <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {filteredThreads.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2 text-xs text-[#a8a29e]">
                    <MessageSquare className="w-6 h-6 mx-auto stroke-[1.5] text-[#d6d3d1]" />
                    <p className="font-serif-editorial text-[13px] text-[#78716c]">No conversations found</p>
                    <p className="text-[11px]">Start asking questions or clear your search filter.</p>
                  </div>
                ) : (
                  Object.entries(groupedThreads).map(([period, groupList]) => {
                    if (groupList.length === 0) return null;
                    return (
                      <div key={period} className="space-y-1">
                        <div className="px-2 py-0.5 text-[10px] font-semibold text-[#a8a29e] uppercase tracking-wider">
                          {period}
                        </div>
                        {groupList.map((thread) => {
                          const isActive = thread.id === activeThreadId;
                          return (
                            <div
                              key={thread.id}
                              onClick={() => handleSelectThread(thread.id)}
                              className={`group relative rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                isActive
                                  ? 'bg-[#ffffff] text-[#1c1917] shadow-xs border border-[#e7e5e4]'
                                  : 'text-[#57534e] hover:bg-[#ffffff]/70 hover:text-[#1c1917] border border-transparent'
                              }`}
                            >
                              <MessageSquare
                                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                  isActive ? 'text-[#c2410c]' : 'text-[#a8a29e] group-hover:text-[#1c1917]'
                                }`}
                              />
                              <div className="flex-1 min-w-0 pr-6">
                                <p className="text-xs font-medium truncate font-sans text-[12.5px] leading-snug">
                                  {thread.title || 'Untitled Conversation'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#a8a29e]">
                                  <span className="truncate max-w-[130px] font-serif-editorial text-[11px]">
                                    {thread.docTitle || 'All Documents'}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono">
                                    {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Hover Delete Action */}
                              <button
                                onClick={(e) => handleDeleteThread(thread.id, e)}
                                title="Delete this conversation"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#a8a29e] hover:text-rose-600 hover:bg-rose-50 transition-all absolute right-2 top-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3 border-t border-[#e7e5e4] bg-[#faf9f6] flex items-center justify-between text-xs text-[#78716c]">
                <span className="text-[11px] font-mono">{threads.length} total saved</span>
                <button
                  onClick={handleClearAllThreads}
                  className="text-[11px] text-[#a8a29e] hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Right Main Chat Canvas ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col h-full bg-[#ffffff] overflow-hidden relative">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#e7e5e4] bg-[#ffffff] flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  title="Expand Previous Chats (Sidebar)"
                  className="p-1.5 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] hover:bg-[#ffffff] text-[#57534e] hover:text-[#1c1917] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs text-xs font-medium"
                >
                  <PanelLeftOpen className="w-4 h-4 text-[#c2410c]" />
                  <span className="hidden sm:inline">Chats</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
                  <BookOpen className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <div>
                  <h2 className="font-serif-editorial text-[15px] text-[#1c1917] leading-tight truncate max-w-[220px] sm:max-w-md">
                    {activeThread?.title || 'DocMind Assistant'}
                  </h2>
                  <p className="text-[11px] text-[#78716c] truncate">
                    {activeThread?.docTitle || 'All Documents'} • Verified step-by-step citations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNewChat()}
                title="Start a New Chat"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e7e5e4] bg-[#faf9f6] hover:bg-[#ffffff] text-xs text-[#57534e] hover:text-[#1c1917] transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#c2410c]" />
                <span>New Chat</span>
              </button>

              <button
                onClick={handleResetCurrentChat}
                title="Reset Active Conversation"
                className="p-1.5 rounded-lg text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#faf9f6] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#faf9f6] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scope Filter Bar */}
          <div className="px-6 sm:px-10 py-2 bg-[#faf9f6] border-b border-[#e7e5e4] text-xs">
            <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#78716c]">
                <Search className="w-3.5 h-3.5 text-[#c2410c]" />
                <span className="font-medium text-[11px]">Search Scope for this Chat:</span>
              </div>

              <select
                value={filterDocId}
                onChange={(e) => {
                  const newScope = e.target.value;
                  setFilterDocId(newScope);
                  const matchedDoc = documents.find((d) => String(d.id) === String(newScope));
                  const newDocTitle =
                    newScope === 'all' ? 'All Documents' : matchedDoc?.title || 'Selected Document';
                  if (activeThread) {
                    const updated = threads.map((t) =>
                      t.id === activeThread.id
                        ? { ...t, docId: newScope, docTitle: newDocTitle, updatedAt: new Date().toISOString() }
                        : t
                    );
                    setThreads(updated);
                    persistThreads(updated);
                  }
                }}
                className="bg-[#ffffff] border border-[#e7e5e4] rounded-lg px-2.5 py-1 text-xs text-[#1c1917] focus:outline-none focus:border-[#1c1917] cursor-pointer max-w-[320px] truncate shadow-xs font-serif-editorial text-[13px]"
              >
                <option value="all">All Documents ({documents.length})</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} ({doc.chunk_count || 0} sections)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 bg-[#ffffff]">
            <div className="max-w-4xl mx-auto space-y-5 w-full">
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
                      <span
                        className={
                          msg.role === 'user' ? 'text-[#fed7aa] font-medium' : 'text-[#c2410c] font-semibold'
                        }
                      >
                        {msg.role === 'user' ? 'You' : 'DocMind'}
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
                        <p className="whitespace-pre-wrap font-sans text-xs text-[#faf9f6] leading-normal">
                          {msg.content}
                        </p>
                      ) : (
                        <div className="space-y-2 text-[#292524] font-serif-editorial text-[15px]">
                          {msg.isStreaming && !msg.content && (
                            <div className="flex items-center gap-2 text-xs text-[#78716c] py-1.5 font-sans animate-pulse">
                              <Sparkles className="w-3.5 h-3.5 text-[#c2410c] animate-spin shrink-0" />
                              <span>Formulating step-by-step verified answer...</span>
                            </div>
                          )}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[
                              [rehypeKatex, { throwOnError: false, strict: false, trust: true, errorColor: '#c2410c' }],
                            ]}
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-base font-normal text-[#1c1917] mt-2 mb-1 border-b border-[#e7e5e4] pb-1 font-serif-editorial">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-sm font-semibold text-[#c2410c] mt-2 mb-1 font-sans">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-xs font-semibold text-[#1c1917] mt-2 mb-1 font-sans">{children}</h3>
                              ),
                              p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed font-normal">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1.5 font-normal">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1.5 font-normal">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed font-normal">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-[#1c1917]">{children}</strong>,
                              code: ({ inline, children }) =>
                                inline ? (
                                  <code className="bg-[#f5f4f0] text-[#9a3412] px-1 py-0.5 rounded font-mono text-[11px] font-medium">
                                    {children}
                                  </code>
                                ) : (
                                  <pre className="bg-[#1c1917] text-[#faf9f6] p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-2">
                                    {children}
                                  </pre>
                                ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-[#c2410c] pl-3 italic text-[#57534e] my-1.5">
                                  {children}
                                </blockquote>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3 rounded-xl border border-[#e7e5e4] bg-[#ffffff] shadow-xs">
                                  <table className="w-full text-left border-collapse text-xs font-sans">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-[#faf9f6] border-b border-[#e7e5e4]">{children}</thead>
                              ),
                              tbody: ({ children }) => <tbody className="divide-y divide-[#f5f4f0]">{children}</tbody>,
                              tr: ({ children }) => (
                                <tr className="hover:bg-[#faf9f6]/60 transition-colors">{children}</tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-3.5 py-2.5 font-semibold text-[#1c1917] text-[11px] uppercase tracking-wider">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-3.5 py-2.5 text-[#44403c] text-xs font-normal align-top leading-relaxed">
                                  {children}
                                </td>
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

                    {/* Verified Citations List */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-[#e7e5e4]/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#78716c] uppercase tracking-wider font-sans">
                          <Layers className="w-3 h-3 text-[#c2410c]" />
                          <span>Verified Sources ({msg.citations.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cite) => (
                            <button
                              key={cite.id}
                              onClick={() => setSelectedCitation(cite)}
                              className="px-2 py-0.5 rounded-md bg-[#faf9f6] hover:bg-[#fff7ed] border border-[#e7e5e4] hover:border-[#fed7aa] text-[11px] text-[#57534e] hover:text-[#c2410c] transition-all flex items-center gap-1 cursor-pointer font-serif-editorial shadow-2xs"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>
                                Passage {cite.id} ({cite.similarity}%)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Sample Starters for Fresh Threads */}
              {messages.length === 1 && (
                <div className="pt-4 space-y-2.5 font-sans">
                  <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">
                    Suggested Questions
                  </p>
                  <div className="space-y-1.5">
                    {samplePrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(null, prompt)}
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
          </div>

          {/* Source Citation Inspector Drawer */}
          <AnimatePresence>
            {selectedCitation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 sm:px-10 py-4 bg-[#ffffff] border-t border-[#e7e5e4] space-y-2 shadow-lg relative"
              >
                <div className="max-w-4xl mx-auto space-y-2 w-full">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Input Form */}
          <div className="p-4 sm:px-10 border-t border-[#e7e5e4] bg-[#ffffff]">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2 w-full">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isGenerating}
                placeholder={
                  documents.length === 0
                    ? 'Upload a document first to ask questions…'
                    : `Ask DocMind AI about ${activeThread?.docTitle || 'your documents'}…`
                }
                className="input-notion text-xs text-[13px] py-2.5 rounded-xl bg-[#faf9f6] focus:bg-[#ffffff]"
              />

              <button
                type="submit"
                disabled={isGenerating || !inputQuery.trim()}
                className="btn-ink px-5 rounded-xl shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
