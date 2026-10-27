import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Cpu, 
  Database,
  ArrowRight,
  FileCode,
  Sparkles
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
  const [currentStep, setCurrentStep] = useState(0); // 1: Read, 2: Chunk, 3: Embed, 4: Persist
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
        setStepMessage(`Reading "${title}"...`);
        setProgressPercent(20);
        textContent = await readFileAsText(selectedFile);
      } else {
        if (!pastedTitle.trim()) {
          throw new Error('Please provide a title for your document.');
        }
        if (!pastedText.trim()) {
          throw new Error('Please paste or write document content.');
        }
        title = pastedTitle.trim();
        textContent = pastedText.trim();
        fileSize = new Blob([textContent]).size;
        fileType = 'text/plain';
        setCurrentStep(1);
        setStepMessage('Preparing pasted text...');
        setProgressPercent(20);
      }

      // Step 2: Chunk Document
      setCurrentStep(2);
      setStepMessage('Splitting into overlapping contextual chunks...');
      setProgressPercent(40);
      await new Promise((r) => setTimeout(r, 200));

      const chunks = chunkDocumentText(textContent, {
        chunkSize,
        chunkOverlap,
        documentTitle: title,
      });

      if (chunks.length === 0) {
        throw new Error('Could not extract valid text chunks from this input.');
      }

      setStepMessage(`Generated ${chunks.length} chunks with ${chunkOverlap} char overlap.`);
      setProgressPercent(60);

      // Step 3: Generate Vector Embeddings
      setCurrentStep(3);
      setStepMessage(`Generating 1536d vector embeddings for ${chunks.length} chunks...`);
      setProgressPercent(75);

      const chunkDataWithVectors = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await createEmbedding(chunk.content);
        chunkDataWithVectors.push({
          ...chunk,
          embedding,
        });
        setProgressPercent(75 + Math.floor(((i + 1) / chunks.length) * 15));
      }

      // Step 4: Persist into Supabase / Local Workspace Store
      setCurrentStep(4);
      setStepMessage('Saving document & vector chunks to database...');
      setProgressPercent(95);

      const docId = crypto.randomUUID();
      const newDocRecord = {
        id: docId,
        user_id: user?.id || 'demo-user',
        title,
        file_path: activeTab === 'file' ? selectedFile.name : null,
        file_type: fileType,
        file_size: fileSize,
        status: 'ready',
        chunk_count: chunks.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && user) {
        // Insert into Supabase documents table
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
          // Insert chunks into document_chunks
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
      console.error('[DocMind Ingestion Error]', err);
      setErrorMsg(err.message || 'An unexpected error occurred during ingestion.');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#10121d] border border-slate-800/90 rounded-2xl shadow-2xl shadow-indigo-950/40 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#151726]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Ingest New Document</h2>
              <p className="text-xs text-slate-400">Parse, chunk, and index vectors for grounded Q&A</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isIngesting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {successDoc ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Document Ingested Successfully!</h3>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">"{successDoc.title}"</span> was split into{' '}
                <span className="text-indigo-300 font-mono font-medium">{successDoc.chunk_count} chunks</span> with
                1536-dimensional vector embeddings and indexed for semantic similarity search.
              </p>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={resetState}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  Upload Another Document
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  View in Dashboard
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
                <button
                  onClick={() => setActiveTab('file')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'file'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>File Upload</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  disabled={isIngesting}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'text'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
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
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-indigo-500/50 bg-indigo-950/20'
                      : 'border-slate-800 hover:border-indigo-500/40 bg-[#121420]/50 hover:bg-[#151726]/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.json,.csv,.js,.jsx,.ts,.py"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Plain text'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-200">
                        Drag and drop your document here, or <span className="text-indigo-400 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500">Supports .txt, .md, .csv, .json, markdown notes & manuals</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Direct Text Input */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Document Title</label>
                    <input
                      type="text"
                      disabled={isIngesting}
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="e.g. Q3 Financial Report or Architecture Guidelines"
                      className="w-full bg-[#121420] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Document Content</label>
                    <textarea
                      rows={6}
                      disabled={isIngesting}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste full text, policies, documentation, or technical guides here..."
                      className="w-full bg-[#121420] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Chunking Engine Parameters */}
              <div className="p-4 rounded-xl bg-[#121420]/70 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Chunking Strategy: Recursive Overlap</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Size: {chunkSize}c | Overlap: {chunkOverlap}c
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Chunk Size (chars)</span>
                      <span className="font-mono text-slate-300">{chunkSize}</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={2400}
                      step={100}
                      disabled={isIngesting}
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Chunk Overlap (chars)</span>
                      <span className="font-mono text-slate-300">{chunkOverlap}</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={500}
                      step={25}
                      disabled={isIngesting}
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Ingestion Progress State */}
              {isIngesting && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-indigo-300 font-medium">
                      <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                      <span>{stepMessage}</span>
                    </div>
                    <span className="text-indigo-400 font-mono">{progressPercent}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${progressPercent}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] text-slate-400 text-center">
                    <span className={currentStep >= 1 ? 'text-indigo-300 font-medium' : ''}>1. Read</span>
                    <span className={currentStep >= 2 ? 'text-indigo-300 font-medium' : ''}>2. Chunk</span>
                    <span className={currentStep >= 3 ? 'text-indigo-300 font-medium' : ''}>3. Embed</span>
                    <span className={currentStep >= 4 ? 'text-indigo-300 font-medium' : ''}>4. Index</span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isIngesting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartIngestion}
                  disabled={isIngesting || (activeTab === 'file' && !selectedFile) || (activeTab === 'text' && !pastedText)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isIngesting ? 'Ingesting...' : 'Index & Ingest'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
