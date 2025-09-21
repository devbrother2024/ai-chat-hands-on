import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

function sseEncode(data: unknown): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const prompt = url.searchParams.get('q')?.trim()
    const model = process.env.LLM_MODEL || 'gemini-2.0-flash-001'
    const apiKey = process.env.GEMINI_API_KEY

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                if (!apiKey) {
                    controller.enqueue(
                        sseEncode({
                            type: 'error',
                            code: 'NO_API_KEY',
                            message:
                                '서버에 GEMINI_API_KEY가 설정되지 않았습니다.'
                        })
                    )
                    controller.enqueue(sseEncode({ type: 'done' }))
                    controller.close()
                    return
                }

                if (!prompt) {
                    controller.enqueue(
                        sseEncode({
                            type: 'error',
                            code: 'NO_PROMPT',
                            message: '질문(q) 파라미터가 필요합니다.'
                        })
                    )
                    controller.enqueue(sseEncode({ type: 'done' }))
                    controller.close()
                    return
                }

                const ai = new GoogleGenAI({ apiKey })
                const response = await ai.models.generateContentStream({
                    model,
                    contents: prompt
                })

                for await (const chunk of response) {
                    const text = chunk.text ?? ''
                    if (text) {
                        controller.enqueue(
                            sseEncode({ type: 'text', delta: text })
                        )
                    }
                }

                controller.enqueue(sseEncode({ type: 'done' }))
                controller.close()
            } catch (err: unknown) {
                const status =
                    typeof err === 'object' && err && 'status' in err
                        ? (err as { status?: number }).status ?? 500
                        : 500
                let code = 'INTERNAL_ERROR'
                if (status === 401 || status === 403) code = 'UNAUTHORIZED'
                else if (status === 429) code = 'RATE_LIMIT'
                else if (status >= 500) code = 'UPSTREAM_ERROR'

                controller.enqueue(
                    sseEncode({
                        type: 'error',
                        code,
                        message:
                            typeof err === 'object' && err && 'message' in err
                                ? String((err as { message?: unknown }).message)
                                : '알 수 없는 오류가 발생했습니다.'
                    })
                )
                controller.enqueue(sseEncode({ type: 'done' }))
                controller.close()
            }
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    })
}
