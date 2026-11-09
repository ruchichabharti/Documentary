import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  FileUp, 
  CheckCircle2, 
  Database,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  FileText,
  Layers,
  Edit3,
  BookMarked,
  Clock,
  ChevronRight
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
      // 1. Primary: Fetch from backend database
      try {
        const res = await api.listIngestedDocs();
        if (res?.documents && Array.isArray(res.documents)) {
          setDocuments(res.documents);
          const allChunks = res.documents.flatMap((d) => d.chunks || []);
          setAllLocalChunks(allChunks);

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

      // 2. Secondary: Supabase database query
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

      // 3. Fallback: User-scoped localStorage
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
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    if (newDoc.chunks) {
      setAllLocalChunks((prev) => [...newDoc.chunks, ...prev]);
    }

    try {
      await api.saveIngestedDoc(newDoc);
    } catch (saveErr) {
      console.warn('[DocMind] Could not save document to backend:', saveErr);
    }

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
    if (!window.confirm('Are you sure you want to remove this document from your library?')) {
      return;
    }

    try {
      await api.deleteIngestedDoc(docId);
    } catch (delErr) {
      console.warn('[DocMind] Could not delete from backend:', delErr);
    }

    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('documents').delete().eq('id', docId).eq('user_id', user.id);
      } catch (err) {
        console.warn('Error deleting document from Supabase:', err);
      }
    }

    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setAllLocalChunks((prev) => prev.filter((c) => c.documentId !== docId && c.document_id !== docId));

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
    <div className="min-h-screen bg-[#f8f6f1] text-[#1c1917] flex flex-col selection:bg-[#fed7aa] selection:text-[#7c2d12]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full border-b border-[#e5e0d4] bg-[#f8f6f1]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1c1917] text-[#f8f6f1] flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight font-serif-title text-[#1c1917]">
              DocMind Studio
            </span>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#a8a29e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search across documents and notes…"
                className="w-full bg-white border border-[#e5e0d4] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => handleOpenChat(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#f2eee5] border border-[#e5e0d4] text-[#1c1917] text-xs font-medium transition-all shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#c2410c]" />
              <span className="hidden sm:inline">Ask Companion</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e0d4] text-xs text-[#57534e] max-w-[150px] sm:max-w-[220px]">
              <span className="w-2 h-2 rounded-full bg-[#15803d] shrink-0" />
              <span className="font-mono text-[11px] truncate text-[#1c1917]" title={user?.email}>{user?.email || 'Authenticated'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-[#e5e0d4] bg-white hover:bg-[#fef2f2] hover:border-[#fecaca] hover:text-[#dc2626] text-[#78716c] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Studio Dashboard ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Metric Cards Banner (Warm Paper) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="paper-card p-5 bg-white border border-[#e5e0d4] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] flex items-center justify-center text-[#1c1917]">
              <FileText className="w-5 h-5 text-[#c2410c]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-medium font-serif-title">Library Documents</p>
              <p className="text-xl font-normal text-[#1c1917] font-serif-title mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="paper-card p-5 bg-white border border-[#e5e0d4] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] flex items-center justify-center text-[#1c1917]">
              <Layers className="w-5 h-5 text-[#57534e]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-medium font-serif-title">Readable Sections</p>
              <p className="text-xl font-normal text-[#1c1917] font-serif-title mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="paper-card p-5 bg-white border border-[#e5e0d4] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] flex items-center justify-center text-[#1c1917]">
              <BookMarked className="w-5 h-5 text-[#57534e]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-medium font-serif-title">Source Citations</p>
              <p className="text-base font-normal text-[#1c1917] font-serif-title mt-0.5">Verified References</p>
            </div>
          </div>

          <div className="paper-card p-5 bg-white border border-[#e5e0d4] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] flex items-center justify-center text-[#15803d]">
              <ShieldCheck className="w-5 h-5 text-[#15803d]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-medium font-serif-title">Vault Privacy</p>
              <p className="text-base font-normal text-[#15803d] font-serif-title mt-0.5">Account Isolated</p>
            </div>
          </div>
        </div>

        {/* Action Header & Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-normal font-serif-title text-[#1c1917] tracking-tight">Your Document Library</h1>
            <p className="text-xs text-[#78716c] mt-0.5 font-normal">
              Read passages, search with verified paragraph citations, or open collaborative notes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="btn-paper"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#57534e]" />
              <span>New Note</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-ink"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Document Grid (Rich Editorial Paper Cards) */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => {
              const previewSnippet = doc.chunks?.[0]?.content 
                ? doc.chunks[0].content.slice(0, 140) + '…' 
                : 'Reading sections ready for instant search and co-authoring notes.';

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="paper-card paper-card-interactive p-6 bg-white border border-[#e5e0d4] flex flex-col justify-between group cursor-default"
                >
                  <div>
                    {/* Top document label & delete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#fbfaf8] border border-[#e5e0d4] flex items-center justify-center text-[#c2410c] shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#f2eee5] border border-[#e5e0d4] text-[10px] font-mono text-[#78716c] uppercase">
                          {doc.file_type?.includes('pdf') ? 'PDF Document' : 'Document'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete document"
                        className="p-1 rounded-md text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Document Title */}
                    <h3 className="text-base font-normal font-serif-title text-[#1c1917] line-clamp-1 group-hover:text-[#c2410c] transition-colors">
                      {doc.title}
                    </h3>

                    {/* Document Excerpt Preview Snippet */}
                    <p className="mt-2 text-xs text-[#57534e] leading-relaxed line-clamp-3 font-serif-title text-[13px] bg-[#fbfaf8] p-3 rounded-lg border border-[#f2eee5]">
                      "{previewSnippet}"
                    </p>

                    {/* Metadata line */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-[#78716c] font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#a8a29e]" />
                        <span>{doc.chunk_count || 0} sections</span>
                      </span>
                      <span>•</span>
                      <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 mt-4 border-t border-[#f2eee5] flex items-center justify-between">
                    <span className="text-[11px] text-[#a8a29e] font-mono">
                      {new Date(doc.created_at || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/doc/${doc.id}`)}
                        title="Open Document & Notes"
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#f2eee5] border border-[#e5e0d4] text-[#1c1917] text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-[#78716c]" />
                        <span>Read</span>
                      </button>

                      <button
                        onClick={() => handleOpenChat(doc.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1c1917] hover:bg-[#2e2a27] text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <MessageSquare className="w-3 h-3 text-[#fed7aa]" />
                        <span>Ask</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty Library State */
          <div className="paper-card border border-dashed border-[#e5e0d4] rounded-2xl p-14 text-center bg-white space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#f2eee5] border border-[#e5e0d4] text-[#1c1917] flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6 text-[#c2410c]" />
            </div>
            <div>
              <h3 className="text-base font-normal font-serif-title text-[#1c1917]">Your library is quiet</h3>
              <p className="text-xs text-[#78716c] max-w-sm mx-auto mt-1 leading-relaxed font-serif-title text-[13px]">
                {searchFilter
                  ? 'No documents matched your search filter.'
                  : 'Upload your first book chapter, research report, or notes to begin reading and asking questions.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-ink mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload First Document</span>
            </button>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentAdded={handleDocumentAdded}
      />

      {/* Research Companion Assistant Drawer */}
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
