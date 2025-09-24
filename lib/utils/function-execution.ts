export interface FunctionCall {
    id?: string
    name?: string
    args?: Record<string, unknown>
}

export interface FunctionExecutionResult {
    content: Array<{
        type: 'text' | 'image' | 'resource'
        text?: string
        data?: string
        url?: string
        mimeType?: string
    }>
    isError?: boolean
}

export async function executeFunctionCall(
    serverId: string,
    functionCall: FunctionCall
): Promise<FunctionExecutionResult> {
    const response = await fetch('/api/chat/execute-function', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            serverId,
            functionCall
        })
    })

    const data = await response.json()

    if (!data.success) {
        throw new Error(data.error || '함수 실행 실패')
    }

    return data.result
}

export async function executeFunctionCalls(
    enabledServers: string[],
    functionCalls: FunctionCall[]
): Promise<Record<string, FunctionExecutionResult>> {
    const results: Record<string, FunctionExecutionResult> = {}

    // 각 함수 호출을 병렬로 실행
    const executions = functionCalls.map(async (call, index) => {
        const callId = call.id || `call-${index}`

        // 첫 번째 활성화된 서버에서 실행 (실제로는 어떤 서버에서 실행할지 결정하는 로직이 필요)
        if (enabledServers.length > 0) {
            try {
                const result = await executeFunctionCall(
                    enabledServers[0],
                    call
                )
                results[callId] = result
            } catch (error) {
                results[callId] = {
                    content: [
                        {
                            type: 'text',
                            text: `함수 실행 오류: ${
                                error instanceof Error
                                    ? error.message
                                    : '알 수 없는 오류'
                            }`
                        }
                    ],
                    isError: true
                }
            }
        }
    })

    await Promise.all(executions)
    return results
}
