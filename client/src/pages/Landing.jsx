import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  FileText, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Layers, 
  ShieldCheck,
  ChevronRight,
  BookmarkCheck,
  Cpu
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-blue-100 selection:text-blue-900 flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">DocMind</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Workspace</a>
            <a href="#citations" className="hover:text-blue-600 transition-colors">Source Grounding</a>
            <a href="#collab" className="hover:text-blue-600 transition-colors">Live Collaboration</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-cobalt text-xs"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-blue-700 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>California Modernist Studio &bull; Precision &amp; Grounded Clarity</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]"
          >
            The modern workspace for reading, research, and collaborative thinking.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Upload technical research, PDF volumes, and manuscripts. Inquire across texts with verified paragraph citations, and co-author live notes in real time.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
          >
            <button
              onClick={() => navigate('/auth')}
              className="btn-cobalt w-full sm:w-auto px-6 py-3 text-sm shadow-md shadow-blue-500/20"
            >
              <span>Open Document Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-modern-secondary w-full sm:w-auto px-6 py-3 text-sm"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Explore Sample Vault</span>
            </button>
          </motion.div>
        </div>

        {/* ── Apple-Style Interactive Studio Preview Window ────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-14 modern-card p-0 overflow-hidden shadow-2xl shadow-slate-300/50 border border-slate-200"
        >
          {/* macOS window titlebar */}
          <div className="h-11 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Attention_Mechanism_Analysis.pdf &bull; Live Studio</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Synced</span>
            </div>
          </div>

          {/* Studio body preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] bg-white">
            {/* Left: Document index shelf */}
            <div className="md:col-span-4 bg-slate-50/70 border-r border-slate-200 p-4 space-y-3">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>Active Vault</span>
                <span className="text-slate-500 font-mono">3 Files</span>
              </div>

              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-xs flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">Attention_Mechanism.pdf</p>
                    <p className="text-[10px] text-slate-600">Indexed &bull; 14 Chunks</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-transparent hover:bg-slate-100/70 border border-transparent transition-colors flex items-start gap-2.5 cursor-pointer">
                  <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">Quantum_Decoherence.pdf</p>
                    <p className="text-[10px] text-slate-500">Indexed &bull; 28 Chunks</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-transparent hover:bg-slate-100/70 border border-transparent transition-colors flex items-start gap-2.5 cursor-pointer">
                  <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">Bayesian_Inference.md</p>
                    <p className="text-[10px] text-slate-500">Live Note &bull; 8 Authors</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-blue-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grounded Citations</span>
                  </p>
                  <p className="text-slate-600 leading-normal">
                    Queries are strictly bound to vector context embeddings with zero hallucination.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Modern live editor sheet */}
            <div className="md:col-span-8 p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">Section 3.2: Scaled Dot-Product Formulation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>Sarah K. (Live)</span>
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed space-y-3 font-normal">
                <p>
                  We compute the matrix of outputs as a weighted sum of values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key:
                </p>

                {/* KaTeX Math Box in Modern Style */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-sm text-slate-900">
                  <span className="font-serif italic font-bold text-blue-600">Attention</span>
                  <span className="text-slate-700">(Q, K, V) = softmax</span>
                  <span className="text-slate-500">(</span>
                  <span className="text-slate-900 font-semibold">QK</span>
                  <sup className="text-blue-600">T</sup>
                  <span className="text-slate-500"> / &radic;</span>
                  <span className="italic text-slate-700">d</span>
                  <sub className="text-slate-600">k</sub>
                  <span className="text-slate-500">) </span>
                  <span className="text-slate-900 font-semibold">V</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-[11px] text-amber-950">
                  <BookmarkCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-amber-900">Verified Citation:</strong> Vaswani et al., Page 4, Paragraph 2 &mdash; <em>&ldquo;The two most commonly used attention functions are additive attention and dot-product attention.&rdquo;</em>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 3 Craft Pillars (California Modernist Cards) ──────────────────── */}
        <div id="features" className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="modern-card modern-card-interactive p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Grounded Source Vault</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              High-throughput chunking and cosine embeddings. Every answer cites exact volume numbers and paragraph spans.
            </p>
          </div>

          <div className="modern-card modern-card-interactive p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Co-Authorship</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Operational Transformation algorithms ensure conflict-free real-time collaboration with cursor presence flags.
            </p>
          </div>

          <div className="modern-card modern-card-interactive p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Native KaTeX &amp; Markdown</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Beautiful LaTeX typography for mathematical proofs, clean code formatting, and US Letter printable output.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>DocMind Studio</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 font-normal">California Modernist Edition</span>
          </div>
          <div className="flex items-center gap-5 text-slate-500">
            <Link to="/auth" className="hover:text-blue-600 transition-colors">Sign In</Link>
            <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <span>&copy; {new Date().getFullYear()} DocMind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
