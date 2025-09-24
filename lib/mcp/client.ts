// 클라이언트에서 API Routes를 호출하는 래퍼 클래스
import {
    MCPServerConfig,
    ConnectedMCPServer,
    MCPToolCall,
    MCPToolResult
} from '@/lib/types/mcp'

interface APIResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

export class MCPClientManager {
    private async fetchAPI<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const response = await fetch(`/api/mcp${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            },
            ...options
        })

        const result: APIResponse<T> = await response.json()

        if (!result.success || !response.ok) {
            throw new Error(result.error || '요청 처리 중 오류가 발생했습니다')
        }

        return result.data as T
    }

    async connectServer(config: MCPServerConfig): Promise<ConnectedMCPServer> {
        return await this.fetchAPI<ConnectedMCPServer>('/connect', {
            method: 'POST',
            body: JSON.stringify(config)
        })
    }

    async disconnectServer(serverId: string): Promise<void> {
        await this.fetchAPI('/disconnect', {
            method: 'POST',
            body: JSON.stringify({ serverId })
        })
    }

    async callTool(
        serverId: string,
        toolCall: MCPToolCall
    ): Promise<MCPToolResult> {
        return await this.fetchAPI<MCPToolResult>('/tool', {
            method: 'POST',
            body: JSON.stringify({ serverId, toolCall })
        })
    }

    async getPromptResult(
        serverId: string,
        promptName: string,
        arguments_?: Record<string, unknown>
    ): Promise<MCPToolResult> {
        return await this.fetchAPI<MCPToolResult>('/prompt', {
            method: 'POST',
            body: JSON.stringify({
                serverId,
                promptName,
                arguments: arguments_
            })
        })
    }

    async readResource(serverId: string, uri: string): Promise<MCPToolResult> {
        return await this.fetchAPI<MCPToolResult>('/resource', {
            method: 'POST',
            body: JSON.stringify({ serverId, uri })
        })
    }

    async isConnected(serverId: string): Promise<boolean> {
        const result = await this.fetchAPI<{
            serverId: string
            isConnected: boolean
            serverInfo: ConnectedMCPServer | null
        }>('/status', {
            method: 'POST',
            body: JSON.stringify({ serverId })
        })
        return result.isConnected
    }

    async getConnectedServerIds(): Promise<string[]> {
        const result = await this.fetchAPI<{
            connectedServerIds: string[]
            count: number
        }>('/status')
        return result.connectedServerIds
    }

    async getServerInfo(serverId: string): Promise<ConnectedMCPServer | null> {
        try {
            const result = await this.fetchAPI<{
                serverId: string
                isConnected: boolean
                serverInfo: ConnectedMCPServer | null
            }>('/status', {
                method: 'POST',
                body: JSON.stringify({ serverId })
            })
            return result.serverInfo
        } catch {
            return null
        }
    }

    async disconnectAll(): Promise<void> {
        const serverIds = await this.getConnectedServerIds()
        const disconnectPromises = serverIds.map(serverId =>
            this.disconnectServer(serverId)
        )
        await Promise.all(disconnectPromises)
    }
}

// 싱글톤 인스턴스
export const mcpClientManager = new MCPClientManager()
