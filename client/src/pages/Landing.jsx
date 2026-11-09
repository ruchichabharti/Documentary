import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  FileText, 
  Edit3, 
  Users, 
  Bookmark, 
  Check, 
  Sparkles,
  Quote,
  Shield,
  Layers
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#1c1917] selection:bg-[#fed7aa] selection:text-[#7c2d12] flex flex-col">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#e5e0d4] bg-[#f8f6f1]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-[#1c1917]">
            <div className="w-8 h-8 rounded-lg bg-[#1c1917] text-[#f8f6f1] flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight font-serif-title">DocMind Studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2eee5] border border-[#e5e0d4] text-[11px] font-mono uppercase tracking-wider text-[#78716c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
            <span>A Thoughtful Workspace for Readers &amp; Writers</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight font-serif-title text-[#1c1917] leading-[1.15]">
            A peaceful home for your reading, research, and thinking.
          </h1>

          <p className="text-base sm:text-lg text-[#57534e] leading-relaxed max-w-2xl mx-auto font-normal">
            Upload books, technical reports, and research PDFs. Read with focus, ask questions with verifiable passage citations, and write collaborative notes in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1c1917] hover:bg-[#292524] text-[#fcfbf9] font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#ffffff] hover:bg-[#f2eee5] border border-[#e5e0d4] text-[#1c1917] font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Library Demo</span>
            </button>
          </div>
        </div>

        {/* ── Editorial Reading Canvas Mockup ───────────────────────────────── */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="paper-card p-6 sm:p-10 relative overflow-hidden bg-white border border-[#e2ded4] shadow-md">
            {/* Top document metadata */}
            <div className="flex items-center justify-between border-b border-[#f2eee5] pb-4 mb-6">
              <div className="flex items-center gap-2.5 text-xs text-[#78716c]">
                <FileText className="w-4 h-4 text-[#c2410c]" />
                <span className="font-serif-title text-sm text-[#1c1917] font-medium">Distributed Knowledge &amp; Collaborative Thought.pdf</span>
                <span>•</span>
                <span className="font-mono text-[11px]">8 Sections</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[10px] font-medium">
                  Verified Citations
                </span>
              </div>
            </div>

            {/* Document page preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl sm:text-2xl font-serif-title text-[#1c1917] font-normal leading-snug">
                  1. The Architecture of Collaborative Memory
                </h2>
                <p className="text-sm text-[#57534e] leading-relaxed font-serif-title text-[15px]">
                  When teams work across complex literature, traditional note-taking breaks down into disjointed fragments. Knowledge is only as reliable as its provenance — every claim must anchor back to a verified sentence in the source text.
                </p>
                <div className="p-4 rounded-lg bg-[#fbfaf8] border-l-2 border-[#c2410c] text-xs text-[#44403c] italic leading-relaxed font-serif-title">
                  "Operational transformation guarantees document convergence across concurrent editors, while grounded vector indexing provides zero-guesswork semantic retrieval."
                </div>
                <p className="text-sm text-[#57534e] leading-relaxed font-serif-title text-[15px]">
                  By intertwining real-time collaborative writing with verified source retrieval, readers can construct living documents that remain perpetually connected to their foundational evidence.
                </p>
              </div>

              {/* Research Companion Sidebar Preview */}
              <div className="border-t lg:border-t-0 lg:border-l border-[#f2eee5] pt-6 lg:pt-0 lg:pl-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#78716c]">Companion Notes</span>
                  <span className="text-[10px] font-mono text-[#a8a29e]">Live</span>
                </div>

                <div className="p-3 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[#c2410c] font-medium text-[11px]">
                    <Bookmark className="w-3 h-3" />
                    <span>Passage 1 Citation</span>
                  </div>
                  <p className="text-[#57534e] leading-relaxed text-[11px]">
                    Referenced section on page 3 discussing distributed consensus and vector indexing.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#ffffff] border border-[#e5e0d4] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[#15803d] font-medium text-[11px]">
                    <Check className="w-3 h-3" />
                    <span>Multi-Editor Sync</span>
                  </div>
                  <p className="text-[#57534e] leading-relaxed text-[11px]">
                    3 collaborators actively co-authoring with cursor presence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3 Craft Pillars ───────────────────────────────────────────────── */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="paper-card p-6 space-y-3 bg-white border border-[#e5e0d4]">
            <div className="w-10 h-10 rounded-lg bg-[#f2eee5] border border-[#e5e0d4] flex items-center justify-center text-[#1c1917]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif-title text-base text-[#1c1917] font-medium">Curated Document Library</h3>
            <p className="text-xs text-[#57534e] leading-relaxed">
              Upload PDF books, articles, and research handbooks. Your documents are stored safely with account isolation and split into readable, indexed sections.
            </p>
          </div>

          <div className="paper-card p-6 space-y-3 bg-white border border-[#e5e0d4]">
            <div className="w-10 h-10 rounded-lg bg-[#f2eee5] border border-[#e5e0d4] flex items-center justify-center text-[#c2410c]">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-serif-title text-base text-[#1c1917] font-medium">Source-Grounded Answers</h3>
            <p className="text-xs text-[#57534e] leading-relaxed">
              Search questions across your library. Every answer points directly to the exact source passages with confidence percentages, eliminating false guesses.
            </p>
          </div>

          <div className="paper-card p-6 space-y-3 bg-white border border-[#e5e0d4]">
            <div className="w-10 h-10 rounded-lg bg-[#f2eee5] border border-[#e5e0d4] flex items-center justify-center text-[#15803d]">
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="font-serif-title text-base text-[#1c1917] font-medium">Live Co-Authoring</h3>
            <p className="text-xs text-[#57534e] leading-relaxed">
              Take collaborative notes in real time. Built-in operational transformation lets multiple readers write, edit, and synthesize thoughts simultaneously.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e0d4] bg-[#f2eee5]/50 py-8 text-center text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif-title font-medium text-[#1c1917]">DocMind Studio</span>
            <span>&bull;</span>
            <span>Editorial Research Workspace</span>
          </div>
          <div>
            <span>Private sessions with Supabase multi-tenant security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
