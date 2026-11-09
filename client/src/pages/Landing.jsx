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
  ShieldCheck,
  Feather,
  Sparkles,
  BookmarkCheck,
  PenTool
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] selection:bg-[#fed7aa] selection:text-[#7c2d12] flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#e7e5e4] bg-[#faf9f6]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-[#1c1917]">
            <div className="w-7 h-7 rounded-md bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <Feather className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[#1c1917] font-serif-editorial text-[17px]">DocMind</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f5f4f0] border border-[#e7e5e4] text-[#78716c]">
                Editorial
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#57534e]">
            <a href="#features" className="hover:text-[#1c1917] transition-colors">Reading Canvas</a>
            <a href="#citations" className="hover:text-[#1c1917] transition-colors">Source Citations</a>
            <a href="#collab" className="hover:text-[#1c1917] transition-colors">Collaboration</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] px-2 py-1 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink text-xs"
            >
              <span>Start Writing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-2xl mx-auto space-y-5">
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffffff] border border-[#e7e5e4] text-xs text-[#57534e] shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
            <span>Notion &amp; Substack Minimalist &bull; Quiet Reading &amp; Thought</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#1c1917] leading-[1.12]"
          >
            A quiet space for reading, research, and thinking.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-[#57534e] leading-relaxed max-w-xl mx-auto font-normal"
          >
            Upload technical research, manuscripts, and notes. Ask questions with verified paragraph citations, and co-author longform essays in real time.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
          >
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink w-full sm:w-auto px-6 py-2.5 text-xs font-medium"
            >
              <span>Open Reading Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-notion-secondary w-full sm:w-auto px-5 py-2.5 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#78716c]" />
              <span>Browse Library</span>
            </button>
          </motion.div>
        </div>

        {/* ── Notion-Style Minimal Reading Preview Card ─────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-14 notion-card p-0 overflow-hidden shadow-lg border border-[#e7e5e4] bg-[#ffffff]"
        >
          {/* Notion header row */}
          <div className="h-10 bg-[#faf9f6] border-b border-[#e7e5e4] px-4 flex items-center justify-between text-xs text-[#57534e]">
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <span className="font-medium text-[#1c1917]">Attention_Mechanism_Analysis.pdf</span>
              <span className="text-[#a8a29e] font-serif-editorial italic">/ Section 3.2</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
              <span>Synced</span>
            </div>
          </div>

          {/* Minimalist document body */}
          <div className="p-8 space-y-4 max-w-2xl mx-auto">
            <h2 className="font-serif-editorial text-2xl font-normal text-[#1c1917] tracking-tight">
              Scaled Dot-Product Attention Formulation
            </h2>

            <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed font-serif-editorial text-[15px]">
              We compute the matrix of outputs as a weighted sum of values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key:
            </p>

            {/* Editorial KaTeX math display */}
            <div className="p-4 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-center font-mono text-sm text-[#1c1917]">
              <span className="font-serif italic font-bold text-[#c2410c]">Attention</span>
              <span className="text-[#57534e]">(Q, K, V) = softmax</span>
              <span className="text-[#78716c]">(</span>
              <span className="text-[#1c1917] font-semibold">QK</span>
              <sup className="text-[#c2410c]">T</sup>
              <span className="text-[#78716c]"> / &radic;</span>
              <span className="italic text-[#57534e]">d</span>
              <sub className="text-[#78716c]">k</sub>
              <span className="text-[#78716c]">) </span>
              <span className="text-[#1c1917] font-semibold">V</span>
            </div>

            {/* Substack-style inline citation callout */}
            <div className="p-3.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-start gap-2.5 text-xs text-[#7c2d12]">
              <BookmarkCheck className="w-4 h-4 text-[#c2410c] shrink-0 mt-0.5" />
              <div className="font-serif-editorial text-[14px] leading-relaxed">
                <strong className="font-sans font-semibold text-[#9a3412] text-xs">Verified Source:</strong> Vaswani et al., Section 3.2, Page 4 &mdash; <em>&ldquo;The two most commonly used attention functions are additive attention and dot-product attention.&rdquo;</em>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 3 Notion & Substack Craft Pillars ─────────────────────────────── */}
        <div id="features" className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="notion-card notion-card-interactive p-6 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center">
              <Feather className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="font-serif-editorial text-lg text-[#1c1917]">Distraction-Free Reading</h3>
            <p className="text-xs text-[#57534e] leading-relaxed font-normal">
              Zero clutter or robotic jargon. A quiet, typographic environment crafted for slow, contemplative reading.
            </p>
          </div>

          <div className="notion-card notion-card-interactive p-6 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-[#1c1917] flex items-center justify-center">
              <Bookmark className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="font-serif-editorial text-lg text-[#1c1917]">Grounded Source Citations</h3>
            <p className="text-xs text-[#57534e] leading-relaxed font-normal">
              Every synthesized claim is anchored to exact paragraph spans in your uploaded research volumes.
            </p>
          </div>

          <div className="notion-card notion-card-interactive p-6 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center">
              <PenTool className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="font-serif-editorial text-lg text-[#1c1917]">Live Co-Authorship</h3>
            <p className="text-xs text-[#57534e] leading-relaxed font-normal">
              Operational Transformation ensures real-time collaborative writing with presence cursors.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e7e5e4] bg-[#ffffff] py-8 text-center text-xs text-[#78716c]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#44403c]">
            <span className="font-serif-editorial text-sm font-semibold text-[#1c1917]">DocMind</span>
            <span>&bull;</span>
            <span className="text-[#78716c]">Clean Editorial Edition</span>
          </div>
          <div className="flex items-center gap-5 text-[#78716c]">
            <Link to="/auth" className="hover:text-[#1c1917] transition-colors">Sign In</Link>
            <Link to="/dashboard" className="hover:text-[#1c1917] transition-colors">Library</Link>
            <span>&copy; {new Date().getFullYear()} DocMind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
