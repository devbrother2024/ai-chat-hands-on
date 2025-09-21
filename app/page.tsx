'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
}

const STORAGE_KEY = 'chat:session:v1'

export default function Home() {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            return raw ? (JSON.parse(raw) as ChatMessage[]) : []
        } catch {
            return []
        }
    })
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const endRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
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
            const res = await fetch(
                `/api/chat/stream?q=${encodeURIComponent(prompt)}`,
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
                                next[next.length - 1] = {
                                    role: 'assistant',
                                    content: assistantBuffer
                                }
                                return next
                            })
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
        <div className="min-h-screen flex flex-col mx-auto max-w-3xl p-4 gap-4">
            <header className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">AI 채팅</h1>
                <div className="text-xs text-gray-500">
                    모델: gemini-2.0-flash-001
                </div>
            </header>

            <main className="flex-1 overflow-y-auto rounded-md border p-4 bg-white/50 dark:bg-black/20">
                {messages.length === 0 ? (
                    <div className="text-sm text-gray-500">
                        질문을 입력해 대화를 시작하세요.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((m, i) => (
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
                                            ? 'inline-block rounded-2xl px-4 py-2 bg-blue-600 text-white'
                                            : 'inline-block rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-800'
                                    }
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
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
                이 세션은 localStorage에 임시 저장됩니다. 공용 PC에서는 민감정보
                입력에 유의하세요.
            </p>
        </div>
    )
}
