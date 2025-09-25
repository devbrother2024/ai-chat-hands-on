import { NextRequest } from 'next/server'
import { connectToMCPServer } from '@/lib/actions/mcp-actions'
import { MCPServerConfig } from '@/lib/types/mcp'

export async function POST(request: NextRequest) {
    try {
        const config: MCPServerConfig = await request.json()

        const result = await connectToMCPServer(config)

        return Response.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('MCP 서버 연결 API 오류:', error)

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

