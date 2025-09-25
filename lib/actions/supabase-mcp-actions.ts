'use server'

import { createServerClient } from '@/lib/supabase/client'
import type { MCPServer } from '@/lib/supabase/types'
import type { MCPServerConfig } from '@/lib/types/mcp'

export async function saveMCPServer(
    config: MCPServerConfig
): Promise<{ data: MCPServer | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const serverData = {
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

        const { data, error } = await supabase
            .from('mcp_servers')
            .upsert(serverData, {
                onConflict: 'id'
            })
            .select()
            .single()

        if (error) {
            console.error('MCP 서버 저장 오류:', error)
            return { data: null, error: 'MCP 서버 저장에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('MCP 서버 저장 예외:', error)
        return { data: null, error: 'MCP 서버 저장 중 오류가 발생했습니다.' }
    }
}

export async function getAllMCPServers(): Promise<{
    data: MCPServer[] | null
    error: string | null
}> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('mcp_servers')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('MCP 서버 조회 오류:', error)
            return { data: null, error: 'MCP 서버 조회에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('MCP 서버 조회 예외:', error)
        return { data: null, error: 'MCP 서버 조회 중 오류가 발생했습니다.' }
    }
}

export async function getMCPServer(
    id: string
): Promise<{ data: MCPServer | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('mcp_servers')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('MCP 서버 조회 오류:', error)
            return { data: null, error: 'MCP 서버 조회에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('MCP 서버 조회 예외:', error)
        return { data: null, error: 'MCP 서버 조회 중 오류가 발생했습니다.' }
    }
}

export async function deleteMCPServer(
    id: string
): Promise<{ error: string | null }> {
    try {
        const supabase = createServerClient()

        const { error } = await supabase
            .from('mcp_servers')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('MCP 서버 삭제 오류:', error)
            return { error: 'MCP 서버 삭제에 실패했습니다.' }
        }

        return { error: null }
    } catch (error) {
        console.error('MCP 서버 삭제 예외:', error)
        return { error: 'MCP 서버 삭제 중 오류가 발생했습니다.' }
    }
}

export async function updateMCPServerStatus(
    id: string,
    isActive: boolean
): Promise<{ data: MCPServer | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('mcp_servers')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('MCP 서버 상태 업데이트 오류:', error)
            return {
                data: null,
                error: 'MCP 서버 상태 업데이트에 실패했습니다.'
            }
        }

        return { data, error: null }
    } catch (error) {
        console.error('MCP 서버 상태 업데이트 예외:', error)
        return {
            data: null,
            error: 'MCP 서버 상태 업데이트 중 오류가 발생했습니다.'
        }
    }
}
