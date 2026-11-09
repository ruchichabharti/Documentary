import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  FileCode,
  BookOpen
} from 'lucide-react';
import { chunkDocumentText, readFileAsText } from '../lib/chunker.js';
import { createEmbedding } from '../lib/rag.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DocumentUploadModal({ isOpen, onClose, onDocumentAdded }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  // Ingestion lifecycle state
  const [isIngesting, setIsIngesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successDoc, setSuccessDoc] = useState(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFile(null);
    setPastedTitle('');
    setPastedText('');
    setIsIngesting(false);
    setCurrentStep(0);
    setStepMessage('');
    setProgressPercent(0);
    setErrorMsg('');
    setSuccessDoc(null);
  };

  const handleClose = () => {
    if (isIngesting) return;
    resetState();
    onClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg('');
    }
  };

  const handleStartIngestion = async () => {
    setErrorMsg('');
    setIsIngesting(true);
    setProgressPercent(10);

    try {
      let title = '';
      let textContent = '';
      let fileSize = 0;
      let fileType = 'text/plain';

      if (activeTab === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload.');
        }
        title = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type || 'text/plain';

        setCurrentStep(1);
        setStepMessage(`Reading "${title}"…`);
        setProgressPercent(20);
        textContent = await readFileAsText(selectedFile);
      } else {
        if (!pastedTitle.trim()) {
          throw new Error('Please provide a title for your document.');
        }
        if (!pastedText.trim()) {
          throw new Error('Please paste document content.');
        }
        title = pastedTitle.trim();
        textContent = pastedText.trim();
        fileSize = new Blob([textContent]).size;
        fileType = 'text/plain';
        setCurrentStep(1);
        setStepMessage('Preparing text content…');
        setProgressPercent(20);
      }

      const docId = crypto.randomUUID();

      // Step 2: Split text into sections
      setCurrentStep(2);
      setStepMessage('Extracting readable sections…');
      setProgressPercent(40);
      await new Promise((r) => setTimeout(r, 200));

      const chunks = chunkDocumentText(textContent, {
        chunkSize,
        chunkOverlap,
        documentId: docId,
        documentTitle: title,
      });

      if (chunks.length === 0) {
        throw new Error('Could not extract valid text content from this file.');
      }

      setStepMessage(`Prepared ${chunks.length} sections.`);
      setProgressPercent(60);

      // Step 3: Index vectors for search
      setCurrentStep(3);
      setStepMessage(`Indexing ${chunks.length} sections for fast search…`);
      setProgressPercent(75);

      const chunkDataWithVectors = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await createEmbedding(chunk.content);
        chunkDataWithVectors.push({
          ...chunk,
          documentId: docId,
          document_id: docId,
          metadata: {
            ...chunk.metadata,
            documentId: docId,
            documentTitle: title,
          },
          embedding,
        });
        setProgressPercent(75 + Math.floor(((i + 1) / chunks.length) * 15));
      }

      // Step 4: Save to database & workspace
      setCurrentStep(4);
      setStepMessage('Saving to your library vault…');
      setProgressPercent(95);

      const newDocRecord = {
        id: docId,
        user_id: user?.id || 'demo-user',
        user_email: (user?.email || '').toLowerCase(),
        title,
        file_path: activeTab === 'file' ? selectedFile.name : null,
        file_type: fileType,
        file_size: fileSize,
        status: 'ready',
        chunk_count: chunks.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isRealAuthUser = Boolean(
        isSupabaseConfigured &&
        user?.id &&
        !user.id.startsWith('demo-guest') &&
        user.app_metadata?.provider !== 'guest'
      );

      if (isRealAuthUser) {
        const { error: docError } = await supabase.from('documents').insert({
          id: docId,
          user_id: user.id,
          title: newDocRecord.title,
          file_path: newDocRecord.file_path,
          file_type: newDocRecord.file_type,
          file_size: newDocRecord.file_size,
          status: 'ready',
          chunk_count: chunks.length,
        });

        if (docError) {
          console.warn('[DocMind] Could not insert to Supabase documents table:', docError.message);
        } else {
          const chunkInserts = chunkDataWithVectors.map((c) => ({
            document_id: docId,
            user_id: user.id,
            chunk_index: c.chunkIndex,
            content: c.content,
            token_count: c.tokenCount,
            embedding: c.embedding,
            metadata: { ...c.metadata, documentId: docId },
          }));

          const { error: chunkError } = await supabase.from('document_chunks').insert(chunkInserts);
          if (chunkError) {
            console.warn('[DocMind] Could not insert document chunks:', chunkError.message);
          }
        }
      }

      setProgressPercent(100);
      setSuccessDoc({
        ...newDocRecord,
        chunks: chunkDataWithVectors,
      });

      onDocumentAdded?.({
        ...newDocRecord,
        chunks: chunkDataWithVectors,
      });
    } catch (err) {
      console.error('[DocMind Upload Error]', err);
      setErrorMsg(err.message || 'An error occurred during file upload.');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-xl bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between bg-[#0d0d10]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#18181b] border border-[#27272a] text-cyan-400 flex items-center justify-center text-xs font-bold">
              &gt;_
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#fafafa] font-sans">INGEST // REPOSITORY_NODE</h2>
              <p className="text-[11px] text-[#71717a]">Chunking, embedding generation &amp; pgvector indexing</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isIngesting}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 font-mono">
          {successDoc ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-lg bg-[#09090b] border border-[#27272a] text-center space-y-2.5"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-950/40 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#fafafa] font-sans">INGESTION COMPLETE</h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed font-sans">
                <span className="font-semibold text-[#fafafa]">"{successDoc.title}"</span> is indexed with{' '}
                <span className="text-cyan-400 font-mono font-semibold">{successDoc.chunk_count} vector nodes</span>.
              </p>

              <div className="pt-2 flex justify-center gap-2.5">
                <button
                  onClick={resetState}
                  className="btn-linear-secondary text-xs"
                >
                  INGEST ANOTHER
                </button>
                <button
                  onClick={handleClose}
                  className="btn-cyan text-xs py-1.5 px-3.5"
                >
                  VIEW IN REGISTRY
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-md bg-[#09090b] p-1 border border-[#27272a]">
                <button
                  onClick={() => setActiveTab('file')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-mono transition-all ${
                    activeTab === 'file'
                      ? 'bg-[#18181b] text-cyan-400 border border-[#27272a] font-semibold'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>FILE_UPLOAD</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-mono transition-all ${
                    activeTab === 'text'
                      ? 'bg-[#18181b] text-cyan-400 border border-[#27272a] font-semibold'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>RAW_PAYLOAD</span>
                </button>
              </div>

              {/* Tab 1: File Dropzone */}
              {activeTab === 'file' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => !isIngesting && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-cyan-500/50 bg-cyan-950/20'
                      : 'border-[#27272a] hover:border-cyan-500/40 bg-[#09090b] hover:bg-[#0f0f12]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.py"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-cyan-950/40 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left font-mono">
                        <p className="text-xs font-semibold text-[#fafafa]">{selectedFile.name}</p>
                        <p className="text-[11px] text-cyan-400/80">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'DOCUMENT'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-md bg-[#18181b] border border-[#27272a] text-cyan-400 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-mono text-[#a1a1aa]">
                        DRAG &amp; DROP TARGET FILE OR <span className="text-cyan-400 underline">BROWSE</span>
                      </p>
                      <p className="text-[10px] text-[#52525b] font-mono">PDF, Markdown (.md), plain text (.txt), code</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Direct Text Input */}
              {activeTab === 'text' && (
                <div className="space-y-3 font-mono">
                  <div>
                    <label className="block text-[11px] text-[#71717a] mb-1">// VOLUME IDENTIFIER</label>
                    <input
                      type="text"
                      disabled={isIngesting}
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="e.g. section_summary_01.md"
                      className="input-linear text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#71717a] mb-1">// BUFFER CONTENT</label>
                    <textarea
                      rows={6}
                      disabled={isIngesting}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste text buffer payload here…"
                      className="input-linear text-xs resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Progress State */}
              {isIngesting && (
                <div className="p-3.5 rounded-md bg-[#09090b] border border-[#27272a] space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <span>{stepMessage}</span>
                    </div>
                    <span className="text-[#71717a]">{progressPercent}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      style={{ width: `${progressPercent}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-md bg-rose-950/30 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-1 font-mono">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isIngesting}
                  className="btn-linear-secondary text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleStartIngestion}
                  disabled={isIngesting || (activeTab === 'file' && !selectedFile) || (activeTab === 'text' && !pastedText)}
                  className="btn-cyan text-xs py-1.5 px-3.5"
                >
                  <span>{isIngesting ? 'INGESTING…' : 'INITIALIZE INGESTION'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
