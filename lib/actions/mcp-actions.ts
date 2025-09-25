'use server'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
    MCPServerConfig,
    ConnectedMCPServer,
    MCPToolCall,
    MCPToolResult,
    MCPTool,
    MCPPrompt,
    MCPResource
} from '@/lib/types/mcp'
import { connectedClients, getConnectionStatus } from '@/lib/mcp/connections'

export async function connectToMCPServer(
    config: MCPServerConfig
): Promise<ConnectedMCPServer> {
    try {
        // 이미 연결된 클라이언트가 있다면 해제
        await disconnectFromMCPServer(config.id)

        const client = new Client(
            {
                name: 'ai-chat-server',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    prompts: {},
                    resources: {
                        subscribe: true,
                        listChanged: true
                    }
                }
            }
        )

        let transport: Transport

        switch (config.transport) {
            case 'stdio':
                if (!config.command) {
                    throw new Error('STDIO 전송 방식에는 command가 필요합니다')
                }
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: config.env || {}
                })
                break

            case 'sse':
                if (!config.url) {
                    throw new Error('SSE 전송 방식에는 URL이 필요합니다')
                }
                transport = new SSEClientTransport(new URL(config.url))
                break

            case 'http':
                if (!config.url) {
                    throw new Error('HTTP 전송 방식에는 URL이 필요합니다')
                }

                const baseUrl = new URL(config.url)

                // StreamableHTTP 방식 먼저 시도
                transport = new StreamableHTTPClientTransport(baseUrl)
                console.log('StreamableHTTP 전송 방식으로 연결 시도 중...')
                break

            default:
                throw new Error(`지원되지 않는 전송 방식: ${config.transport}`)
        }

        try {
            await client.connect(transport)
            console.log(`✅ MCP 서버 연결 성공: ${config.name} (${config.id})`)
        } catch (error) {
            // HTTP 연결 실패 시 SSE로 폴백 시도
            if (config.transport === 'http' && config.url) {
                console.log(
                    'StreamableHTTP 연결 실패, SSE 전송 방식으로 폴백 중...',
                    error
                )

                // 기존 transport 정리
                try {
                    await transport.close()
                } catch {
                    // 정리 중 오류는 무시
                }

                // SSE transport로 재시도
                transport = new SSEClientTransport(new URL(config.url))
                await client.connect(transport)
                console.log(
                    `✅ MCP 서버 SSE 폴백 연결 성공: ${config.name} (${config.id})`
                )
            } else {
                throw error
            }
        }

        // 클라이언트와 전송 객체를 전역 저장소에 저장
        connectedClients.set(config.id, { client, transport })
        console.log(
            `📝 연결된 MCP 서버 목록: [${Array.from(
                connectedClients.keys()
            ).join(', ')}]`
        )

        // 전역 연결 상태 확인
        getConnectionStatus()

        // 서버 정보 및 기능 조회
        const [toolsResult, promptsResult, resourcesResult] =
            await Promise.allSettled([
                client.listTools(),
                client.listPrompts(),
                client.listResources()
            ])

        const tools =
            toolsResult.status === 'fulfilled'
                ? (toolsResult.value.tools as MCPTool[]) || []
                : []
        const prompts =
            promptsResult.status === 'fulfilled'
                ? (promptsResult.value.prompts as MCPPrompt[]) || []
                : []
        const resources =
            resourcesResult.status === 'fulfilled'
                ? (resourcesResult.value.resources as MCPResource[]) || []
                : []

        console.log(
            `🔧 ${config.name} 도구 목록 (${tools.length}개):`,
            tools.map(t => t.name)
        )
        console.log(
            `📋 ${config.name} 프롬프트 목록 (${prompts.length}개):`,
            prompts.map(p => p.name)
        )
        console.log(
            `📦 ${config.name} 리소스 목록 (${resources.length}개):`,
            resources.map(r => r.name || r.uri)
        )

        return {
            config,
            info: {
                name: 'MCP Server',
                version: '1.0.0',
                capabilities: {}
            },
            tools,
            prompts,
            resources,
            isConnected: true
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : '알 수 없는 오류가 발생했습니다'

        console.error(`❌ MCP 서버 연결 실패: ${config.name} (${config.id})`)
        console.error(`오류 내용:`, error)

        return {
            config,
            info: {
                name: 'Unknown',
                version: 'Unknown',
                capabilities: {}
            },
            tools: [],
            prompts: [],
            resources: [],
            isConnected: false,
            lastError: errorMessage
        }
    }
}

export async function disconnectFromMCPServer(serverId: string): Promise<void> {
    const connection = connectedClients.get(serverId)

    if (connection) {
        try {
            await connection.client.close()
            await connection.transport.close()
            console.log(`🔌 MCP 서버 연결 해제: ${serverId}`)
        } catch (error) {
            console.error(`❌ MCP 서버 연결 해제 실패: ${serverId}`, error)
        }

        connectedClients.delete(serverId)
        console.log(
            `📝 현재 연결된 MCP 서버 목록: [${Array.from(
                connectedClients.keys()
            ).join(', ')}]`
        )
    } else {
        console.warn(`⚠️ 연결되지 않은 MCP 서버 ID: ${serverId}`)
    }
}

export async function callMCPTool(
    serverId: string,
    toolCall: MCPToolCall
): Promise<MCPToolResult> {
    const connection = connectedClients.get(serverId)

    if (!connection) {
        console.error(`❌ MCP 서버에 연결되지 않음: ${serverId}`)
        throw new Error('서버에 연결되지 않았습니다')
    }

    console.log(`🔧 MCP 도구 호출 시작: ${toolCall.name} (서버: ${serverId})`)
    console.log(`📝 함수 매개변수:`, toolCall.arguments)

    try {
        const result = await connection.client.callTool({
            name: toolCall.name,
            arguments: toolCall.arguments
        })

        console.log(`✅ MCP 도구 호출 성공: ${toolCall.name}`)
        console.log(`📋 결과:`, result)

        const content = Array.isArray(result.content) ? result.content : []
        return {
            content: content.map((item: unknown) => {
                // 이미지 컨텐츠인 경우 원본 데이터 유지
                if (
                    item &&
                    typeof item === 'object' &&
                    'type' in item &&
                    item.type === 'image'
                ) {
                    const imageItem = item as {
                        type: 'image'
                        data?: string
                        mimeType?: string
                    }
                    return {
                        type: 'image' as const,
                        data: imageItem.data,
                        mimeType: imageItem.mimeType
                    }
                }
                // 텍스트 컨텐츠인 경우
                if (
                    item &&
                    typeof item === 'object' &&
                    'type' in item &&
                    item.type === 'text'
                ) {
                    const textItem = item as { type: 'text'; text?: string }
                    return {
                        type: 'text' as const,
                        text: textItem.text
                    }
                }
                // 기타 모든 타입은 텍스트로 변환
                return {
                    type: 'text' as const,
                    text: typeof item === 'string' ? item : JSON.stringify(item)
                }
            }),
            isError: Boolean(result.isError)
        }
    } catch (error) {
        console.error(
            `❌ MCP 도구 호출 실패: ${toolCall.name} (서버: ${serverId})`
        )
        console.error(`오류 내용:`, error)
        throw new Error(
            `도구 호출 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function getMCPPromptResult(
    serverId: string,
    promptName: string,
    arguments_: Record<string, unknown> = {}
): Promise<MCPToolResult> {
    const connection = connectedClients.get(serverId)

    if (!connection) {
        throw new Error('서버에 연결되지 않았습니다')
    }

    try {
        const result = await connection.client.getPrompt({
            name: promptName,
            arguments: Object.fromEntries(
                Object.entries(arguments_).map(([k, v]) => [k, String(v)])
            )
        })

        return {
            content:
                result.messages?.map(msg => ({
                    type: 'text' as const,
                    text:
                        typeof msg.content === 'string'
                            ? msg.content
                            : JSON.stringify(msg.content)
                })) || [],
            isError: false
        }
    } catch (error) {
        throw new Error(
            `프롬프트 실행 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function readMCPResource(
    serverId: string,
    uri: string
): Promise<MCPToolResult> {
    const connection = connectedClients.get(serverId)

    if (!connection) {
        throw new Error('서버에 연결되지 않았습니다')
    }

    try {
        const result = await connection.client.readResource({ uri })

        return {
            content: (result.contents || []).map((item: unknown) => ({
                type: 'text' as const,
                text: typeof item === 'string' ? item : JSON.stringify(item)
            })),
            isError: false
        }
    } catch (error) {
        throw new Error(
            `리소스 읽기 실패: ${
                error instanceof Error ? error.message : '알 수 없는 오류'
            }`
        )
    }
}

export async function getConnectedServerIds(): Promise<string[]> {
    return Array.from(connectedClients.keys())
}

export async function isServerConnected(serverId: string): Promise<boolean> {
    return connectedClients.has(serverId)
}

export async function getConnectedServerInfo(
    serverId: string
): Promise<ConnectedMCPServer | null> {
    const connection = connectedClients.get(serverId)
    if (!connection) {
        return null
    }

    // 연결이 살아있는지 확인하기 위해 간단한 요청 시도
    try {
        const [toolsResult, promptsResult, resourcesResult] =
            await Promise.allSettled([
                connection.client.listTools(),
                connection.client.listPrompts(),
                connection.client.listResources()
            ])

        const tools =
            toolsResult.status === 'fulfilled'
                ? (toolsResult.value.tools as MCPTool[]) || []
                : []
        const prompts =
            promptsResult.status === 'fulfilled'
                ? (promptsResult.value.prompts as MCPPrompt[]) || []
                : []
        const resources =
            resourcesResult.status === 'fulfilled'
                ? (resourcesResult.value.resources as MCPResource[]) || []
                : []

        // 저장된 설정을 가져오기 위해 임시로 빈 설정 반환 (실제로는 저장소에서 가져와야 함)
        return {
            config: {
                id: serverId,
                name: 'Connected Server',
                transport: 'stdio' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            },
            info: {
                name: 'MCP Server',
                version: '1.0.0',
                capabilities: {}
            },
            tools,
            prompts,
            resources,
            isConnected: true
        }
    } catch {
        // 연결이 끊어진 경우 정리
        connectedClients.delete(serverId)
        return null
    }
}
