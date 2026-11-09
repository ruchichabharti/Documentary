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
  BookmarkCheck, 
  CheckCircle2,
  Sparkles
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
            const docIds = data.map((d) => d.id);
            const { data: chunksData } = await supabase
              .from('document_chunks')
              .select('*')
              .in('document_id', docIds);

            if (chunksData) {
              setAllLocalChunks(chunksData);
            }
          } catch (_) {}
          setLoadingDocs(false);
          return;
        }
      }

      const storageKey = getUserStorageKey(user);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDocuments(parsed.documents || []);
        setAllLocalChunks(parsed.chunks || []);
      } else {
        setDocuments([]);
        setAllLocalChunks([]);
      }
    } catch (err) {
      console.warn('[DocMind] Error loading documents:', err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocumentAdded = ({ document, chunks }) => {
    const updatedDocs = [document, ...documents.filter((d) => d.id !== document.id)];
    const updatedChunks = [...allLocalChunks, ...(chunks || [])];

    setDocuments(updatedDocs);
    setAllLocalChunks(updatedChunks);

    const storageKey = getUserStorageKey(user);
    if (storageKey) {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ documents: updatedDocs, chunks: updatedChunks })
        );
      } catch (_) {}
    }
  };

  const handleDeleteDocument = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document from your library?')) return;

    try {
      try {
        await api.deleteIngestedDoc(id);
      } catch (_) {}

      if (isSupabaseConfigured && user?.id) {
        await supabase.from('document_chunks').delete().eq('document_id', id);
        await supabase.from('documents').delete().eq('id', id);
      }
    } catch (err) {
      console.warn('[DocMind] Backend delete error:', err);
    }

    const updated = documents.filter((d) => d.id !== id);
    const updatedChunks = allLocalChunks.filter((c) => c.document_id !== id);
    setDocuments(updated);
    setAllLocalChunks(updatedChunks);

    const storageKey = getUserStorageKey(user);
    if (storageKey) {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ documents: updated, chunks: updatedChunks })
        );
      } catch (_) {}
    }
  };

  const handleOpenChat = (docId = null) => {
    setActiveChatDocId(docId);
    setIsChatOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredDocs = documents.filter((d) =>
    (d.title || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ── Studio Top Navigation ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2.3]" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              DocMind Studio
            </span>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search across documents and notes…"
                className="input-modern pl-9 py-1.5 text-xs text-slate-900 bg-slate-50/80 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => handleOpenChat(null)}
              className="btn-modern-secondary text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Research Companion</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-w-[150px] sm:max-w-[220px]">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span className="font-mono text-[11px] truncate text-slate-800" title={user?.email}>{user?.email || 'Authenticated'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Studio Dashboard ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Metric Cards Banner (California Modernist White Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="modern-card p-5 bg-white border border-slate-200/90 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Documents</p>
              <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="modern-card p-5 bg-white border border-slate-200/90 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Readable Sections</p>
              <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="modern-card p-5 bg-white border border-slate-200/90 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <BookmarkCheck className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Source Citations</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">Verified References</p>
            </div>
          </div>

          <div className="modern-card p-5 bg-white border border-slate-200/90 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Workspace Privacy</p>
              <p className="text-sm font-semibold text-emerald-600 mt-0.5">Account Isolated</p>
            </div>
          </div>
        </div>

        {/* Action Header & Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Studio</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Browse documents, inquire with verified paragraph citations, or co-author live notes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="btn-modern-secondary"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>New Note</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-cobalt"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Document Grid (California Modernist Cards) */}
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
                  className="modern-card modern-card-interactive p-6 bg-white border border-slate-200/90 flex flex-col justify-between group cursor-default"
                >
                  <div>
                    {/* Top document label & delete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700 uppercase font-semibold">
                          {doc.file_type?.includes('pdf') ? 'PDF Document' : 'Manuscript'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete volume"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Document Title */}
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>

                    {/* Document Excerpt Preview Snippet */}
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-3 text-[13px] bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 italic font-normal">
                      "{previewSnippet}"
                    </p>

                    {/* Metadata line */}
                    <div className="mt-3.5 flex items-center gap-3 text-xs text-slate-500 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-600" />
                        <span>{doc.chunk_count || 0} sections</span>
                      </span>
                      <span>&bull;</span>
                      <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
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
                        className="btn-modern-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Read</span>
                      </button>

                      <button
                        onClick={() => handleOpenChat(doc.id)}
                        className="btn-cobalt text-xs py-1.5 px-3 flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
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
          <div className="modern-card border-dashed border-2 border-slate-200 rounded-2xl p-14 text-center bg-white space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Your document studio is quiet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed text-[14px]">
                {searchFilter
                  ? 'No documents matched your search filter.'
                  : 'Upload your first research report, PDF volume, or manuscript to begin reading and taking notes.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-cobalt mt-2"
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
