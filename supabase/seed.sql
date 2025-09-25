-- Seed 데이터: 초기 데이터 및 테스트용 데이터

-- 샘플 MCP 서버 설정들
INSERT INTO public.mcp_servers (id, name, description, transport, command, args, url, headers, is_active) VALUES
(
    'weather-mcp',
    'Weather MCP Server',
    '날씨 정보를 제공하는 MCP 서버입니다.',
    'stdio',
    'npx',
    '["@philschmid/weather-mcp"]'::jsonb,
    null,
    null,
    false
),
(
    'file-system-mcp',
    'File System MCP',
    '파일 시스템 작업을 수행하는 MCP 서버입니다.',
    'stdio',
    'npx',
    '["@modelcontextprotocol/server-filesystem", "/tmp"]'::jsonb,
    null,
    null,
    false
),
(
    'supabase-mcp-server',
    'Supabase MCP Server',
    'Supabase 데이터베이스와 연동하는 MCP 서버입니다.',
    'sse',
    null,
    null,
    'http://localhost:3001/sse',
    null,
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    transport = EXCLUDED.transport,
    command = EXCLUDED.command,
    args = EXCLUDED.args,
    url = EXCLUDED.url,
    headers = EXCLUDED.headers,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 샘플 채팅 세션 생성
INSERT INTO public.chat_sessions (id, title) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    '첫 번째 채팅 세션'
),
(
    '550e8400-e29b-41d4-a716-446655440001', 
    'MCP 서버 테스트'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = NOW();

-- 샘플 채팅 메시지들
INSERT INTO public.chat_messages (session_id, role, content) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    'user',
    '안녕하세요! Supabase MCP 서버 테스트입니다.'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'assistant',
    '안녕하세요! Supabase와 MCP 서버가 성공적으로 연동되었습니다. 무엇을 도와드릴까요?'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'user',
    'MCP 서버 목록을 보여주세요.'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'assistant',
    '현재 등록된 MCP 서버들입니다:\n\n1. Weather MCP Server - 날씨 정보 제공\n2. File System MCP - 파일 시스템 작업\n3. Supabase MCP Server - 데이터베이스 연동\n\n각 서버를 활성화하여 사용할 수 있습니다.'
);

-- 샘플 함수 호출 데이터가 포함된 메시지
INSERT INTO public.chat_messages (session_id, role, content) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'user',
    '오늘 서울 날씨를 알려주세요.'
);

INSERT INTO public.chat_messages (session_id, role, content, function_calls, function_results) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'assistant',
    '서울의 오늘 날씨를 조회했습니다.',
    '[{"name": "get_weather", "args": {"location": "Seoul", "date": "today"}}]'::jsonb,
    '{"get_weather": {"content": [{"type": "text", "text": "서울 현재 날씨: 맑음, 기온 22°C, 습도 60%"}], "isError": false}}'::jsonb
);
