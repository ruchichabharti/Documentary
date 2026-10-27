-- ==============================================================================
-- DocMind: Production Database Schema & pgvector Configuration
-- ==============================================================================

-- 1. Enable pgvector extension for high-performance semantic vector similarity
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents table (metadata, ingestion status, file references)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT DEFAULT 'text/plain',
    file_size BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Document chunks table (with 1536-dimensional vector embedding column)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding vector(1536), -- Dimension for OpenAI text-embedding-3-small
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Chat history table (grounded Q&A conversation memory with source citations)
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE, -- Nullable for global search
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_document_id ON public.chat_history(document_id);

-- HNSW Vector index on embeddings for sub-millisecond cosine similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Documents (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents" 
ON public.documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" 
ON public.documents FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" 
ON public.documents FOR DELETE 
USING (auth.uid() = user_id);

-- 8. RLS Policies: Document Chunks
DROP POLICY IF EXISTS "Users can view their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can view their own document chunks" 
ON public.document_chunks FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can insert their own document chunks" 
ON public.document_chunks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can delete their own document chunks" 
ON public.document_chunks FOR DELETE 
USING (auth.uid() = user_id);

-- 9. RLS Policies: Chat History
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat_history;
CREATE POLICY "Users can view their own chats" 
ON public.chat_history FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chat_history;
CREATE POLICY "Users can insert their own chats" 
ON public.chat_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chat_history;
CREATE POLICY "Users can delete their own chats" 
ON public.chat_history FOR DELETE 
USING (auth.uid() = user_id);

-- 10. Vector Similarity Search RPC Function
-- SECURITY INVOKER ensures that RLS is respected when this function is called
CREATE OR REPLACE FUNCTION match_document_chunks (
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.2,
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
SECURITY INVOKER
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
        AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 11. Storage Bucket Configuration (Run in SQL or create via Storage dashboard)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can only upload, read, and delete their own files
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
