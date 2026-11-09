import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Shield, 
  Check, 
  ArrowRight,
  BookOpen,
  Edit3,
  Users,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f5f7] flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between border-b border-[#1f232b]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lg tracking-tight text-white">DocMind</span>
            <span className="text-xs text-[#828896] font-normal">Studio</span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-20 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181a22] border border-[#262a36] text-[#b3b8c5] text-xs font-medium mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Private Document Workspace &bull; Live Co-Authoring</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.12]"
        >
          A thoughtful workspace for your documents and team notes.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-[#9da2af] max-w-2xl leading-relaxed"
        >
          Read, query, and co-write across your PDF handbooks, research papers, and working documents — with instant verifiable citations and real-time collaboration.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-9 flex flex-col sm:flex-row items-center gap-3.5"
        >
          <Link
            to="/auth"
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Your Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="text-xs text-[#717684] flex items-center gap-1.5 px-3">
            <Check className="w-3.5 h-3.5 text-amber-400" />
            <span>Fast Email OTP &bull; Completely Private</span>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 text-left w-full">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-xl bg-[#13151b] border border-[#21242e] hover:border-[#2d3240] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1c1f28] border border-[#272b38] flex items-center justify-center text-amber-400 mb-4">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Document Library</h3>
            <p className="text-xs text-[#8c92a0] leading-relaxed">
              Upload study guides, technical PDFs, and notes into an organized library with automatic passage extraction.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-6 rounded-xl bg-[#13151b] border border-[#21242e] hover:border-[#2d3240] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1c1f28] border border-[#272b38] flex items-center justify-center text-amber-400 mb-4">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Grounded Answers</h3>
            <p className="text-xs text-[#8c92a0] leading-relaxed">
              Ask direct questions and receive clear, detailed solutions with exact passage and formula source citations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-6 rounded-xl bg-[#13151b] border border-[#21242e] hover:border-[#2d3240] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1c1f28] border border-[#272b38] flex items-center justify-center text-amber-400 mb-4">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Live Co-Authoring</h3>
            <p className="text-xs text-[#8c92a0] leading-relaxed">
              Open a live blank document and write alongside team members in real time without conflicting edits.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1a1d24] py-6 text-center text-xs text-[#636875]">
        DocMind Studio &bull; Private, collaborative document workspace
      </footer>
    </div>
  );
}
