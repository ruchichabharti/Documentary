import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  FileUp, 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  FileText, 
  Layers, 
  Edit3, 
  Bookmark, 
  Leaf, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { api } from '../lib/api.js';
import DocumentUploadModal from '../components/DocumentUploadModal.jsx';
import ChatAssistant from '../components/ChatAssistant.jsx';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [allLocalChunks, setAllLocalChunks] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatDocId, setActiveChatDocId] = useState(null);

  const getUserStorageKey = (currentUser) => {
    if (!currentUser?.email) return 'docmind_guest_docs';
    return `docmind_user_docs_${currentUser.email.trim().toLowerCase()}`;
  };

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
    if (!window.confirm('Are you sure you want to remove this volume from your library vault?')) {
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
    <div className="min-h-screen bg-[#0a1110] text-[#f2f7f5] flex flex-col selection:bg-[#064e3b] selection:text-[#a7f3d0]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full border-b border-[#233a34] bg-[#0a1110]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#14221f] border border-[#2f4f47] text-emerald-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-[#f2f7f5]">
              DocMind Studio
            </span>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#526f67] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search across volumes and notes…"
                className="input-nordic pl-9 py-1.5 text-xs text-[#f2f7f5]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => handleOpenChat(null)}
              className="btn-nordic-secondary text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Research Companion</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14221f] border border-[#233a34] text-xs text-[#8ca89f] max-w-[150px] sm:max-w-[220px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-mono text-[11px] truncate text-[#f2f7f5]" title={user?.email}>{user?.email || 'Authenticated'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-lg border border-[#233a34] bg-[#14221f] hover:bg-rose-950/30 hover:border-rose-500/40 hover:text-rose-300 text-[#8ca89f] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Studio Dashboard ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Metric Cards Banner (Nordic Forest Slate) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="nordic-card p-5 bg-[#14221f] border border-[#233a34] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-[#8ca89f] font-medium">Library Volumes</p>
              <p className="text-xl font-semibold text-[#f2f7f5] font-mono mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="nordic-card p-5 bg-[#14221f] border border-[#233a34] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-[#8ca89f]">
              <Layers className="w-5 h-5 text-[#8ca89f]" />
            </div>
            <div>
              <p className="text-xs text-[#8ca89f] font-medium">Readable Sections</p>
              <p className="text-xl font-semibold text-[#f2f7f5] font-mono mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="nordic-card p-5 bg-[#14221f] border border-[#233a34] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <Bookmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-[#8ca89f] font-medium">Source Citations</p>
              <p className="text-base font-medium text-[#f2f7f5] mt-0.5">Verified References</p>
            </div>
          </div>

          <div className="nordic-card p-5 bg-[#14221f] border border-[#233a34] flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-[#8ca89f] font-medium">Vault Privacy</p>
              <p className="text-base font-medium text-emerald-400 mt-0.5">Account Isolated</p>
            </div>
          </div>
        </div>

        {/* Action Header & Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#f2f7f5] tracking-tight">The Library Vault</h1>
            <p className="text-xs text-[#8ca89f] mt-0.5">
              Read literature, search with verified paragraph citations, or co-author longform notes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="btn-nordic-secondary"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#8ca89f]" />
              <span>New Note</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-emerald"
            >
              <Plus className="w-3.5 h-3.5 text-[#051410]" />
              <span>Upload Volume</span>
            </button>
          </div>
        </div>

        {/* Document Grid (Rich Nordic Slate Cards) */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => {
              const previewSnippet = doc.chunks?.[0]?.content 
                ? doc.chunks[0].content.slice(0, 150) + '…' 
                : 'Reading sections ready for instant search and co-authoring notes.';

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="nordic-card nordic-card-interactive p-6 bg-[#14221f] border border-[#233a34] flex flex-col justify-between group cursor-default"
                >
                  <div>
                    {/* Top document label & delete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1a2d29] border border-[#2e4d45] flex items-center justify-center text-emerald-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#1b2e2a] border border-[#2e4d45] text-[10px] font-mono text-emerald-300 uppercase">
                          {doc.file_type?.includes('pdf') ? 'PDF Volume' : 'Manuscript'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete volume"
                        className="p-1.5 rounded-md text-[#526f67] hover:text-rose-400 hover:bg-rose-950/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Document Title */}
                    <h3 className="text-base font-semibold text-[#f2f7f5] line-clamp-1 group-hover:text-emerald-300 transition-colors">
                      {doc.title}
                    </h3>

                    {/* Document Excerpt Preview Snippet */}
                    <p className="mt-2.5 text-xs text-[#8ca89f] leading-relaxed line-clamp-3 text-[13px] bg-[#0d1715] p-3.5 rounded-lg border border-[#1f342f] italic">
                      "{previewSnippet}"
                    </p>

                    {/* Metadata line */}
                    <div className="mt-3.5 flex items-center gap-3 text-xs text-[#526f67] font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-400/80" />
                        <span>{doc.chunk_count || 0} sections</span>
                      </span>
                      <span>•</span>
                      <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 mt-4 border-t border-[#1f342f] flex items-center justify-between">
                    <span className="text-[11px] text-[#526f67] font-mono">
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
                        className="btn-nordic-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-[#8ca89f]" />
                        <span>Read</span>
                      </button>

                      <button
                        onClick={() => handleOpenChat(doc.id)}
                        className="btn-emerald text-xs py-1.5 px-3 flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3 text-[#051410]" />
                        <span>Inquire</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty Library State */
          <div className="nordic-card border border-dashed border-[#233a34] rounded-2xl p-14 text-center bg-[#14221f] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a2d29] border border-[#2e4d45] text-emerald-400 flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#f2f7f5]">Your library vault is quiet</h3>
              <p className="text-xs text-[#8ca89f] max-w-sm mx-auto mt-1 leading-relaxed text-[14px]">
                {searchFilter
                  ? 'No documents matched your search filter.'
                  : 'Upload your first book chapter, research report, or manuscript to begin reading and taking notes.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-emerald mt-2"
            >
              <Plus className="w-3.5 h-3.5 text-[#051410]" />
              <span>Upload First Volume</span>
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
