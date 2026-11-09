import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
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
  Binary,
  Command,
  CornerDownLeft
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
    if (!window.confirm('Delete this volume from repository?')) return;

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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-cyan-950 selection:text-cyan-300">
      {/* ── High-Tech Top Navigation ──────────────────────────────────────── */}
      <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#16161a] border border-[#27272a] text-cyan-400 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              DM
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#fafafa] font-mono">
              DOCMIND // COMMAND_HUB
            </span>
          </div>

          {/* Quick Search with KBD Hint */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#52525b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Query repository index…"
                className="input-linear pl-8 pr-12 py-1 text-xs font-mono text-[#fafafa]"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5">
                <span className="kbd-shortcut">⌘K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleOpenChat(null)}
              className="btn-linear-secondary text-xs font-mono"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">INSPECT_QUERY</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#121215] border border-[#27272a] text-xs font-mono text-[#a1a1aa] max-w-[150px] sm:max-w-[220px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-[11px] truncate text-[#fafafa]" title={user?.email}>{user?.email || 'AUTHENTICATED'}</span>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-md border border-[#27272a] bg-[#121215] hover:bg-rose-950/30 hover:border-rose-500/40 hover:text-rose-300 text-[#71717a] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Command Dashboard ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-7">
        {/* Metric Cards Banner (Swiss Minimalist Linear Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7 font-mono">
          <div className="linear-card p-4 bg-[#121215] border border-[#27272a] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#71717a] uppercase">[01 // VOLUMES]</p>
              <p className="text-xl font-bold text-[#fafafa] mt-1">{documents.length}</p>
            </div>
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="linear-card p-4 bg-[#121215] border border-[#27272a] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#71717a] uppercase">[02 // SECTIONS]</p>
              <p className="text-xl font-bold text-[#fafafa] mt-1">{totalChunks}</p>
            </div>
            <Layers className="w-5 h-5 text-cyan-400/80" />
          </div>

          <div className="linear-card p-4 bg-[#121215] border border-[#27272a] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#71717a] uppercase">[03 // CITATIONS]</p>
              <p className="text-xs font-semibold text-cyan-400 mt-1">EXACT_LINE_BOUNDS</p>
            </div>
            <BookmarkCheck className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="linear-card p-4 bg-[#121215] border border-[#27272a] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#71717a] uppercase">[04 // ACCESS]</p>
              <p className="text-xs font-semibold text-emerald-400 mt-1">ISOLATED_RLS</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Action Header & Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight font-mono">REPOSITORY_REGISTRY</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-cyan-400">
                ACTIVE_INDEX
              </span>
            </div>
            <p className="text-xs text-[#71717a] mt-0.5 font-normal">
              Direct vector embeddings, paragraph citations, and concurrent multi-editor synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => {
                const newId = 'doc-' + Date.now().toString(36);
                navigate(`/doc/${newId}`);
              }}
              className="btn-linear-secondary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>NEW_NOTE</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-cyan text-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#041014]" />
              <span>INGEST_VOLUME</span>
            </button>
          </div>
        </div>

        {/* Document Grid (Linear Style Graphite Cards) */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
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
                  className="linear-card linear-card-interactive p-5 bg-[#121215] border border-[#27272a] flex flex-col justify-between group cursor-default"
                >
                  <div>
                    {/* Top document label & delete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center text-cyan-400 shrink-0">
                          <Binary className="w-3.5 h-3.5" />
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[9px] text-cyan-400 uppercase">
                          {doc.file_type?.includes('pdf') ? 'PDF_NODE' : 'MD_SPEC'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete volume"
                        className="p-1.5 rounded text-[#52525b] hover:text-rose-400 hover:bg-rose-950/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Document Title */}
                    <h3 className="text-sm font-semibold text-[#fafafa] font-sans line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {doc.title}
                    </h3>

                    {/* Document Excerpt Preview Snippet */}
                    <p className="mt-2 text-xs text-[#a1a1aa] leading-relaxed line-clamp-3 text-[12px] bg-[#09090b] p-3 rounded-md border border-[#1f1f23] italic font-sans">
                      "{previewSnippet}"
                    </p>

                    {/* Telemetry line */}
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-[#52525b]">
                      <span className="flex items-center gap-1 text-cyan-400/90">
                        <Layers className="w-3 h-3" />
                        <span>{doc.chunk_count || 0} NODES</span>
                      </span>
                      <span>&bull;</span>
                      <span>{((doc.file_size || 1024) / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3.5 mt-3.5 border-t border-[#1f1f23] flex items-center justify-between">
                    <span className="text-[10px] text-[#52525b]">
                      {new Date(doc.created_at || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/doc/${doc.id}`)}
                        title="Open Document & Notes"
                        className="btn-linear-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-[#71717a]" />
                        <span>OPEN</span>
                      </button>

                      <button
                        onClick={() => handleOpenChat(doc.id)}
                        className="btn-cyan text-xs py-1 px-2.5 flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3 text-[#041014]" />
                        <span>QUERY</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty Repository State */
          <div className="linear-card border-dashed border border-[#27272a] rounded-xl p-14 text-center bg-[#121215] space-y-3 font-mono">
            <div className="w-10 h-10 rounded-lg bg-[#18181b] border border-[#27272a] text-cyan-400 flex items-center justify-center mx-auto">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#fafafa] font-sans">REPOSITORY IS EMPTY</h3>
              <p className="text-xs text-[#71717a] max-w-sm mx-auto mt-1 leading-relaxed font-sans">
                {searchFilter
                  ? 'No indexed volumes matched the search query.'
                  : 'Ingest research manuscripts, PDF documents, or notes to initialize vector bounds.'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-cyan mt-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#041014]" />
              <span>INGEST FIRST VOLUME</span>
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
