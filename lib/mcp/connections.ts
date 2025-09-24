import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

// 서버에서 연결된 클라이언트들을 관리하는 전역 맵
// Node.js의 global 객체를 사용하여 Next.js 서버 인스턴스 간 공유
declare global {
    var __mcpConnections:
        | Map<string, { client: Client; transport: Transport }>
        | undefined
}

// 전역 연결 맵 초기화
if (!global.__mcpConnections) {
    global.__mcpConnections = new Map<
        string,
        { client: Client; transport: Transport }
    >()
}

export const connectedClients = global.__mcpConnections

// 연결 상태 확인 및 복구 함수
export function getConnectionStatus() {
    const connections = Array.from(connectedClients.entries())
    console.log(`🔗 전역 MCP 연결 상태: ${connections.length}개`)
    connections.forEach(([id, connection]) => {
        console.log(`  - ${id}: ${connection.client ? '연결됨' : '연결 안됨'}`)
    })
    return connections
}

// 특정 서버의 연결 상태 검증
export async function validateConnection(serverId: string): Promise<boolean> {
    const connection = connectedClients.get(serverId)
    if (!connection) {
        console.log(`❌ 서버 ${serverId}: 연결 정보 없음`)
        return false
    }

    try {
        // 간단한 ping 테스트로 연결 확인
        await connection.client.listTools()
        console.log(`✅ 서버 ${serverId}: 연결 확인됨`)
        return true
    } catch (error) {
        console.log(`❌ 서버 ${serverId}: 연결 끊어짐`, error)
        // 연결이 끊어진 경우 정리
        connectedClients.delete(serverId)
        return false
    }
}

// 모든 연결 상태 검증
export async function validateAllConnections(): Promise<string[]> {
    const validConnections: string[] = []
    const connectionIds = Array.from(connectedClients.keys())

    console.log(`🔍 ${connectionIds.length}개 연결 검증 시작...`)

    for (const serverId of connectionIds) {
        if (await validateConnection(serverId)) {
            validConnections.push(serverId)
        }
    }

    console.log(
        `✅ 유효한 연결: ${validConnections.length}개 [${validConnections.join(
            ', '
        )}]`
    )
    return validConnections
}
