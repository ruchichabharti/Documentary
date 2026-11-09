import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  LogOut, 
  User, 
  ShieldCheck, 
  FileUp, 
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
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { api } from '../lib/api.js';
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

  // Helper to get storage key strictly isolated by user email
  const getUserStorageKey = (currentUser) => {
    if (!currentUser?.email) return 'docmind_guest_docs';
    return `docmind_user_docs_${currentUser.email.trim().toLowerCase()}`;
  };

  // Load documents on mount or user change
  useEffect(() => {
    loadUserDocuments();
  }, [user]);

  const loadUserDocuments = async () => {
    setLoadingDocs(true);

    // Clean up legacy shared global storage key to prevent cross-account leakage
    try {
      localStorage.removeItem('docmind_local_docs');
    } catch (_) {}

    if (!user) {
      setDocuments([]);
      setAllLocalChunks([]);
      setLoadingDocs(false);
      return;
    }

    try {
      // 1. Primary: Fetch from backend database (filtered by JWT user.sub and email)
      try {
        const res = await api.listIngestedDocs();
        if (res?.documents && Array.isArray(res.documents)) {
          setDocuments(res.documents);
          const allChunks = res.documents.flatMap((d) => d.chunks || []);
          setAllLocalChunks(allChunks);

          // Update user-scoped local cache
          const storageKey = getUserStorageKey(user);
          if (storageKey) {
            localStorage.setItem(
              storageKey,
              JSON.stringify({ documents: res.documents, chunks: allChunks })
            );
          }
          setLoadingDocs(false);
          return;
        }
      } catch (backendErr) {
        console.warn('[DocMind] Backend doc load notice:', backendErr.message);
      }

      // 2. Secondary: If Supabase Auth is active, query Supabase strictly for user.id
      const isRealSupabaseUser = Boolean(
        isSupabaseConfigured &&
        user?.id &&
        !user.id.startsWith('demo-guest') &&
        user.app_metadata?.provider !== 'guest'
      );

      if (isRealSupabaseUser) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          setDocuments(data);
          try {
            const { data: chunksData } = await supabase
              .from('document_chunks')
              .select('id, document_id, chunk_index, content, metadata, embedding')
              .eq('user_id', user.id);
            if (chunksData && Array.isArray(chunksData)) {
              setAllLocalChunks(chunksData);
            }
          } catch (chunkErr) {
            console.warn('[DocMind] Could not load chunks from Supabase:', chunkErr);
          }
          setLoadingDocs(false);
          return;
        }
      }

      // 3. Fallback: Read from user-scoped localStorage (NEVER shared with other emails)
      const storageKey = getUserStorageKey(user);
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.documents)) {
            setDocuments(parsed.documents);
            setAllLocalChunks(parsed.chunks || []);
            setLoadingDocs(false);
            return;
          }
        }
      }

      // 4. Fresh new account: Start completely clean with 0 documents
      setDocuments([]);
      setAllLocalChunks([]);
    } catch (err) {
      console.warn('[DocMind] Could not load documents:', err);
      setDocuments([]);
      setAllLocalChunks([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocumentAdded = async (newDoc) => {
    // 1. Optimistically update local React state
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    if (newDoc.chunks) {
      setAllLocalChunks((prev) => [...newDoc.chunks, ...prev]);
    }

    // 2. Persist to backend database for this user
    try {
      await api.saveIngestedDoc(newDoc);
    } catch (saveErr) {
      console.warn('[DocMind] Could not save document to backend:', saveErr);
    }

    // 3. Persist to user-scoped localStorage
    try {
      const storageKey = getUserStorageKey(user);
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        const parsed = stored ? JSON.parse(stored) : { documents: [], chunks: [] };
        parsed.documents = [newDoc, ...parsed.documents.filter((d) => d.id !== newDoc.id)];
        if (newDoc.chunks) {
          parsed.chunks = [...newDoc.chunks, ...parsed.chunks];
        }
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    } catch (_) {}
  };

  const handleDeleteDocument = async (docId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document from your library?')) {
      return;
    }

    // 1. Delete from backend database
    try {
      await api.deleteIngestedDoc(docId);
    } catch (delErr) {
      console.warn('[DocMind] Could not delete from backend:', delErr);
    }

    // 2. Delete from Supabase if configured
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('documents').delete().eq('id', docId).eq('user_id', user.id);
      } catch (err) {
        console.warn('Error deleting document from Supabase:', err);
      }
    }

    // 3. Update React state
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setAllLocalChunks((prev) => prev.filter((c) => c.documentId !== docId && c.document_id !== docId));

    // 4. Update user-scoped localStorage
    try {
      const storageKey = getUserStorageKey(user);
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.documents = (parsed.documents || []).filter((d) => d.id !== docId);
          parsed.chunks = (parsed.chunks || []).filter((c) => c.documentId !== docId && c.document_id !== docId);
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
    } catch (_) {}
  };

  const handleOpenChat = (docId = null) => {
    setActiveChatDocId(docId);
    setIsChatOpen(true);
  };

  const handleSignOut = async () => {
    try {
      setDocuments([]);
      setAllLocalChunks([]);
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
    <div className="min-h-screen bg-[#0b0c0e] text-stone-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-[#21242e] bg-[#12141a]/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              DocMind <span className="text-amber-400 font-normal text-sm ml-1">Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => handleOpenChat(null)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171a22] hover:bg-[#1f232d] border border-[#242833] hover:border-amber-500/40 text-stone-200 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Search Library</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#13151b] border border-[#21242e] text-xs text-stone-300 max-w-[160px] sm:max-w-[280px]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-mono text-[11px] truncate text-stone-300" title={user?.email}>{user?.email || 'Authenticated User'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out of this account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#21242e] bg-[#13151b] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 text-stone-400 text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
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
          <div className="p-5 rounded-2xl bg-[#13151b] border border-[#21242e] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Total Documents</p>
              <p className="text-xl font-semibold text-white font-mono mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#13151b] border border-[#21242e] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-stone-800 border border-stone-700/60 flex items-center justify-center text-stone-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Readable Sections</p>
              <p className="text-xl font-semibold text-white font-mono mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#13151b] border border-[#21242e] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-stone-800 border border-stone-700/60 flex items-center justify-center text-stone-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Search Engine</p>
              <p className="text-base font-semibold text-white mt-0.5">Grounded Index</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#13151b] border border-[#21242e] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Privacy Status</p>
              <p className="text-base font-semibold text-emerald-400 mt-0.5">Isolated Account</p>
            </div>
          </div>
        </div>

        {/* Action Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Your Document Library</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Upload files or open a live document to take collaborative notes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search documents..."
                className="bg-[#13151b] border border-[#21242e] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/80 transition-colors w-48 sm:w-64"
              />
            </div>

            {/* New Live Doc Button */}
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171a22] hover:bg-[#1e222d] border border-[#242833] hover:border-stone-600 text-stone-200 hover:text-white text-xs font-medium transition-all cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-400" />
              <span>New Document</span>
            </button>

            {/* Upload File Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Upload File</span>
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
                className="p-5 rounded-2xl bg-[#13151b] hover:bg-[#171a22] border border-[#21242e] hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ready</span>
                      </span>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete document"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {doc.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-3 text-xs text-stone-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>{doc.chunk_count || 0} sections</span>
                    </span>
                    <span>•</span>
                    <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#21242e] flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 font-mono">
                    {new Date(doc.created_at || Date.now()).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/doc/${doc.id}`)}
                      title="Open in Document Editor"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1d26] hover:bg-[#222632] border border-[#2a2e3d] text-stone-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-stone-400" />
                      <span>Open</span>
                    </button>

                    <button
                      onClick={() => handleOpenChat(doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-transparent text-amber-400 hover:text-stone-950 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask Question</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#242833] rounded-2xl p-12 text-center bg-[#13151b]/40 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Your library is empty</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {searchFilter
                  ? 'No documents matched your search filter.'
                  : 'Upload your first PDF, notes, or reference documents to begin searching and co-authoring.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
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

      {/* Grounded Q&A Assistant Drawer */}
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
