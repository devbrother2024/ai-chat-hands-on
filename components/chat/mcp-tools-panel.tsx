'use client'

import { useState } from 'react'
import { useMCP } from '@/lib/contexts/mcp-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Wrench, ChevronDown, ChevronRight } from 'lucide-react'

interface MCPToolsPanelProps {
    enabledServers: string[]
    onToggleServer: (serverId: string, enabled: boolean) => void
}

export function MCPToolsPanel({
    enabledServers,
    onToggleServer
}: MCPToolsPanelProps) {
    const { connectedServers } = useMCP()
    const [isExpanded, setIsExpanded] = useState(false)

    if (connectedServers.length === 0) {
        return null
    }

    const availableTools = connectedServers.reduce((total, server) => {
        return total + server.tools.length
    }, 0)

    return (
        <Card className="mb-4 p-3">
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
                    <Wrench className="h-4 w-4" />
                    <span className="text-sm font-medium">MCP 도구</span>
                    <Badge variant="secondary" className="text-xs">
                        {availableTools}개 사용 가능
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={
                            enabledServers.length > 0 ? 'default' : 'outline'
                        }
                        className="text-xs"
                    >
                        {enabledServers.length}개 활성화
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-2">
                    {connectedServers.map(server => {
                        const isEnabled = enabledServers.includes(
                            server.config.id
                        )

                        return (
                            <div
                                key={server.config.id}
                                className="flex items-center justify-between p-2 rounded-md border bg-gray-50/50 dark:bg-gray-800/50"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`h-2 w-2 rounded-full ${
                                            server.isConnected
                                                ? 'bg-green-500'
                                                : 'bg-red-500'
                                        }`}
                                    />
                                    <div>
                                        <div className="text-sm font-medium">
                                            {server.config.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {server.tools.length}개 도구
                                            {server.tools.length > 0 && (
                                                <span className="ml-1">
                                                    (
                                                    {server.tools
                                                        .map(t => t.name)
                                                        .join(', ')}
                                                    )
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant={isEnabled ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() =>
                                        onToggleServer(
                                            server.config.id,
                                            !isEnabled
                                        )
                                    }
                                    disabled={!server.isConnected}
                                >
                                    {isEnabled ? '활성화됨' : '비활성화됨'}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}
