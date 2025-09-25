import { NextRequest } from 'next/server'
import {
    getConnectedServerIds,
    isServerConnected,
    getConnectedServerInfo
} from '@/lib/actions/mcp-actions'

export async function GET() {
    try {
        const serverIds = await getConnectedServerIds()

        return Response.json({
            success: true,
            data: {
                connectedServerIds: serverIds,
                count: serverIds.length
            }
        })
    } catch (error) {
        console.error('MCP 상태 조회 API 오류:', error)

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

        const [isConnected, serverInfo] = await Promise.all([
            isServerConnected(serverId),
            getConnectedServerInfo(serverId)
        ])

        return Response.json({
            success: true,
            data: {
                serverId,
                isConnected,
                serverInfo
            }
        })
    } catch (error) {
        console.error('MCP 서버 상태 조회 API 오류:', error)

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

