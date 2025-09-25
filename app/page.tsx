'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { MCPManager } from '@/components/mcp/mcp-manager'
import { MCPProvider } from '@/lib/contexts/mcp-context'
import { MCPToolsPanel } from '@/components/chat/mcp-tools-panel'
import { FunctionCallResult } from '@/components/chat/function-call-result'
import { MCPDebugInfo } from '@/components/chat/mcp-debug-info'
import { Button } from '@/components/ui/button'
import { MessageSquare, Settings } from 'lucide-react'
import { executeFunctionCalls } from '@/lib/utils/function-execution'

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

const STORAGE_KEY = 'chat:session:v1'

export default function Home() {
    const [currentTab, setCurrentTab] = useState<'chat' | 'mcp'>('chat')
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
                    href={href as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                    {...props}
                >
                    {children}
                </a>
            )
        },
        table({ children }) {
            return (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        {children}
                    </table>
                </div>
            )
        }
    }
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [enabledMCPServers, setEnabledMCPServers] = useState<string[]>([])
    const abortRef = useRef<AbortController | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)
    const hasLoadedRef = useRef(false)

    // Load persisted messages only on client after mount to avoid SSR mismatch
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) setMessages(JSON.parse(raw) as ChatMessage[])
        } catch {}
        hasLoadedRef.current = true
    }, [])

    // Persist messages after initial load is done
    useEffect(() => {
        if (!hasLoadedRef.current) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
        } catch {}
    }, [messages])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const canSend = useMemo(
        () => input.trim().length > 0 && !loading,
        [input, loading]
    )

    const handleToggleMCPServer = (serverId: string, enabled: boolean) => {
        setEnabledMCPServers(prev => {
            if (enabled) {
                return prev.includes(serverId) ? prev : [...prev, serverId]
            } else {
                return prev.filter(id => id !== serverId)
            }
        })
    }

    async function handleSend(e?: React.FormEvent) {
        e?.preventDefault()
        const prompt = input.trim()
        if (!prompt || loading) return

        setInput('')
        setLoading(true)
        const controller = new AbortController()
        abortRef.current = controller

        const userMsg: ChatMessage = { role: 'user', content: prompt }
        const aiMsg: ChatMessage = { role: 'assistant', content: '' }
        setMessages(prev => [...prev, userMsg, aiMsg])

        try {
            const mcpParams =
                enabledMCPServers.length > 0
                    ? `&mcpServers=${enabledMCPServers.join(',')}`
                    : ''

            const res = await fetch(
                `/api/chat/stream?q=${encodeURIComponent(prompt)}${mcpParams}`,
                {
                    method: 'GET',
                    headers: { Accept: 'text/event-stream' },
                    signal: controller.signal
                }
            )
            if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let assistantBuffer = ''
            let sseBuffer = ''

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
                            setMessages(prev => {
                                const next = [...prev]
                                const lastMsg = next[next.length - 1]
                                next[next.length - 1] = {
                                    ...lastMsg,
                                    content: assistantBuffer
                                }
                                return next
                            })
                        } else if (evt.type === 'function_calls' && evt.calls) {
                            setMessages(prev => {
                                const next = [...prev]
                                const lastMsg = next[next.length - 1]
                                next[next.length - 1] = {
                                    ...lastMsg,
                                    functionCalls: evt.calls
                                }
                                return next
                            })

                            // 함수 호출 실행
                            if (enabledMCPServers.length > 0) {
                                executeFunctionCalls(
                                    enabledMCPServers,
                                    evt.calls
                                )
                                    .then(results => {
                                        setMessages(prev => {
                                            const next = [...prev]
                                            const lastMsg =
                                                next[next.length - 1]
                                            next[next.length - 1] = {
                                                ...lastMsg,
                                                functionResults: results
                                            }
                                            return next
                                        })
                                    })
                                    .catch(error => {
                                        console.error('함수 실행 오류:', error)
                                    })
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
                    } catch {}
                }
            }
        } catch (error) {
            setMessages(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                    role: 'assistant',
                    content:
                        (last?.content || '') +
                        `\n\n[에러] ${
                            error instanceof Error
                                ? error.message
                                : '요청 중 오류가 발생했습니다.'
                        }`
                }
                return next
            })
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }

    function handleStop() {
        abortRef.current?.abort()
        setLoading(false)
    }

    return (
        <MCPProvider>
            <div className="min-h-screen flex flex-col mx-auto max-w-6xl p-4 gap-4">
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">
                        AI 채팅 애플리케이션
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={
                                    currentTab === 'chat'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => setCurrentTab('chat')}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                채팅
                            </Button>
                            <Button
                                variant={
                                    currentTab === 'mcp' ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => setCurrentTab('mcp')}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                MCP 서버 관리
                            </Button>
                        </div>
                        {currentTab === 'chat' && (
                            <div className="text-xs text-gray-500">
                                모델: gemini-2.0-flash-001
                            </div>
                        )}
                    </div>
                </header>

                {currentTab === 'chat' ? (
                    <>
                        <MCPToolsPanel
                            enabledServers={enabledMCPServers}
                            onToggleServer={handleToggleMCPServer}
                        />

                        <MCPDebugInfo
                            enabledServers={enabledMCPServers}
                            className="mb-4"
                        />

                        <main className="flex-1 overflow-y-auto rounded-md border p-4 bg-white/50 dark:bg-black/20">
                            {messages.length === 0 ? (
                                <div className="text-sm text-gray-500">
                                    질문을 입력해 대화를 시작하세요.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((m, i) => {
                                        const isLastAssistant =
                                            m.role === 'assistant' &&
                                            i === messages.length - 1 &&
                                            loading
                                        return (
                                            <div
                                                key={i}
                                                className={
                                                    m.role === 'user'
                                                        ? 'text-right'
                                                        : 'text-left'
                                                }
                                            >
                                                <div
                                                    className={
                                                        m.role === 'user'
                                                            ? 'inline-block rounded-2xl px-4 py-2 bg-blue-600 text-white whitespace-pre-wrap break-words'
                                                            : 'inline-block rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-full'
                                                    }
                                                    style={{
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {m.role === 'assistant' ? (
                                                        <div className="markdown-body leading-relaxed text-sm">
                                                            {m.functionCalls && (
                                                                <FunctionCallResult
                                                                    functionCalls={
                                                                        m.functionCalls
                                                                    }
                                                                    results={
                                                                        m.functionResults
                                                                    }
                                                                    loading={
                                                                        isLastAssistant &&
                                                                        !m.content
                                                                    }
                                                                />
                                                            )}
                                                            <ReactMarkdown
                                                                remarkPlugins={[
                                                                    remarkGfm
                                                                ]}
                                                                rehypePlugins={[
                                                                    rehypeHighlight
                                                                ]}
                                                                components={
                                                                    markdownComponents
                                                                }
                                                            >
                                                                {m.content}
                                                            </ReactMarkdown>
                                                            {isLastAssistant && (
                                                                <span className="inline-block w-2 align-baseline animate-pulse">
                                                                    ▍
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        m.content
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={endRef} />
                                </div>
                            )}
                        </main>

                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="메시지를 입력하세요..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={loading}
                            />
                            {loading ? (
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="px-4 py-2 rounded-md bg-red-600 text-white"
                                >
                                    중지
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!canSend}
                                    className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
                                >
                                    전송
                                </button>
                            )}
                        </form>
                        <p className="text-xs text-gray-500">
                            이 세션은 localStorage에 임시 저장됩니다. 공용
                            PC에서는 민감정보 입력에 유의하세요.
                        </p>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <MCPManager />
                    </div>
                )}
            </div>
        </MCPProvider>
    )
}
