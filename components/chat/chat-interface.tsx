'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { FunctionCallResult } from './function-call-result'
import { Button } from '@/components/ui/button'
import { executeFunctionCalls } from '@/lib/utils/function-execution'
import {
    SupabaseChatStorage,
    convertDbChatMessage
} from '@/lib/supabase/chat-storage'
import type { ChatSession } from '@/lib/supabase/types'

type FunctionCall = {
    id?: string
    name?: string
    args?: Record<string, unknown>
}

type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
    functionCalls?: FunctionCall[]
    functionResults?: Record<
        string,
        {
            content?: Array<{
                type: string
                text?: string
                data?: string
                mimeType?: string
            }>
            isError?: boolean
        }
    >
}

interface ChatInterfaceProps {
    enabledMCPServers: string[]
}

export function ChatInterface({ enabledMCPServers }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(
        null
    )
    const abortRef = useRef<AbortController | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)
    const hasLoadedRef = useRef(false)

    const markdownComponents: Components = {
        code({ className, children, ...props }) {
            const codeText = String(children).replace(/\n$/, '')
            const isInline =
                !/(^|\s)language-[\w-]+/.test(className || '') &&
                !codeText.includes('\n')
            if (isInline) {
                return (
                    <code
                        className="rounded bg-gray-200 dark:bg-gray-700 px-1 py-0.5 text-[0.85em]"
                        {...props}
                    >
                        {children}
                    </code>
                )
            }
            return (
                <div className="relative group">
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(codeText)
                            } catch {}
                        }}
                        className="absolute top-2 right-2 rounded-md border px-2 py-1 text-xs bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition"
                    >
                        복사
                    </button>
                    <pre className="overflow-x-auto rounded-md bg-gray-950 text-gray-100 p-3 text-[0.9em]">
                        <code className={className}>{codeText}</code>
                    </pre>
                </div>
            )
        },
        a({ href, children, ...props }) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    {...props}
                >
                    {children}
                </a>
            )
        },
        table({ children }) {
            return (
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                        {children}
                    </table>
                </div>
            )
        }
    }

    // Supabase에서 현재 세션과 메시지 로드
    useEffect(() => {
        const loadChatData = async () => {
            try {
                // 현재 세션 가져오기 (가장 최근 세션)
                let session = await SupabaseChatStorage.getCurrentSession()

                // 세션이 없으면 새로 생성
                if (!session) {
                    session = await SupabaseChatStorage.createSession()
                }

                setCurrentSession(session)

                // 세션의 메시지 가져오기
                const dbMessages = await SupabaseChatStorage.getSessionMessages(
                    session.id
                )
                const convertedMessages = dbMessages.map(convertDbChatMessage)
                setMessages(convertedMessages)
            } catch (error) {
                console.error('채팅 데이터 로드 실패:', error)
            }
            hasLoadedRef.current = true
        }

        loadChatData()
    }, [])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const canSend = useMemo(
        () => input.trim().length > 0 && !loading,
        [input, loading]
    )

    async function handleSend(e?: React.FormEvent) {
        e?.preventDefault()
        if (!canSend || !currentSession) return

        const userMessage: ChatMessage = { role: 'user', content: input.trim() }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            // 사용자 메시지를 DB에 저장
            await SupabaseChatStorage.saveMessage(
                currentSession.id,
                userMessage
            )

            abortRef.current = new AbortController()

            // GET 방식으로 요청 (기존 API와 호환)
            const mcpParams =
                enabledMCPServers.length > 0
                    ? `&mcpServers=${enabledMCPServers.join(',')}`
                    : ''

            const response = await fetch(
                `/api/chat/stream?q=${encodeURIComponent(
                    input.trim()
                )}${mcpParams}`,
                {
                    method: 'GET',
                    headers: { Accept: 'text/event-stream' },
                    signal: abortRef.current.signal
                }
            )

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                )
            }

            if (!response.body) {
                throw new Error('Response body is empty')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            const currentAssistantMessage: ChatMessage = {
                role: 'assistant',
                content: '',
                functionCalls: [],
                functionResults: {}
            }

            setMessages(prev => [...prev, currentAssistantMessage])

            let assistantBuffer = ''
            let sseBuffer = ''

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value, { stream: true })
                    sseBuffer += chunk
                    const events = sseBuffer.split(/\n\n/)
                    // 보류 중인 마지막 토막은 버퍼에 남겨 다음 루프에서 이어붙인다
                    sseBuffer = events.pop() ?? ''

                    for (const line of events) {
                        const m = line.match(/^data: (.*)$/m)
                        if (!m) continue

                        try {
                            const evt = JSON.parse(m[1])

                            if (
                                evt.type === 'text' &&
                                typeof evt.delta === 'string'
                            ) {
                                assistantBuffer += evt.delta
                                currentAssistantMessage.content =
                                    assistantBuffer
                                setMessages(prev => [
                                    ...prev.slice(0, -1),
                                    { ...currentAssistantMessage }
                                ])
                            } else if (
                                evt.type === 'function_calls' &&
                                evt.calls
                            ) {
                                currentAssistantMessage.functionCalls =
                                    evt.calls
                                setMessages(prev => [
                                    ...prev.slice(0, -1),
                                    { ...currentAssistantMessage }
                                ])

                                // 함수 호출 실행
                                if (enabledMCPServers.length > 0) {
                                    try {
                                        const functionResults =
                                            await executeFunctionCalls(
                                                enabledMCPServers,
                                                evt.calls
                                            )
                                        currentAssistantMessage.functionResults =
                                            functionResults
                                        setMessages(prev => [
                                            ...prev.slice(0, -1),
                                            { ...currentAssistantMessage }
                                        ])
                                    } catch (funcError) {
                                        console.error(
                                            '함수 실행 오류:',
                                            funcError
                                        )
                                    }
                                }
                            } else if (
                                evt.type === 'mcp_info' &&
                                evt.enabledServers
                            ) {
                                console.log(
                                    '활성화된 MCP 서버:',
                                    evt.enabledServers
                                )
                            } else if (evt.type === 'error') {
                                throw new Error(evt.message || '오류')
                            }
                        } catch (parseError) {
                            console.error('SSE 파싱 오류:', parseError)
                        }
                    }
                }
            } finally {
                reader.releaseLock()
            }

            // 최종 어시스턴트 메시지를 DB에 저장
            await SupabaseChatStorage.saveMessage(
                currentSession.id,
                currentAssistantMessage
            )
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Request was aborted')
            } else {
                console.error('Stream error:', error)
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `오류가 발생했습니다: ${
                            error instanceof Error
                                ? error.message
                                : '알 수 없는 오류'
                        }`
                    }
                ])
            }
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }

    function handleStopGeneration() {
        if (abortRef.current) {
            abortRef.current.abort()
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-screen">
            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            message.role === 'user'
                                ? 'justify-end'
                                : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-3xl px-4 py-2 rounded-lg ${
                                message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                        >
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={markdownComponents}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                            {/* 함수 호출 결과 표시 */}
                            {message.functionCalls &&
                                message.functionResults && (
                                    <div className="mt-3 space-y-2">
                                        <FunctionCallResult
                                            functionCalls={
                                                message.functionCalls
                                            }
                                            results={message.functionResults}
                                        />
                                    </div>
                                )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="max-w-3xl px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    AI가 응답을 생성 중입니다...
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {/* 입력 영역 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSend} className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        disabled={loading}
                    />

                    {loading ? (
                        <Button
                            type="button"
                            onClick={handleStopGeneration}
                            variant="outline"
                            className="px-4 py-2"
                        >
                            중지
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            disabled={!canSend}
                            className="px-4 py-2"
                        >
                            전송
                        </Button>
                    )}
                </form>
            </div>
        </div>
    )
}
