import { NextRequest } from 'next/server'
import { disconnectFromMCPServer } from '@/lib/actions/mcp-actions'

export async function POST(request: NextRequest) {
    try {
        const { serverId }: { serverId: string } = await request.json()

        if (!serverId) {
            return Response.json(
                {
                    success: false,
                    error: 'serverId가 필요합니다'
                },
                { status: 400 }
            )
        }

        await disconnectFromMCPServer(serverId)

        return Response.json({
            success: true
        })
    } catch (error) {
        console.error('MCP 서버 연결 해제 API 오류:', error)

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

