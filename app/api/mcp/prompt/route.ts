import { NextRequest } from 'next/server'
import { getMCPPromptResult } from '@/lib/actions/mcp-actions'

export async function POST(request: NextRequest) {
    try {
        const {
            serverId,
            promptName,
            arguments: args
        }: {
            serverId: string
            promptName: string
            arguments?: Record<string, unknown>
        } = await request.json()

        if (!serverId || !promptName) {
            return Response.json(
                {
                    success: false,
                    error: 'serverId와 promptName이 필요합니다'
                },
                { status: 400 }
            )
        }

        const result = await getMCPPromptResult(serverId, promptName, args)

        return Response.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('MCP 프롬프트 실행 API 오류:', error)

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

