'use client'

import { useState } from 'react'
import { MCPManager } from '@/components/mcp/mcp-manager'
import { MCPProvider } from '@/lib/contexts/mcp-context'
import { MCPToolsPanel } from '@/components/chat/mcp-tools-panel'
import { MCPDebugInfo } from '@/components/chat/mcp-debug-info'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Button } from '@/components/ui/button'
import { MessageSquare, Settings } from 'lucide-react'

export default function Home() {
    const [currentTab, setCurrentTab] = useState<'chat' | 'mcp'>('chat')
    const [enabledMCPServers, setEnabledMCPServers] = useState<string[]>([])

    const handleToggleMCPServer = (serverId: string, enabled: boolean) => {
        setEnabledMCPServers(prev => {
            if (enabled) {
                return prev.includes(serverId) ? prev : [...prev, serverId]
            } else {
                return prev.filter(id => id !== serverId)
            }
        })
    }

    return (
        <MCPProvider>
            <div className="min-h-screen flex flex-col mx-auto max-w-6xl p-4 gap-4">
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">
                        AI 채팅 애플리케이션 (Supabase)
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={
                                    currentTab === 'chat'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => setCurrentTab('chat')}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                채팅
                            </Button>
                            <Button
                                variant={
                                    currentTab === 'mcp' ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => setCurrentTab('mcp')}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                MCP 서버 관리
                            </Button>
                        </div>
                        {currentTab === 'chat' && (
                            <div className="text-xs text-gray-500">
                                모델: gemini-2.0-flash-001 | 데이터베이스:
                                Supabase
                            </div>
                        )}
                    </div>
                </header>

                {currentTab === 'chat' ? (
                    <div className="flex-1 flex flex-col gap-4">
                        <MCPToolsPanel
                            enabledServers={enabledMCPServers}
                            onToggleServer={handleToggleMCPServer}
                        />

                        <MCPDebugInfo
                            enabledServers={enabledMCPServers}
                            className="mb-4"
                        />

                        <div className="flex-1 rounded-md border bg-white/50 dark:bg-black/20">
                            <ChatInterface
                                enabledMCPServers={enabledMCPServers}
                            />
                        </div>
                    </div>
                ) : (
                    <MCPManager />
                )}
            </div>
        </MCPProvider>
    )
}
