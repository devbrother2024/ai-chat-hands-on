'use client'

import { useState } from 'react'
import { useMCP } from '@/lib/contexts/mcp-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Bug,
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle
} from 'lucide-react'

interface MCPDebugInfoProps {
    enabledServers: string[]
    className?: string
}

export function MCPDebugInfo({
    enabledServers,
    className = ''
}: MCPDebugInfoProps) {
    const { connectedServers } = useMCP()
    const [isExpanded, setIsExpanded] = useState(false)

    if (connectedServers.length === 0) {
        return null
    }

    return (
        <Card
            className={`p-3 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 ${className}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-6 w-6 p-0"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </Button>
                    <Bug className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        MCP 디버그 정보
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {connectedServers.filter(s => s.isConnected).length} /{' '}
                        {connectedServers.length} 연결됨
                    </Badge>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div className="mb-2">
                            <strong>활성화된 서버:</strong>{' '}
                            {enabledServers.length > 0
                                ? enabledServers.join(', ')
                                : '없음'}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {connectedServers.map(server => {
                            const isEnabled = enabledServers.includes(
                                server.config.id
                            )

                            return (
                                <div
                                    key={server.config.id}
                                    className="p-2 rounded border text-xs"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            {server.isConnected ? (
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-red-500" />
                                            )}
                                            <span className="font-medium">
                                                {server.config.name}
                                            </span>
                                            <Badge
                                                variant={
                                                    isEnabled
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                className="text-xs h-4"
                                            >
                                                {isEnabled
                                                    ? '활성화'
                                                    : '비활성화'}
                                            </Badge>
                                        </div>
                                        <span className="text-gray-500">
                                            ID: {server.config.id}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
                                        <div>도구: {server.tools.length}개</div>
                                        <div>
                                            프롬프트: {server.prompts.length}개
                                        </div>
                                        <div>
                                            리소스: {server.resources.length}개
                                        </div>
                                    </div>

                                    {server.tools.length > 0 && (
                                        <div className="mt-1">
                                            <span className="text-gray-500">
                                                도구 목록:
                                            </span>
                                            <div className="ml-2 text-gray-600 dark:text-gray-400">
                                                {server.tools
                                                    .map(tool => tool.name)
                                                    .join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {server.lastError && (
                                        <div className="mt-1 text-red-600 text-xs">
                                            <span className="font-medium">
                                                오류:
                                            </span>{' '}
                                            {server.lastError}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </Card>
    )
}
