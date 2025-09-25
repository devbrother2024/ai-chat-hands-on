-- 초기 스키마: 채팅 및 MCP 서버 관리 테이블

-- Chat Sessions 테이블 (채팅 세션 관리)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Chat Messages 테이블 (채팅 메시지 저장)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    function_calls JSONB,
    function_results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MCP Servers 테이블 (MCP 서버 설정 저장)
CREATE TABLE IF NOT EXISTS public.mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    transport TEXT NOT NULL CHECK (transport IN ('stdio', 'http', 'sse')),
    command TEXT,
    args JSONB,
    env JSONB,
    url TEXT,
    headers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_is_active ON public.mcp_servers(is_active);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

-- 기본 정책 생성 (현재는 모든 사용자가 접근 가능하도록 설정)
-- 추후 인증 시스템 도입 시 수정 필요
CREATE POLICY "Enable all access for chat_sessions" ON public.chat_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for chat_messages" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for mcp_servers" ON public.mcp_servers
    FOR ALL USING (true) WITH CHECK (true);

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성 (updated_at 자동 갱신)
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON public.chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON public.chat_messages 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mcp_servers_updated_at 
    BEFORE UPDATE ON public.mcp_servers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
