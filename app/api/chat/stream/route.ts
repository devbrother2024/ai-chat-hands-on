import { GoogleGenAI, mcpToTool } from '@google/genai'
import {
    connectedClients,
    getConnectionStatus,
    validateAllConnections
} from '@/lib/mcp/connections'

export const runtime = 'nodejs'

function sseEncode(data: unknown): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const prompt = url.searchParams.get('q')?.trim()
    const enabledMCPServers =
        url.searchParams.get('mcpServers')?.split(',').filter(Boolean) || []
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

                // MCP 도구 준비
                const tools = []
                const enabledClients = []

                console.log(
                    `🔍 MCP 서버 활성화 요청: [${enabledMCPServers.join(', ')}]`
                )

                // 전역 연결 상태 확인 및 검증
                getConnectionStatus()
                const validConnections = await validateAllConnections()
                console.log(
                    `📊 현재 연결된 서버: [${Array.from(
                        connectedClients.keys()
                    ).join(', ')}]`
                )

                // 유효한 연결만 사용
                const validEnabledServers = enabledMCPServers.filter(id =>
                    validConnections.includes(id)
                )
                console.log(
                    `🎯 유효하고 활성화된 서버: [${validEnabledServers.join(
                        ', '
                    )}]`
                )

                for (const serverId of validEnabledServers) {
                    const connection = connectedClients.get(serverId)
                    if (connection) {
                        try {
                            tools.push(mcpToTool(connection.client))
                            enabledClients.push(serverId)
                            console.log(`✅ MCP 도구 변환 성공: ${serverId}`)
                        } catch (error) {
                            console.warn(
                                `❌ MCP 서버 ${serverId} 도구 변환 실패:`,
                                error
                            )
                        }
                    } else {
                        console.warn(`⚠️ MCP 서버 ${serverId}가 연결되지 않음`)
                    }
                }

                // 무효한 서버 요청에 대한 경고
                const invalidServers = enabledMCPServers.filter(
                    id => !validConnections.includes(id)
                )
                if (invalidServers.length > 0) {
                    console.warn(
                        `⚠️ 요청되었지만 연결되지 않은 서버: [${invalidServers.join(
                            ', '
                        )}]`
                    )
                }

                // 활성화된 MCP 서버 정보 전송
                if (enabledClients.length > 0) {
                    console.log(
                        `🚀 AI에 연결된 MCP 도구: ${
                            tools.length
                        }개 (서버: [${enabledClients.join(', ')}])`
                    )
                    controller.enqueue(
                        sseEncode({
                            type: 'mcp_info',
                            enabledServers: enabledClients
                        })
                    )
                } else {
                    console.log(`ℹ️ 활성화된 MCP 서버가 없음`)
                }

                const response = await ai.models.generateContentStream({
                    model,
                    contents: prompt,
                    config: tools.length > 0 ? { tools } : undefined
                })

                for await (const chunk of response) {
                    // 함수 호출 처리
                    if (chunk.functionCalls) {
                        console.log(
                            `🔧 AI가 함수 호출 요청: ${chunk.functionCalls.length}개`
                        )
                        chunk.functionCalls.forEach(
                            (
                                call: {
                                    name?: string
                                    args?: Record<string, unknown>
                                },
                                index: number
                            ) => {
                                console.log(
                                    `  ${index + 1}. ${
                                        call.name || '이름없음'
                                    }(${JSON.stringify(call.args || {})})`
                                )
                            }
                        )
                        controller.enqueue(
                            sseEncode({
                                type: 'function_calls',
                                calls: chunk.functionCalls
                            })
                        )
                    }

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
