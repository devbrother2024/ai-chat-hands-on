'use server'

import { createServerClient } from '@/lib/supabase/client'
import type { ChatSession, ChatMessage } from '@/lib/supabase/types'

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

export async function createChatSession(
    title?: string
): Promise<{ data: ChatSession | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
                title: title || `채팅 ${new Date().toLocaleString('ko-KR')}`
            })
            .select()
            .single()

        if (error) {
            console.error('채팅 세션 생성 오류:', error)
            return { data: null, error: '채팅 세션 생성에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('채팅 세션 생성 예외:', error)
        return { data: null, error: '채팅 세션 생성 중 오류가 발생했습니다.' }
    }
}

export async function getChatSessions(): Promise<{
    data: ChatSession[] | null
    error: string | null
}> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('채팅 세션 조회 오류:', error)
            return { data: null, error: '채팅 세션 조회에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('채팅 세션 조회 예외:', error)
        return { data: null, error: '채팅 세션 조회 중 오류가 발생했습니다.' }
    }
}

export async function getChatMessages(
    sessionId: string
): Promise<{ data: ChatMessage[] | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('채팅 메시지 조회 오류:', error)
            return { data: null, error: '채팅 메시지 조회에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('채팅 메시지 조회 예외:', error)
        return { data: null, error: '채팅 메시지 조회 중 오류가 발생했습니다.' }
    }
}

export async function saveChatMessage(
    sessionId: string,
    message: ChatMessageInput
): Promise<{ data: ChatMessage | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                session_id: sessionId,
                role: message.role,
                content: message.content,
                function_calls: message.functionCalls
                    ? JSON.parse(JSON.stringify(message.functionCalls))
                    : null,
                function_results: message.functionResults
                    ? JSON.parse(JSON.stringify(message.functionResults))
                    : null
            })
            .select()
            .single()

        if (error) {
            console.error('채팅 메시지 저장 오류:', error)
            return { data: null, error: '채팅 메시지 저장에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('채팅 메시지 저장 예외:', error)
        return { data: null, error: '채팅 메시지 저장 중 오류가 발생했습니다.' }
    }
}

export async function updateChatSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'title'>>
): Promise<{ data: ChatSession | null; error: string | null }> {
    try {
        const supabase = createServerClient()

        const { data, error } = await supabase
            .from('chat_sessions')
            .update(updates)
            .eq('id', sessionId)
            .select()
            .single()

        if (error) {
            console.error('채팅 세션 업데이트 오류:', error)
            return { data: null, error: '채팅 세션 업데이트에 실패했습니다.' }
        }

        return { data, error: null }
    } catch (error) {
        console.error('채팅 세션 업데이트 예외:', error)
        return {
            data: null,
            error: '채팅 세션 업데이트 중 오류가 발생했습니다.'
        }
    }
}

export async function deleteChatSession(
    sessionId: string
): Promise<{ error: string | null }> {
    try {
        const supabase = createServerClient()

        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)

        if (error) {
            console.error('채팅 세션 삭제 오류:', error)
            return { error: '채팅 세션 삭제에 실패했습니다.' }
        }

        return { error: null }
    } catch (error) {
        console.error('채팅 세션 삭제 예외:', error)
        return { error: '채팅 세션 삭제 중 오류가 발생했습니다.' }
    }
}
