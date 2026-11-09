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
  Sparkles,
  Shield,
  Feather
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#120f0d] text-[#f7f2eb] selection:bg-[#78350f] selection:text-[#fef3c7] flex flex-col">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#2d241e] bg-[#120f0d]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-[#f7f2eb]">
            <div className="w-8 h-8 rounded-lg bg-[#201915] border border-[#3e3128] text-amber-400 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-normal text-base tracking-tight font-serif-luxury text-[#f7f2eb]">DocMind Studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-xs font-medium text-[#a89888] hover:text-[#f7f2eb] transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-cognac"
            >
              <span>Enter Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1c1613] border border-[#332922] text-[11px] font-mono uppercase tracking-wider text-[#a89888]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>EST. 2026 &bull; The Private Library for Deep Thought</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight font-serif-luxury text-[#f7f2eb] leading-[1.15]">
            A quiet sanctuary for reading, literature, and collaborative thought.
          </h1>

          <p className="text-base sm:text-lg text-[#a89888] leading-relaxed max-w-2xl mx-auto font-normal">
            Curate technical manuscripts, research volumes, and PDF archives. Inquire across texts with verified paragraph citations, and co-author longform notes in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-[#120f0d] font-semibold text-sm transition-all shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter the Library Vault</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-luxury-secondary w-full sm:w-auto px-6 py-3"
            >
              <span>Explore Selected Readings</span>
            </button>
          </div>
        </div>

        {/* ── Editorial Reading Canvas Mockup (Dark Mahogany & Parchment) ──── */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="luxury-card p-6 sm:p-10 relative overflow-hidden bg-[#1c1714] border border-[#362b24]">
            {/* Top document metadata */}
            <div className="flex items-center justify-between border-b border-[#2a221d] pb-4 mb-6">
              <div className="flex items-center gap-2.5 text-xs text-[#a89888]">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="font-serif-luxury text-sm text-[#f7f2eb] font-normal">A Treatise on Distributed Memory &amp; Verifiable Knowledge.pdf</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-[#736557]">12 Sections</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono">
                  Verified Citations
                </span>
              </div>
            </div>

            {/* Document page preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl sm:text-2xl font-serif-luxury text-[#f7f2eb] font-normal leading-snug">
                  Chapter IV: The Provenance of Ideas
                </h2>
                <p className="text-sm text-[#a89888] leading-relaxed font-serif-luxury text-[16px]">
                  When scholars write in isolation, thinking drifts into fragmented abstraction. Genuine literature demands architectural rigor — every synthesized insight must connect backwards to an authentic, uncorrupted passage in the foundational text.
                </p>
                <div className="p-4 rounded-lg bg-[#14100e] border-l-2 border-amber-500 text-xs text-[#ede6dc] italic leading-relaxed font-serif-luxury text-[14px]">
                  "Operational transformation guarantees document convergence across concurrent writers, while grounded semantic retrieval provides zero-guesswork fidelity."
                </div>
                <p className="text-sm text-[#a89888] leading-relaxed font-serif-luxury text-[16px]">
                  By weaving together simultaneous co-authorship with verified passage indexing, authors create living manuscripts that stay anchored to their foundational truths.
                </p>
              </div>

              {/* Research Companion Sidebar Preview */}
              <div className="border-t lg:border-t-0 lg:border-l border-[#2a221d] pt-6 lg:pt-0 lg:pl-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#736557]">Library Margin Notes</span>
                  <span className="text-[10px] font-mono text-amber-400">Vault 01</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#15110e] border border-[#2d241e] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px] font-mono">
                    <Bookmark className="w-3 h-3" />
                    <span>Passage 1 Citation</span>
                  </div>
                  <p className="text-[#a89888] leading-relaxed text-[12px] font-serif-luxury">
                    Referenced section on page 4 detailing distributed consensus mechanisms and truth verification.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#15110e] border border-[#2d241e] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] font-mono">
                    <Check className="w-3 h-3" />
                    <span>Concurrent Session</span>
                  </div>
                  <p className="text-[#a89888] leading-relaxed text-[12px] font-serif-luxury">
                    Collaborative cursor synchronization active across team members.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3 Luxury Pillars ──────────────────────────────────────────────── */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="luxury-card p-6 space-y-3 bg-[#1a1512] border border-[#332922]">
            <div className="w-10 h-10 rounded-lg bg-[#241c18] border border-[#3d3027] flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif-luxury text-base text-[#f7f2eb] font-normal">The Library Vault</h3>
            <p className="text-xs text-[#a89888] leading-relaxed">
              Store books, technical papers, and longform archives. Your readings remain strictly isolated with encrypted account boundaries and recursive passage indexing.
            </p>
          </div>

          <div className="luxury-card p-6 space-y-3 bg-[#1a1512] border border-[#332922]">
            <div className="w-10 h-10 rounded-lg bg-[#241c18] border border-[#3d3027] flex items-center justify-center text-amber-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-serif-luxury text-base text-[#f7f2eb] font-normal">Verifiable Inquiries</h3>
            <p className="text-xs text-[#a89888] leading-relaxed">
              Ask deep questions across your volumes. Every synthesized answer cites exact, verifiable passages with similarity confidence, eliminating guesswork.
            </p>
          </div>

          <div className="luxury-card p-6 space-y-3 bg-[#1a1512] border border-[#332922]">
            <div className="w-10 h-10 rounded-lg bg-[#241c18] border border-[#3d3027] flex items-center justify-center text-amber-400">
              <Feather className="w-5 h-5" />
            </div>
            <h3 className="font-serif-luxury text-base text-[#f7f2eb] font-normal">Live Co-Authorship</h3>
            <p className="text-xs text-[#a89888] leading-relaxed">
              Pen longform manuscripts and shared notes alongside teammates. Real-time operational transformation guarantees total consistency without locks.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#261e19] bg-[#100d0b] py-8 text-center text-xs text-[#736557]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif-luxury text-[#f7f2eb]">DocMind Studio</span>
            <span>&bull;</span>
            <span>An Espresso &amp; Cognac Literary Workspace</span>
          </div>
          <div>
            <span>End-to-end multi-tenant vault security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
