import { MCPServerConfig } from '@/lib/types/mcp'
import {
    saveMCPServer,
    getAllMCPServers,
    getMCPServer,
    deleteMCPServer,
    updateMCPServerStatus
} from '@/lib/actions/supabase-mcp-actions'
import { dbServerToConfig } from '@/lib/utils/supabase-converters'

export class SupabaseMCPServerStorage {
    static async getAllServers(): Promise<MCPServerConfig[]> {
        try {
            const { data, error } = await getAllMCPServers()

            if (error || !data) {
                console.error('MCP 서버 조회 실패:', error)
                return []
            }

            return data.map(dbServerToConfig)
        } catch (error) {
            console.error('MCP 서버 조회 중 오류:', error)
            return []
        }
    }

    static async saveServer(server: MCPServerConfig): Promise<void> {
        try {
            const { error } = await saveMCPServer(server)

            if (error) {
                throw new Error(error)
            }
        } catch (error) {
            console.error('MCP 서버 저장 실패:', error)
            throw new Error('서버 정보 저장에 실패했습니다')
        }
    }

    static async deleteServer(id: string): Promise<void> {
        try {
            const { error } = await deleteMCPServer(id)

            if (error) {
                throw new Error(error)
            }
        } catch (error) {
            console.error('MCP 서버 삭제 실패:', error)
            throw new Error('서버 삭제에 실패했습니다')
        }
    }

    static async getServer(id: string): Promise<MCPServerConfig | null> {
        try {
            const { data, error } = await getMCPServer(id)

            if (error || !data) {
                console.error('MCP 서버 조회 실패:', error)
                return null
            }

            return dbServerToConfig(data)
        } catch (error) {
            console.error('MCP 서버 조회 중 오류:', error)
            return null
        }
    }

    static async updateServerStatus(
        id: string,
        isActive: boolean
    ): Promise<void> {
        try {
            const { error } = await updateMCPServerStatus(id, isActive)

            if (error) {
                throw new Error(error)
            }
        } catch (error) {
            console.error('MCP 서버 상태 업데이트 실패:', error)
            throw new Error('서버 상태 업데이트에 실패했습니다')
        }
    }

    static async exportServers(): Promise<string> {
        const servers = await this.getAllServers()
        return JSON.stringify(servers, null, 2)
    }

    static async importServers(data: string): Promise<void> {
        try {
            const servers = JSON.parse(data) as MCPServerConfig[]

            // 기본 유효성 검사
            if (!Array.isArray(servers)) {
                throw new Error('올바르지 않은 데이터 형식입니다')
            }

            // 서버별로 저장
            for (const server of servers) {
                if (server.id && server.name && server.transport) {
                    await this.saveServer({
                        ...server,
                        updatedAt: new Date().toISOString()
                    })
                }
            }
        } catch (error) {
            console.error('MCP 서버 가져오기 실패:', error)
            throw new Error('서버 목록 가져오기에 실패했습니다')
        }
    }
}
