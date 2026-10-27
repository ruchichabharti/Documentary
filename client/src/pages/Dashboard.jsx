import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  LogOut, 
  User, 
  ShieldCheck, 
  FileUp, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Database,
  ArrowRight,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  FileText,
  Layers,
  HelpCircle,
  ExternalLink,
  Cpu,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import DocumentUploadModal from '../components/DocumentUploadModal.jsx';
import ChatAssistant from '../components/ChatAssistant.jsx';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Document management state
  const [documents, setDocuments] = useState([]);
  const [allLocalChunks, setAllLocalChunks] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatDocId, setActiveChatDocId] = useState(null);

  // Load documents on mount
  useEffect(() => {
    loadUserDocuments();
  }, [user]);

  const loadUserDocuments = async () => {
    setLoadingDocs(true);
    try {
      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          setDocuments(data);
          // Also load chunks into memory for instant local RAG fallback
          try {
            const { data: chunksData } = await supabase
              .from('document_chunks')
              .select('id, document_id, chunk_index, content, metadata, embedding');
            if (chunksData && Array.isArray(chunksData)) {
              setAllLocalChunks(chunksData);
            }
          } catch (chunkErr) {
            console.warn('[DocMind] Could not pre-cache chunks from Supabase:', chunkErr);
          }
          setLoadingDocs(false);
          return;
        }
      }

      // Fallback: Read from localStorage if Supabase is still connecting
      const stored = localStorage.getItem('docmind_local_docs');
      if (stored) {
        const parsed = JSON.parse(stored);
        setDocuments(parsed.documents || []);
        setAllLocalChunks(parsed.chunks || []);
      } else {
        // Seed with a rich default demo document if empty
        seedDefaultDocument();
      }
    } catch (err) {
      console.warn('[DocMind] Could not load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const seedDefaultDocument = () => {
    const demoDoc = {
      id: 'demo-doc-1',
      title: 'DocMind Architecture & pgvector RAG Whitepaper.md',
      file_path: 'architecture_whitepaper.md',
      file_type: 'text/markdown',
      file_size: 4280,
      status: 'ready',
      chunk_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const demoChunks = [
      {
        id: 'c-1',
        chunkIndex: 0,
        documentId: 'demo-doc-1',
        content: 'DocMind is a next-generation document intelligence engine that couples Supabase Postgres and the pgvector extension with large language models. The system guarantees sub-millisecond approximate nearest neighbor (ANN) search across millions of embedded text chunks utilizing Hierarchical Navigable Small World (HNSW) indexing.',
        metadata: { documentId: 'demo-doc-1', documentTitle: demoDoc.title },
      },
      {
        id: 'c-2',
        chunkIndex: 1,
        documentId: 'demo-doc-1',
        content: 'Data isolation and tenant security in DocMind are enforced cryptographically via Supabase Row Level Security (RLS). Every document, chunk, and chat history entry references auth.uid(). Policies guarantee that no user can query or inspect embeddings belonging to another tenant.',
        metadata: { documentId: 'demo-doc-1', documentTitle: demoDoc.title },
      },
      {
        id: 'c-3',
        chunkIndex: 2,
        documentId: 'demo-doc-1',
        content: 'The document ingestion pipeline processes input files through an overlap-aware sliding window chunker. The default configuration uses 1200 characters per chunk with a 200-character overlap, ensuring sentence boundaries remain intact and cross-chunk context is preserved.',
        metadata: { documentId: 'demo-doc-1', documentTitle: demoDoc.title },
      },
      {
        id: 'c-4',
        chunkIndex: 3,
        documentId: 'demo-doc-1',
        content: 'During query retrieval, the match_document_chunks PostgreSQL RPC function calculates cosine similarity (1 - (embedding <=> query_embedding)) with configurable threshold filters and match counts, returning structured metadata directly to the grounded answer synthesizer.',
        metadata: { documentId: 'demo-doc-1', documentTitle: demoDoc.title },
      },
    ];

    setDocuments([demoDoc]);
    setAllLocalChunks(demoChunks);
    localStorage.setItem(
      'docmind_local_docs',
      JSON.stringify({ documents: [demoDoc], chunks: demoChunks })
    );
  };

  const handleDocumentAdded = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    if (newDoc.chunks) {
      setAllLocalChunks((prev) => [...newDoc.chunks, ...prev]);
    }

    // Persist to localStorage as well
    try {
      const stored = localStorage.getItem('docmind_local_docs');
      const parsed = stored ? JSON.parse(stored) : { documents: [], chunks: [] };
      parsed.documents = [newDoc, ...parsed.documents.filter((d) => d.id !== newDoc.id)];
      if (newDoc.chunks) {
        parsed.chunks = [...newDoc.chunks, ...parsed.chunks];
      }
      localStorage.setItem('docmind_local_docs', JSON.stringify(parsed));
    } catch (_) {}
  };

  const handleDeleteDocument = async (docId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document and all associated vector chunks?')) {
      return;
    }

    if (isSupabaseConfigured && user) {
      try {
        await supabase.from('documents').delete().eq('id', docId);
      } catch (err) {
        console.warn('Error deleting document from Supabase:', err);
      }
    }

    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setAllLocalChunks((prev) => prev.filter((c) => c.documentId !== docId && c.document_id !== docId));

    try {
      const stored = localStorage.getItem('docmind_local_docs');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.documents = parsed.documents.filter((d) => d.id !== docId);
        parsed.chunks = parsed.chunks.filter((c) => c.documentId !== docId && c.document_id !== docId);
        localStorage.setItem('docmind_local_docs', JSON.stringify(parsed));
      }
    } catch (_) {}
  };

  const handleOpenChat = (docId = null) => {
    setActiveChatDocId(docId);
    setIsChatOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunk_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-800/80 bg-[#12131c]/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              Doc<span className="text-indigo-400">Mind</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => handleOpenChat(null)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI (All Docs)</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">{user?.email || 'Authenticated User'}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 text-slate-300 text-xs font-medium transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-[#121422]/90 border border-slate-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Ingested Documents</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121422]/90 border border-slate-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Indexed Chunks</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121422]/90 border border-slate-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Vector Index</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">1536d HNSW</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121422]/90 border border-slate-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Access Control</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">Row Level Security</p>
            </div>
          </div>
        </div>

        {/* Action Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Your Document Knowledge Base</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload documents to automatically chunk, vectorize, and unlock instant grounded semantic search.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter documents..."
                className="bg-[#121422] border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-48 sm:w-64"
              />
            </div>

            {/* New Live Doc Button */}
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/40 text-slate-200 hover:text-white text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Live Doc</span>
            </button>

            {/* Ingest Document Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest Document</span>
            </button>
          </div>
        </div>

        {/* Document Grid */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-[#121422]/80 hover:bg-[#151726] border border-slate-800/80 hover:border-indigo-500/40 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ready</span>
                      </span>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete document"
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {doc.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{doc.chunk_count || 0} Chunks</span>
                    </span>
                    <span>•</span>
                    <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {new Date(doc.created_at || Date.now()).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/doc/${doc.id}`)}
                      title="Open in Collaborative Editor"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleOpenChat(doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600 border border-indigo-500/30 hover:border-transparent text-indigo-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-[#12131c]/30 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FileUp className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No documents found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchFilter
                  ? 'No documents matched your filter. Try a different query.'
                  : 'Get started by ingesting your first document to enable semantic similarity search.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest Document Now</span>
            </button>
          </div>
        )}
      </main>

      {/* Ingestion Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentAdded={handleDocumentAdded}
      />

      {/* Grounded RAG Chat Assistant Drawer */}
      <ChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        documents={documents}
        allLocalChunks={allLocalChunks}
        selectedDocId={activeChatDocId}
      />
    </div>
  );
}
