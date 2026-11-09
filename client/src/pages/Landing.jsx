import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  ArrowRight, 
  Search, 
  FileText, 
  Cpu, 
  Users, 
  CheckCircle2, 
  Layers, 
  ShieldCheck,
  Command,
  CornerDownLeft,
  Binary,
  BookmarkCheck,
  Sparkles
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-cyan-950 selection:text-cyan-300 flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-[#fafafa]">
            <div className="w-7 h-7 rounded-md bg-[#16161a] border border-[#27272a] text-cyan-400 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              DM
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[#fafafa]">DocMind</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[#71717a]">
                v2.6.4
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-[#a1a1aa]">
            <a href="#features" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>//</span>
              <span>INDEX</span>
            </a>
            <a href="#kernel" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>//</span>
              <span>KERNEL</span>
            </a>
            <a href="#grounding" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>//</span>
              <span>CITATIONS</span>
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#71717a] bg-[#121215] px-2 py-1 rounded border border-[#27272a]">
              <Command className="w-3 h-3 text-[#52525b]" />
              <span>K</span>
            </div>

            <Link
              to="/auth"
              className="text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] px-2 py-1 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-cyan text-xs"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#121215] border border-[#27272a] text-[11px] font-mono text-[#a1a1aa]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400">[00 // SYSTEM READY]</span>
            <span className="text-[#52525b]">&bull;</span>
            <span>SWISS HIGH-TECH MINIMALIST ENGINE</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#fafafa] leading-[1.1]"
          >
            High-density document engine for research and precision thought.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Semantic pgvector embedding ingestion, verified zero-hallucination paragraph citations, and concurrent multi-author Operational Transformation.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <button
              onClick={() => navigate('/auth')}
              className="btn-cyan w-full sm:w-auto px-6 py-2.5 text-xs font-mono"
            >
              <span>ACCESS COMMAND CONSOLE</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-linear-secondary w-full sm:w-auto px-5 py-2.5 text-xs font-mono text-[#a1a1aa]"
            >
              <Terminal className="w-3.5 h-3.5 text-[#71717a]" />
              <span>EXPLORE SPEC // DEMO</span>
            </button>
          </motion.div>
        </div>

        {/* ── High-Tech Command Terminal Preview Window (Linear Style) ─────── */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-14 linear-card p-0 overflow-hidden shadow-2xl border border-[#27272a]"
        >
          {/* Header Bar */}
          <div className="h-10 bg-[#0d0d10] border-b border-[#27272a] px-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a] border border-[#3f3f46]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a] border border-[#3f3f46]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a] border border-[#3f3f46]" />
              <span className="text-[11px] text-[#71717a] ml-2">KERNEL // SESSION_084</span>
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>WS // 127.0.0.1:3001 [CONNECTED]</span>
            </div>
            <div className="text-[11px] text-[#71717a] flex items-center gap-2">
              <span className="kbd-shortcut">ESC</span>
            </div>
          </div>

          {/* Terminal / Split Inspection */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] bg-[#09090b]">
            {/* Left: Telemetry / Indexed Volumes */}
            <div className="md:col-span-4 bg-[#0d0d10] border-r border-[#27272a] p-4 space-y-3 font-mono text-xs">
              <div className="text-[10px] text-[#71717a] uppercase tracking-wider flex items-center justify-between border-b border-[#1f1f23] pb-2">
                <span>[01 // REPOSITORY]</span>
                <span className="text-cyan-400">3 VOLUMES</span>
              </div>

              <div className="space-y-1.5">
                <div className="p-2.5 rounded-md bg-[#16161a] border border-cyan-500/40 flex items-start gap-2.5">
                  <Binary className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[#fafafa] truncate">attention_mech.pdf</p>
                    <p className="text-[10px] text-cyan-400/80">CHUNK_HASH: 7f8a9e &bull; 14 NODES</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-[#121215] border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-start gap-2.5 cursor-pointer">
                  <FileText className="w-4 h-4 text-[#71717a] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#a1a1aa] truncate">quantum_decoherence.pdf</p>
                    <p className="text-[10px] text-[#52525b]">CHUNK_HASH: 3c4d1f &bull; 28 NODES</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-[#121215] border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-start gap-2.5 cursor-pointer">
                  <FileText className="w-4 h-4 text-[#71717a] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#a1a1aa] truncate">bayesian_inference.md</p>
                    <p className="text-[10px] text-[#52525b]">OT_PEERS: 4 LIVE &bull; 82 OPS</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1f1f23]">
                <div className="p-2.5 rounded-md bg-[#121215] border border-[#27272a] text-[10px] text-[#a1a1aa] space-y-1">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span>COSINE SIMILARITY</span>
                    <span className="font-bold">98.4%</span>
                  </div>
                  <p className="text-[#71717a] leading-tight">
                    Deterministic query grounding. Vector bounds enforced strictly on every generation.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Modern high-density document sheet */}
            <div className="md:col-span-8 p-6 space-y-4 bg-[#09090b]">
              <div className="flex items-center justify-between pb-3 border-b border-[#1f1f23]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs font-mono text-[#fafafa]">DOC_ID: attention_mech // SECTION_3.2</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                    PEER: SARAH_K [LIVE]
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#a1a1aa] leading-relaxed space-y-3 font-normal">
                <p>
                  Output matrix computed deterministically through scaled dot-product attention queries:
                </p>

                {/* Swiss Minimalist KaTeX Math formulation */}
                <div className="p-3.5 rounded-md bg-[#0d0d10] border border-[#27272a] text-center font-mono text-sm text-[#fafafa]">
                  <span className="font-serif italic font-bold text-cyan-400">Attention</span>
                  <span className="text-[#a1a1aa]">(Q, K, V) = softmax</span>
                  <span className="text-[#52525b]">(</span>
                  <span className="text-[#fafafa] font-semibold">QK</span>
                  <sup className="text-cyan-400">T</sup>
                  <span className="text-[#52525b]"> / &radic;</span>
                  <span className="italic text-[#a1a1aa]">d</span>
                  <sub className="text-[#71717a]">k</sub>
                  <span className="text-[#52525b]">) </span>
                  <span className="text-[#fafafa] font-semibold">V</span>
                </div>

                <div className="p-3 rounded-md bg-[#121215] border border-[#27272a] flex items-start gap-2.5 text-[11px] text-[#a1a1aa] font-mono">
                  <BookmarkCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-cyan-400 font-semibold">[VERIFIED_SOURCE]</span>
                    <span className="ml-1 text-[#fafafa]">Vaswani et al., Section 3.2, Page 4</span>
                    <p className="text-[#71717a] mt-0.5 italic">
                      &ldquo;The two most commonly used attention functions are additive attention and dot-product attention.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 3 Swiss Minimalist Engineering Pillars ────────────────────────── */}
        <div id="features" className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
          <div className="linear-card linear-card-interactive p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-cyan-400">
              <span>[01 // VECTOR STORE]</span>
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#fafafa] font-sans">pgvector Indexing</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed font-sans">
              High-throughput paragraph chunking with exact line offsets and zero hallucination boundaries.
            </p>
          </div>

          <div className="linear-card linear-card-interactive p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-cyan-400">
              <span>[02 // CO-OP KERNEL]</span>
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#fafafa] font-sans">Operational Transform</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed font-sans">
              Decentralized state machine reconciling concurrent client mutations with zero character collisions.
            </p>
          </div>

          <div className="linear-card linear-card-interactive p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-cyan-400">
              <span>[03 // TYPOGRAPHY]</span>
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#fafafa] font-sans">Native KaTeX LaTeX</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed font-sans">
              Mathematical formulas, matrix equations, and proof trees rendered with KaTeX acceleration.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#27272a] bg-[#09090b] py-8 text-center text-xs text-[#52525b] font-mono">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <span className="text-cyan-400 font-bold">DOCMIND</span>
            <span>&bull;</span>
            <span className="text-[#52525b]">SWISS HIGH-TECH MINIMALIST SYSTEM</span>
          </div>
          <div className="flex items-center gap-5 text-[#71717a]">
            <Link to="/auth" className="hover:text-cyan-400 transition-colors">LOGIN</Link>
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">DASHBOARD</Link>
            <span>&copy; {new Date().getFullYear()} DOCMIND INC.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
