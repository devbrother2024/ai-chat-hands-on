import type { ChatSession, ChatMessage } from '@/lib/supabase/types'
import {
    createChatSession,
    getChatSessions,
    getChatMessages,
    saveChatMessage,
    updateChatSession,
    deleteChatSession
} from '@/lib/actions/chat-actions'

type FunctionCall = {
    id?: string
    name?: string
    args?: Record<string, unknown>
}

type ChatMessageInput = {
    role: 'user' | 'assistant'
    content: string
    functionCalls?: FunctionCall[]
    functionResults?: Record<
        string,
        {
            content?: Array<{
                type: string
                text?: string
                data?: string
                mimeType?: string
            }>
            isError?: boolean
        }
    >
}

export class SupabaseChatStorage {
    static async createSession(title?: string): Promise<ChatSession> {
        try {
            const { data, error } = await createChatSession(title)

            if (error || !data) {
                throw new Error(error || '채팅 세션 생성에 실패했습니다')
            }

            return data
        } catch (error) {
            console.error('채팅 세션 생성 실패:', error)
            throw new Error('채팅 세션 생성에 실패했습니다')
        }
    }

    static async getAllSessions(): Promise<ChatSession[]> {
        try {
            const { data, error } = await getChatSessions()

            if (error || !data) {
                console.error('채팅 세션 조회 실패:', error)
                return []
            }

            return data
        } catch (error) {
            console.error('채팅 세션 조회 중 오류:', error)
            return []
        }
    }

    static async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
        try {
            const { data, error } = await getChatMessages(sessionId)

            if (error || !data) {
                console.error('채팅 메시지 조회 실패:', error)
                return []
            }

            return data
        } catch (error) {
            console.error('채팅 메시지 조회 중 오류:', error)
            return []
        }
    }

    static async saveMessage(
        sessionId: string,
        message: ChatMessageInput
    ): Promise<ChatMessage> {
        try {
            const { data, error } = await saveChatMessage(sessionId, message)

            if (error || !data) {
                throw new Error(error || '채팅 메시지 저장에 실패했습니다')
            }

            return data
        } catch (error) {
            console.error('채팅 메시지 저장 실패:', error)
            throw new Error('채팅 메시지 저장에 실패했습니다')
        }
    }

    static async updateSession(
        sessionId: string,
        updates: Partial<Pick<ChatSession, 'title'>>
    ): Promise<ChatSession> {
        try {
            const { data, error } = await updateChatSession(sessionId, updates)

            if (error || !data) {
                throw new Error(error || '채팅 세션 업데이트에 실패했습니다')
            }

            return data
        } catch (error) {
            console.error('채팅 세션 업데이트 실패:', error)
            throw new Error('채팅 세션 업데이트에 실패했습니다')
        }
    }

    static async deleteSession(sessionId: string): Promise<void> {
        try {
            const { error } = await deleteChatSession(sessionId)

            if (error) {
                throw new Error(error)
            }
        } catch (error) {
            console.error('채팅 세션 삭제 실패:', error)
            throw new Error('채팅 세션 삭제에 실패했습니다')
        }
    }

    // 기존 localStorage 스타일 API와의 호환성을 위한 헬퍼 메서드들
    static async getCurrentSession(): Promise<ChatSession | null> {
        const sessions = await this.getAllSessions()
        return sessions.length > 0 ? sessions[0] : null
    }

    static async getCurrentMessages(): Promise<ChatMessage[]> {
        const currentSession = await this.getCurrentSession()
        if (!currentSession) return []

        return await this.getSessionMessages(currentSession.id)
    }
}

// 기존 localStorage ChatMessage 타입을 DB ChatMessage로 변환하는 헬퍼 함수
export function convertLegacyChatMessage(legacyMessage: {
    role: 'user' | 'assistant'
    content: string
    functionCalls?: FunctionCall[]
    functionResults?: Record<
        string,
        {
            content?: Array<{
                type: string
                text?: string
                data?: string
                mimeType?: string
            }>
            isError?: boolean
        }
    >
}): ChatMessageInput {
    return {
        role: legacyMessage.role,
        content: legacyMessage.content,
        functionCalls: legacyMessage.functionCalls,
        functionResults: legacyMessage.functionResults
    }
}

// DB ChatMessage를 기존 타입으로 변환하는 헬퍼 함수
export function convertDbChatMessage(dbMessage: ChatMessage): {
    role: 'user' | 'assistant'
    content: string
    functionCalls?: FunctionCall[]
    functionResults?: Record<
        string,
        {
            content?: Array<{
                type: string
                text?: string
                data?: string
                mimeType?: string
            }>
            isError?: boolean
        }
    >
} {
    return {
        role: dbMessage.role as 'user' | 'assistant',
        content: dbMessage.content,
        functionCalls: dbMessage.function_calls
            ? (dbMessage.function_calls as FunctionCall[])
            : undefined,
        functionResults: dbMessage.function_results
            ? (dbMessage.function_results as Record<
                  string,
                  {
                      content?: Array<{
                          type: string
                          text?: string
                          data?: string
                          mimeType?: string
                      }>
                      isError?: boolean
                  }
              >)
            : undefined
    }
}
