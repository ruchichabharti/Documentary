import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  FileText, 
  Edit3, 
  Bookmark, 
  Check, 
  Layers, 
  Compass, 
  Leaf, 
  ShieldCheck 
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1110] text-[#f2f7f5] selection:bg-[#064e3b] selection:text-[#a7f3d0] flex flex-col">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#233a34] bg-[#0a1110]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-[#f2f7f5]">
            <div className="w-8 h-8 rounded-lg bg-[#14221f] border border-[#2f4f47] text-emerald-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-[#f2f7f5]">DocMind Studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-xs font-medium text-[#8ca89f] hover:text-[#f2f7f5] transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-emerald"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#051410]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#101b19] border border-[#233a34] text-[11px] font-mono uppercase tracking-wider text-[#8ca89f]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>EST. 2026 &bull; Nordic Forest Workspace for Deep Thought</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#f2f7f5] leading-[1.15]">
            A quiet, organic space for reading, research, and thinking.
          </h1>

          <p className="text-base sm:text-lg text-[#8ca89f] leading-relaxed max-w-2xl mx-auto font-normal">
            Upload technical research, PDF volumes, and manuscripts. Inquire across texts with verified paragraph citations, and co-author live notes in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => navigate('/auth')}
              className="btn-emerald w-full sm:w-auto px-6 py-3"
            >
              <span>Open Library Workspace</span>
              <ArrowRight className="w-4 h-4 text-[#051410]" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-nordic-secondary w-full sm:w-auto px-6 py-3"
            >
              <span>Explore Reading Shelf</span>
            </button>
          </div>
        </div>

        {/* ── Nordic Reading Canvas Mockup ──────────────────────────────────── */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="nordic-card p-6 sm:p-10 relative overflow-hidden bg-[#14221f] border border-[#2a443e]">
            {/* Top document metadata */}
            <div className="flex items-center justify-between border-b border-[#1f342f] pb-4 mb-6">
              <div className="flex items-center gap-2.5 text-xs text-[#8ca89f]">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-[#f2f7f5] font-medium">Distributed Consensus &amp; Verifiable Knowledge Systems.pdf</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-[#526f67]">14 Sections</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                  Verified Citations
                </span>
              </div>
            </div>

            {/* Document page preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl sm:text-2xl text-[#f2f7f5] font-semibold leading-snug">
                  1. The Architecture of Collaborative Memory
                </h2>
                <p className="text-sm text-[#8ca89f] leading-relaxed text-[15px]">
                  When teams work across complex literature, traditional note-taking breaks down into disjointed fragments. Knowledge is only as reliable as its provenance — every claim must anchor back to a verified sentence in the source text.
                </p>
                <div className="p-4 rounded-lg bg-[#0d1715] border-l-2 border-emerald-400 text-xs text-[#e2ede8] italic leading-relaxed text-[14px]">
                  "Operational transformation guarantees document convergence across concurrent editors, while grounded vector indexing provides zero-guesswork semantic retrieval."
                </div>
                <p className="text-sm text-[#8ca89f] leading-relaxed text-[15px]">
                  By intertwining real-time collaborative writing with verified source retrieval, readers construct living documents that remain perpetually connected to their foundational evidence.
                </p>
              </div>

              {/* Research Companion Sidebar Preview */}
              <div className="border-t lg:border-t-0 lg:border-l border-[#1f342f] pt-6 lg:pt-0 lg:pl-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#526f67]">Research Companion</span>
                  <span className="text-[10px] font-mono text-emerald-400">Live</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0e1917] border border-[#233a34] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] font-mono">
                    <Bookmark className="w-3 h-3" />
                    <span>Passage 1 Citation</span>
                  </div>
                  <p className="text-[#8ca89f] leading-relaxed text-[12px]">
                    Referenced section on page 3 discussing distributed consensus and vector indexing.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0e1917] border border-[#233a34] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] font-mono">
                    <Check className="w-3 h-3" />
                    <span>Multi-Editor Sync</span>
                  </div>
                  <p className="text-[#8ca89f] leading-relaxed text-[12px]">
                    3 collaborators actively co-authoring with cursor presence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3 Nordic Forest Pillars ───────────────────────────────────────── */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="nordic-card p-6 space-y-3 bg-[#14221f] border border-[#233a34]">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base text-[#f2f7f5] font-semibold">The Library Vault</h3>
            <p className="text-xs text-[#8ca89f] leading-relaxed">
              Upload PDF books, articles, and research handbooks. Your readings remain strictly isolated with encrypted account boundaries and recursive passage indexing.
            </p>
          </div>

          <div className="nordic-card p-6 space-y-3 bg-[#14221f] border border-[#233a34]">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base text-[#f2f7f5] font-semibold">Grounded Source Inquiries</h3>
            <p className="text-xs text-[#8ca89f] leading-relaxed">
              Ask deep questions across your volumes. Every synthesized answer cites exact, verifiable passages with similarity confidence, eliminating guesswork.
            </p>
          </div>

          <div className="nordic-card p-6 space-y-3 bg-[#14221f] border border-[#233a34]">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="text-base text-[#f2f7f5] font-semibold">Live Co-Authorship</h3>
            <p className="text-xs text-[#8ca89f] leading-relaxed">
              Pen longform manuscripts and shared notes alongside teammates. Real-time operational transformation guarantees total consistency without locks.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a2b27] bg-[#080e0d] py-8 text-center text-xs text-[#526f67]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#f2f7f5]">DocMind Studio</span>
            <span>&bull;</span>
            <span>A Nordic Forest &amp; Slate Workspace</span>
          </div>
          <div>
            <span>End-to-end multi-tenant vault security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
