'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface FunctionCall {
    id?: string
    name?: string
    args?: Record<string, unknown>
}

interface FunctionResult {
    content?: Array<{
        type: string
        text?: string
    }>
    isError?: boolean
}

interface FunctionCallResultProps {
    functionCalls: FunctionCall[]
    results?: Record<string, FunctionResult>
    loading?: boolean
}

export function FunctionCallResult({
    functionCalls,
    results,
    loading
}: FunctionCallResultProps) {
    if (!functionCalls || functionCalls.length === 0) {
        return null
    }

    return (
        <div className="space-y-2 my-3">
            {functionCalls.map((call, index) => {
                const callId = call.id || `call-${index}`
                const result = results?.[callId]
                const hasResult = result !== undefined
                const isError = result?.isError === true

                return (
                    <Card
                        key={callId}
                        className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                함수 호출: {call.name}
                            </span>
                            {loading && !hasResult && (
                                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                            )}
                            {hasResult && (
                                <Badge
                                    variant={
                                        isError ? 'destructive' : 'default'
                                    }
                                    className="text-xs"
                                >
                                    {isError ? (
                                        <>
                                            <XCircle className="h-3 w-3 mr-1" />
                                            오류
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            완료
                                        </>
                                    )}
                                </Badge>
                            )}
                        </div>

                        {call.args && Object.keys(call.args).length > 0 && (
                            <div className="mb-2">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    매개변수:
                                </div>
                                <div className="text-xs bg-white dark:bg-gray-900 rounded p-2 border">
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(call.args, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {hasResult && (
                            <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    결과:
                                </div>
                                <div className="text-xs bg-white dark:bg-gray-900 rounded p-2 border">
                                    {result.content &&
                                    result.content.length > 0 ? (
                                        result.content.map(
                                            (item, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="mb-1 last:mb-0"
                                                >
                                                    {item.type === 'text' && (
                                                        <pre className="whitespace-pre-wrap">
                                                            {item.text}
                                                        </pre>
                                                    )}
                                                </div>
                                            )
                                        )
                                    ) : (
                                        <span className="text-gray-500">
                                            결과 없음
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}
