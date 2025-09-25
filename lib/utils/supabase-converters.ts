import type { MCPServer } from '@/lib/supabase/types'
import type { MCPServerConfig, MCPTransportType } from '@/lib/types/mcp'

// DB에서 MCPServer를 MCPServerConfig로 변환하는 헬퍼 함수
export function dbServerToConfig(dbServer: MCPServer): MCPServerConfig {
    return {
        id: dbServer.id,
        name: dbServer.name,
        description: dbServer.description || undefined,
        transport: dbServer.transport as MCPTransportType,
        command: dbServer.command || undefined,
        args: dbServer.args ? (dbServer.args as string[]) : undefined,
        env: dbServer.env
            ? (dbServer.env as Record<string, string>)
            : undefined,
        url: dbServer.url || undefined,
        headers: dbServer.headers
            ? (dbServer.headers as Record<string, string>)
            : undefined,
        createdAt: dbServer.created_at,
        updatedAt: dbServer.updated_at,
        isActive: dbServer.is_active
    }
}

// MCPServerConfig를 DB 저장 형태로 변환하는 헬퍼 함수
export function configToDbServer(config: MCPServerConfig) {
    return {
        id: config.id,
        name: config.name,
        description: config.description || null,
        transport: config.transport,
        command: config.command || null,
        args: config.args ? JSON.parse(JSON.stringify(config.args)) : null,
        env: config.env ? JSON.parse(JSON.stringify(config.env)) : null,
        url: config.url || null,
        headers: config.headers
            ? JSON.parse(JSON.stringify(config.headers))
            : null,
        is_active: config.isActive
    }
}
