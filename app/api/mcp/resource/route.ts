import { NextRequest } from 'next/server'
import { readMCPResource } from '@/lib/actions/mcp-actions'

export async function POST(request: NextRequest) {
    try {
        const { serverId, uri }: { serverId: string; uri: string } =
            await request.json()

        if (!serverId || !uri) {
            return Response.json(
                {
                    success: false,
                    error: 'serverId와 uri가 필요합니다'
                },
                { status: 400 }
            )
        }

        const result = await readMCPResource(serverId, uri)

        return Response.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('MCP 리소스 읽기 API 오류:', error)

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

