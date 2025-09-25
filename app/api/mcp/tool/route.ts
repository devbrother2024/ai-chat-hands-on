import { NextRequest } from 'next/server'
import { callMCPTool } from '@/lib/actions/mcp-actions'
import { MCPToolCall } from '@/lib/types/mcp'

export async function POST(request: NextRequest) {
    try {
        const {
            serverId,
            toolCall
        }: { serverId: string; toolCall: MCPToolCall } = await request.json()

        if (!serverId || !toolCall) {
            return Response.json(
                {
                    success: false,
                    error: 'serverId와 toolCall이 필요합니다'
                },
                { status: 400 }
            )
        }

        const result = await callMCPTool(serverId, toolCall)

        return Response.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('MCP 도구 호출 API 오류:', error)

        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : '알 수 없는 오류가 발생했습니다'
            },
            { status: 500 }
        )
    }
}

