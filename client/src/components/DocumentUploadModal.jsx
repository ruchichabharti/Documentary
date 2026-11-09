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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload to Studio</h2>
              <p className="text-xs text-slate-500 font-normal">Index research papers and reports for grounded citations</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isIngesting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {successDoc ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Added to Studio</h3>
              <p className="text-xs text-slate-600 leading-relaxed text-[14px]">
                <span className="font-semibold text-slate-900">"{successDoc.title}"</span> is ready with{' '}
                <span className="text-blue-600 font-mono font-semibold">{successDoc.chunk_count} searchable sections</span>.
              </p>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={resetState}
                  className="btn-modern-secondary text-xs"
                >
                  Upload Another File
                </button>
                <button
                  onClick={handleClose}
                  className="btn-cobalt text-xs py-2 px-4"
                >
                  View in Studio
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setActiveTab('file')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'file'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>File Upload</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'text'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Paste Text</span>
                </button>
              </div>

              {/* Tab 1: File Dropzone */}
              {activeTab === 'file' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => !isIngesting && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-blue-500/60 bg-slate-50/60 hover:bg-slate-50'
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
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drag and drop your file here, or <span className="text-blue-600 underline">browse files</span>
                      </p>
                      <p className="text-xs text-slate-400">Supports PDF (.pdf), .txt, .md, research reports, and notes</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Direct Text Input */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
                    <input
                      type="text"
                      disabled={isIngesting}
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="e.g. Chapter Summary or Working Notes"
                      className="input-modern text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Document Content</label>
                    <textarea
                      rows={6}
                      disabled={isIngesting}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste text, articles, or reference notes here…"
                      className="input-modern text-xs resize-none leading-relaxed font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Progress State */}
              {isIngesting && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <div className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      <span>{stepMessage}</span>
                    </div>
                    <span className="text-slate-500 font-mono">{progressPercent}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      style={{ width: `${progressPercent}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isIngesting}
                  className="btn-modern-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartIngestion}
                  disabled={isIngesting || (activeTab === 'file' && !selectedFile) || (activeTab === 'text' && !pastedText)}
                  className="btn-cobalt text-xs py-2 px-4"
                >
                  <span>{isIngesting ? 'Adding…' : 'Add to Studio'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
