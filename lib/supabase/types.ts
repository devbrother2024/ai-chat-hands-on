// 생성된 타입을 import 후 재export
import type { Json as _Json, Database as _Database } from './database.types'

export type Json = _Json
export type Database = _Database

// 기존 타입과의 호환성을 위한 타입 매핑
export type ChatSession = _Database['public']['Tables']['chat_sessions']['Row']
export type ChatMessage = _Database['public']['Tables']['chat_messages']['Row']
export type MCPServer = _Database['public']['Tables']['mcp_servers']['Row']
