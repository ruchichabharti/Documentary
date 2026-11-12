import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BookOpen, 
  FileText, 
  Search, 
  Download, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  ChevronRight, 
  Layers, 
  ArrowUpRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { formatMathForDisplay } from '../lib/formatMath.js';

export default function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  doc, 
  chunks = [],
  onOpenChat,
  onOpenSummary
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sectionRefs = useRef({});

  // Ensure hooks are called unconditionally
  const docChunks = useMemo(() => {
    if (!doc) return [];
    if (doc.chunks && Array.isArray(doc.chunks) && doc.chunks.length > 0) {
      return [...doc.chunks].sort((a, b) => (a.chunkIndex ?? a.chunk_index ?? 0) - (b.chunkIndex ?? b.chunk_index ?? 0));
    }
    const filtered = chunks.filter((c) => {
      const cId = c.documentId || c.document_id || c.metadata?.documentId;
      return String(cId) === String(doc.id);
    });
    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (a.chunkIndex ?? a.chunk_index ?? 0) - (b.chunkIndex ?? b.chunk_index ?? 0));
    }
    if (doc.content) {
      return [{ content: doc.content, chunkIndex: 0 }];
    }
    return [];
  }, [doc, chunks]);

  const fullText = useMemo(() => {
    return docChunks.map((c) => c.content).filter(Boolean).join('\n\n');
  }, [docChunks]);

  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return docChunks;
    const q = searchQuery.toLowerCase();
    return docChunks.filter((c) => c.content.toLowerCase().includes(q));
  }, [docChunks, searchQuery]);

  // Hook rules: guard conditional return before JSX output
  if (!isOpen || !doc) return null;

  const scrollToSection = (idx) => {
    setActiveSectionIndex(idx);
    const el = sectionRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyAll = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title || 'document'}_content.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/40 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={`w-full ${isFullscreen ? 'max-w-7xl h-[98vh]' : 'max-w-5xl h-[92vh] max-h-[880px]'} bg-[#ffffff] border border-[#e7e5e4] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-[#e7e5e4] bg-[#ffffff] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif-editorial text-base text-[#1c1917] font-medium truncate">
                  {doc.title}
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#faf9f6] text-[#57534e] border border-[#e7e5e4] shrink-0">
                  {doc.file_type?.includes('pdf') ? 'PDF' : 'Document'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#78716c] font-mono text-[11px] mt-0.5">
                <span>{docChunks.length} indexed sections</span>
                <span>&bull;</span>
                <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onOpenSummary?.(doc.id);
              }}
              className="btn-notion-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 hover:text-[#c2410c]"
              title="Generate Step-by-Step AI Solutions & Study Guide"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c2410c]" />
              <span className="hidden sm:inline">AI Solutions</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenChat?.(doc.id);
              }}
              className="btn-ink text-xs py-1.5 px-2.5 flex items-center gap-1.5 shadow-xs"
              title="Ask AI questions about this document"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            <div className="w-px h-5 bg-[#e7e5e4] mx-1" />

            <button
              onClick={handleCopyAll}
              className="btn-notion-secondary text-xs py-1.5 px-2 flex items-center gap-1"
              title="Copy entire document text"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#78716c]" />
              )}
            </button>

            <button
              onClick={handleDownload}
              className="btn-notion-secondary text-xs py-1.5 px-2 flex items-center gap-1"
              title="Download Markdown / Text"
            >
              <Download className="w-3.5 h-3.5 text-[#78716c]" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn-notion-secondary text-xs py-1.5 px-2 hidden sm:flex items-center gap-1"
              title={isFullscreen ? 'Restore view' : 'Maximize reader'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#f5f4f0] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar Strip */}
        <div className="px-6 py-2.5 border-b border-[#e7e5e4] bg-[#faf9f6] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md relative">
            <Search className="w-3.5 h-3.5 text-[#a8a29e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across questions, equations, or keywords in this document..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#ffffff] border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#1c1917] transition-colors"
            />
          </div>

          <div className="text-xs text-[#78716c] font-mono text-[11px]">
            {searchQuery ? (
              <span>Found in {filteredChunks.length} of {docChunks.length} sections</span>
            ) : (
              <span>{docChunks.length} total sections ready to read</span>
            )}
          </div>
        </div>

        {/* Reader Layout: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Table of Contents Sidebar */}
          <div className="w-64 border-r border-[#e7e5e4] bg-[#faf9f6] overflow-y-auto hidden md:block p-3 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] px-2 py-1 mb-1">
              Table of Contents
            </div>
            {docChunks.map((chunk, idx) => {
              const preview = chunk.content.replace(/\s+/g, ' ').slice(0, 60);
              const isActive = activeSectionIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => scrollToSection(idx)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer flex flex-col gap-0.5 ${
                    isActive
                      ? 'bg-[#ffffff] text-[#c2410c] shadow-xs font-medium border border-[#fed7aa]'
                      : 'text-[#57534e] hover:bg-[#f5f4f0] hover:text-[#1c1917]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-semibold text-[#1c1917]">Section {idx + 1}</span>
                    <span className="text-[#a8a29e]">{chunk.content.split(/\s+/).length} words</span>
                  </div>
                  <span className="text-[11px] text-[#78716c] line-clamp-1 italic font-serif-editorial">
                    "{preview}…"
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Reading View */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#ffffff] space-y-8 font-serif-editorial">
            {docChunks.length === 0 ? (
              <div className="py-20 text-center text-[#78716c] text-sm">
                No readable sections found for this document.
              </div>
            ) : (
              docChunks.map((chunk, idx) => (
                <div
                  key={idx}
                  ref={(el) => (sectionRefs.current[idx] = el)}
                  className="p-6 rounded-2xl border border-[#e7e5e4] bg-[#ffffff] shadow-xs space-y-4 hover:border-[#fed7aa] transition-colors"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f4f0] font-sans">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#fff7ed] text-[#c2410c] font-semibold text-xs border border-[#fed7aa]">
                        Section {idx + 1}
                      </span>
                      {chunk.metadata?.pageNumber && (
                        <span className="text-xs text-[#78716c] font-mono">
                          Page {chunk.metadata.pageNumber}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenChat?.(doc.id);
                      }}
                      className="text-xs text-[#78716c] hover:text-[#c2410c] flex items-center gap-1 font-medium transition-colors"
                      title="Ask AI about this specific section"
                    >
                      <Sparkles className="w-3 h-3 text-[#c2410c]" />
                      <span>Ask AI this section</span>
                    </button>
                  </div>

                  {/* Section Content with LaTeX and Markdown */}
                  <div className="text-[#1c1917] leading-relaxed text-[15px] space-y-3 font-serif-editorial">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: true }]]}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-normal text-[#1c1917] mt-4 mb-2 border-b border-[#e7e5e4] pb-1 font-serif-editorial">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-normal text-[#c2410c] mt-3 mb-1.5 font-serif-editorial">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold text-[#1c1917] mt-3 mb-1 font-serif-editorial">{children}</h3>,
                        p: ({ children }) => <p className="mb-2 leading-relaxed whitespace-pre-wrap">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-[#1c1917] font-sans text-xs tracking-wide">{children}</strong>,
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
                      {formatMathForDisplay(chunk.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

