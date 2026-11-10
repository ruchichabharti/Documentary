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
  Feather
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
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] flex flex-col font-sans selection:bg-[#fed7aa] selection:text-[#7c2d12]">
      {/* ── Studio Top Navigation ─────────────────────────────────────────── */}
      <header className="border-b border-[#e7e5e4] bg-[#faf9f6]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <Feather className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="font-serif-editorial text-lg tracking-tight text-[#1c1917]">
              DocMind Studio
            </span>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#a8a29e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search across documents and notes…"
                className="input-notion !pl-9 py-1 text-xs text-[#1c1917] bg-[#ffffff]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenChat(null)}
              className="btn-notion-secondary text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#c2410c]" />
              <span className="hidden sm:inline">Ask AI Assistant</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-xs text-[#57534e] max-w-[150px] sm:max-w-[200px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0" />
              <span className="font-mono text-[11px] truncate text-[#1c1917]" title={user?.email}>{user?.email || 'Authenticated'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-[#e7e5e4] bg-[#ffffff] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-[#78716c] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Studio Dashboard ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Metric Cards Banner (Notion Minimalist) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="notion-card p-4 bg-[#ffffff] border border-[#e7e5e4] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] flex items-center justify-center text-[#c2410c]">
              <FileText className="w-4 h-4 text-[#c2410c]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c]">Documents</p>
              <p className="text-lg font-bold text-[#1c1917] font-mono mt-0.5">{documents.length}</p>
            </div>
          </div>

          <div className="notion-card p-4 bg-[#ffffff] border border-[#e7e5e4] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] flex items-center justify-center text-[#57534e]">
              <Layers className="w-4 h-4 text-[#57534e]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c]">Indexed Sections</p>
              <p className="text-lg font-bold text-[#1c1917] font-mono mt-0.5">{totalChunks}</p>
            </div>
          </div>

          <div className="notion-card p-4 bg-[#ffffff] border border-[#e7e5e4] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center text-[#c2410c]">
              <BookmarkCheck className="w-4 h-4 text-[#c2410c]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c]">Citations</p>
              <p className="text-xs font-semibold text-[#c2410c] mt-0.5">Verified</p>
            </div>
          </div>

          <div className="notion-card p-4 bg-[#ffffff] border border-[#e7e5e4] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a]">
              <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
            </div>
            <div>
              <p className="text-xs text-[#78716c]">Privacy</p>
              <p className="text-xs font-semibold text-[#16a34a] mt-0.5">Protected</p>
            </div>
          </div>
        </div>

        {/* Action Header & Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif-editorial text-2xl font-normal text-[#1c1917] tracking-tight">My Documents</h1>
            <p className="text-xs text-[#78716c] mt-0.5">
              Upload documents, ask questions with real page references, or take notes together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="btn-notion-secondary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#57534e]" />
              <span>New Note</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-ink text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Document Grid (Notion Minimalist Cards) */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="notion-card notion-card-interactive p-5 bg-[#ffffff] border border-[#e7e5e4] flex flex-col justify-between group cursor-default"
                >
                  <div>
                    {/* Top document label & delete */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📄</span>
                        <span className="px-2 py-0.5 rounded bg-[#faf9f6] border border-[#e7e5e4] text-[10px] font-mono text-[#57534e] uppercase">
                          {doc.file_type?.includes('pdf') ? 'PDF' : 'Note'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete document"
                        className="p-1.5 rounded-md text-[#a8a29e] hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Document Title */}
                    <h3 className="font-serif-editorial text-base font-normal text-[#1c1917] line-clamp-1 group-hover:text-[#c2410c] transition-colors">
                      {doc.title}
                    </h3>

                    {/* Document Excerpt Preview Snippet */}
                    <p className="mt-2 text-xs text-[#57534e] leading-relaxed line-clamp-3 text-[13px] bg-[#faf9f6] p-3 rounded-lg border border-[#e7e5e4] italic font-serif-editorial">
                      "{previewSnippet}"
                    </p>

                    {/* Metadata line */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-[#78716c] font-mono text-[11px]">
                      <span className="flex items-center gap-1 text-[#c2410c]">
                        <Layers className="w-3 h-3" />
                        <span>{doc.chunk_count || 0} sections</span>
                      </span>
                      <span>&bull;</span>
                      <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3.5 mt-3.5 border-t border-[#f5f4f0] flex items-center justify-between">
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
                        className="btn-notion-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-[#78716c]" />
                        <span>Read</span>
                      </button>

                      <button
                        onClick={() => handleOpenChat(doc.id)}
                        className="btn-ink text-xs py-1 px-2.5 flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ask AI</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty Library State */
          <div className="notion-card border-dashed border-2 border-[#e7e5e4] rounded-2xl p-14 text-center bg-[#ffffff] space-y-3 font-sans">
            <div className="w-10 h-10 rounded-xl bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center mx-auto">
              <FileUp className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-serif-editorial text-lg text-[#1c1917]">Your reading library is empty</h3>
              <p className="text-xs text-[#78716c] max-w-sm mx-auto mt-1 leading-relaxed">
                {searchFilter
                  ? 'No documents matched your search filter.'
                  : 'Upload your first research paper, book chapter, or manuscript to begin reading and taking notes.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-ink mt-2 text-xs"
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
