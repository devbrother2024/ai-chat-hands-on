import { NextRequest } from 'next/server'
import { callMCPTool } from '@/lib/actions/mcp-actions'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { serverId, functionCall } = body

        if (!serverId || !functionCall) {
            return Response.json(
                { error: 'serverId와 functionCall이 필요합니다.' },
                { status: 400 }
            )
        }

        const result = await callMCPTool(serverId, {
            name: functionCall.name,
            arguments: functionCall.args || {}
        })

        return Response.json({
            success: true,
            result
        })
    } catch (error) {
        console.error('함수 실행 오류:', error)
        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : '알 수 없는 오류'
            },
            { status: 500 }
        )
    }
}
