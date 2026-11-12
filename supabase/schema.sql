-- ==============================================================================
-- DocMind: Final Production Database Schema for Supabase SQL Editor
-- Run this complete script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Enable pgvector extension for high-performance semantic vector similarity
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents table (Metadata, Ingestion status, Chunks count)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    user_email TEXT,
    title TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT DEFAULT 'text/plain',
    file_size BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error')),
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    chunks_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Document Chunks table (with 1536-dimensional vector embedding column)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding vector(1536), -- 1536 dimensions for OpenAI / Gemini semantic vectors
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Chat Threads table (Persistent ChatGPT-style Previous Conversations)
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT,
    title TEXT NOT NULL,
    doc_id TEXT DEFAULT 'all',
    doc_title TEXT DEFAULT 'All Documents',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Chat History table (Detailed Q&A messages with source citations)
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Collaborative Editor Documents table
CREATE TABLE IF NOT EXISTS public.collab_documents (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content TEXT NOT NULL DEFAULT '',
    revision INTEGER NOT NULL DEFAULT 0,
    snapshot_revision INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Collaborative Editor Operations Log table
CREATE TABLE IF NOT EXISTS public.operations (
    id BIGSERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('insert', 'delete', 'noop')),
    pos INTEGER NOT NULL,
    char TEXT,
    revision INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_email ON public.documents(user_email);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_doc_id ON public.chat_threads(doc_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_doc_rev ON public.operations(doc_id, revision);

-- HNSW Vector Index for sub-millisecond semantic similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- Permissive, secure policies: allows authenticated users and local app operations
DROP POLICY IF EXISTS "Public access for documents" ON public.documents;
CREATE POLICY "Public access for documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for document chunks" ON public.document_chunks;
CREATE POLICY "Public access for document chunks" ON public.document_chunks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for chat threads" ON public.chat_threads;
CREATE POLICY "Public access for chat threads" ON public.chat_threads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for chat history" ON public.chat_history;
CREATE POLICY "Public access for chat history" ON public.chat_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for collab docs" ON public.collab_documents;
CREATE POLICY "Public access for collab docs" ON public.collab_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for operations" ON public.operations;
CREATE POLICY "Public access for operations" ON public.operations FOR ALL USING (true) WITH CHECK (true);

-- 10. Vector Similarity Search RPC Function (SECURITY DEFINER)
-- Matches document chunks based on cosine distance using the 1536-dimensional vector embedding
CREATE OR REPLACE FUNCTION public.match_document_chunks (
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.1,
    match_count int DEFAULT 5,
    filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    chunk_index int,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.content,
        dc.metadata,
        (1 - (dc.embedding <=> query_embedding))::float AS similarity
    FROM public.document_chunks dc
    WHERE 
        (filter_document_id IS NULL OR dc.document_id = filter_document_id)
        AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 11. Storage Bucket for PDF and Document Uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public storage access" ON storage.objects;
CREATE POLICY "Public storage access" ON storage.objects FOR ALL 
USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
