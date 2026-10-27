import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  Search, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  BrainCircuit,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Doc<span className="text-indigo-400">Mind</span>
          </span>
        </div>

        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-20 max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Real-time Semantic Search & RAG Q&A Engine</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]"
        >
          Chat with your documents using <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">precision vectors</span> & grounded AI.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed"
        >
          DocMind extracts, chunks, embeds, and indexes your PDFs and files into Supabase Postgres using <code className="text-indigo-300 font-mono text-base">pgvector</code>. Query anything with zero hallucinations.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            to="/auth"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-base shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Launch DocMind Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 px-3">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real Email OTP &bull; Supabase RLS Protected</span>
          </div>
        </motion.div>

        {/* Technical Architecture Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="p-6 rounded-2xl bg-[#12131c]/80 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Supabase pgvector</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native cosine similarity search stored directly in PostgreSQL. High throughput vector indexing with IVFFlat or HNSW.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-6 rounded-2xl bg-[#12131c]/80 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Smart Chunking & Embeddings</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Context-aware chunking with token overlaps to maintain semantic continuity. Real vector embeddings for every paragraph.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-6 rounded-2xl bg-[#12131c]/80 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Row Level Security (RLS)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bulletproof database security policies. Users can only query, index, or retrieve their own private documents.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500 relative z-10">
        DocMind Platform &copy; 2026 &bull; Real Architecture &bull; Supabase &bull; pgvector
      </footer>
    </div>
  );
}
