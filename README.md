# AI 채팅 애플리케이션 (MCP 통합)

Google Gemini API와 Model Context Protocol (MCP)를 연동한 AI 채팅 애플리케이션입니다.

## 주요 기능

-   🤖 **Gemini API 연동**: Google의 Gemini 2.0 Flash 모델을 사용한 AI 채팅
-   🔧 **MCP 도구 연동**: Model Context Protocol을 통한 외부 도구 사용
-   💬 **실시간 스트리밍**: Server-Sent Events를 이용한 실시간 응답
-   🛠️ **함수 호출**: AI가 MCP 서버의 도구를 자동으로 호출
-   📱 **반응형 UI**: 모바일과 데스크톱 모두 지원
-   🌙 **다크 모드**: 라이트/다크 테마 자동 전환

## 기술 스택

-   **프레임워크**: Next.js 15 (App Router)
-   **UI**: Tailwind CSS + shadcn/ui
-   **AI**: Google Gemini API (@google/genai)
-   **MCP**: Model Context Protocol SDK
-   **언어**: TypeScript
-   **패키지 매니저**: pnpm

## 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-2.0-flash-001
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## MCP 서버 연동 방법

### 1. MCP 서버 관리

애플리케이션 상단의 "MCP 서버 관리" 탭에서 MCP 서버를 추가하고 관리할 수 있습니다.

### 2. 지원하는 MCP 전송 방식

-   **STDIO**: 로컬 명령어 실행 (예: `npx -y @philschmid/weather-mcp`)
-   **SSE**: Server-Sent Events 기반 웹 서버 연결
-   **HTTP**: Streamable HTTP 연결 (SSE 자동 폴백 지원)

### 3. MCP 도구 활성화

채팅 화면에서 MCP 도구 패널을 통해 연결된 서버의 도구를 활성화/비활성화할 수 있습니다.

### 4. 함수 호출 과정

1. 사용자가 질문을 입력
2. AI가 필요한 경우 MCP 도구를 자동으로 호출
3. 도구 실행 결과를 기반으로 최종 답변 생성

## 예시 MCP 서버

```bash
# 날씨 정보 MCP 서버
npx -y @philschmid/weather-mcp

# 파일 시스템 MCP 서버
npx -y @modelcontextprotocol/server-filesystem
```

## 프로젝트 구조

```plaintext
ai-chat-hands-on/
├── app/
│   ├── api/
│   │   ├── chat/stream/          # 스트리밍 API
│   │   ├── chat/execute-function/ # 함수 실행 API
│   │   └── mcp/                  # MCP API Routes
│   │       ├── connect/          # 서버 연결
│   │       ├── disconnect/       # 서버 연결 해제
│   │       ├── tool/             # 도구 호출
│   │       ├── prompt/           # 프롬프트 실행
│   │       ├── resource/         # 리소스 읽기
│   │       └── status/           # 연결 상태 확인
│   └── page.tsx                  # 메인 페이지
├── components/
│   ├── chat/                     # 채팅 관련 컴포넌트
│   ├── mcp/                      # MCP 관리 컴포넌트
│   └── ui/                       # 공통 UI 컴포넌트
├── lib/
│   ├── actions/                  # MCP 서버 로직 (Server Actions에서 변경됨)
│   ├── contexts/                 # React 컨텍스트
│   ├── mcp/                      # MCP 클라이언트 (API Routes 기반)
│   ├── types/                    # 타입 정의
│   └── utils/                    # 유틸리티 함수
```

## 개발 가이드

### 코드 품질 확인

```bash
pnpm typecheck  # TypeScript 타입 체크
pnpm lint       # ESLint 검사
pnpm format     # Prettier 포맷팅
```

### 테스트 실행

```bash
pnpm test
```

## 배포

Vercel을 사용한 배포를 권장합니다:

1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 import
3. 환경 변수 설정 (`GEMINI_API_KEY`)
4. 자동 배포 완료

## 라이선스

MIT 라이선스로 제공됩니다.
