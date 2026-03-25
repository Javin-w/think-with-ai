import { create } from 'zustand'
import type { ChatMessage, ChatMode, ChatSession } from '@repo/types'
import { db } from '../db/index'

interface ChatSessionState {
  sessions: ChatSession[]
  currentSessionId: string | null
  messages: ChatMessage[]
  output: string
  isStreaming: boolean

  loadSessions: () => Promise<void>
  createSession: (title: string) => Promise<ChatSession>
  selectSession: (id: string) => Promise<void>
  addMessage: (msg: ChatMessage) => void
  updateLastMessage: (content: string) => void
  setOutput: (output: string) => void
  setIsStreaming: (value: boolean) => void
  saveSession: () => Promise<void>
}

function createChatSessionStore(type: ChatMode) {
  return create<ChatSessionState>((set, get) => ({
    sessions: [],
    currentSessionId: null,
    messages: [],
    output: '',
    isStreaming: false,

    loadSessions: async () => {
      const sessions = await db.chatSessions
        .where('type')
        .equals(type)
        .reverse()
        .sortBy('updatedAt')
      set({ sessions })
    },

    createSession: async (title: string) => {
      const session: ChatSession = {
        id: crypto.randomUUID(),
        type,
        title,
        messages: [],
        output: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await db.chatSessions.add(session)
      set(state => ({
        sessions: [session, ...state.sessions],
        currentSessionId: session.id,
        messages: [],
        output: '',
      }))
      return session
    },

    selectSession: async (id: string) => {
      const session = await db.chatSessions.get(id)
      if (!session) return
      set({
        currentSessionId: session.id,
        messages: session.messages,
        output: session.output ?? '',
      })
    },

    addMessage: (msg: ChatMessage) => {
      set(state => ({
        messages: [...state.messages, msg],
      }))
    },

    updateLastMessage: (content: string) => {
      set(state => {
        const msgs = [...state.messages]
        if (msgs.length === 0) return state
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
        return { messages: msgs }
      })
    },

    setOutput: (output: string) => {
      set({ output })
    },

    setIsStreaming: (value: boolean) => {
      set({ isStreaming: value })
    },

    saveSession: async () => {
      const { currentSessionId, messages, output } = get()
      if (!currentSessionId) return
      await db.chatSessions.update(currentSessionId, {
        messages,
        output: output || null,
        updatedAt: Date.now(),
      })
      // Update session in local list
      set(state => ({
        sessions: state.sessions.map(s =>
          s.id === currentSessionId
            ? { ...s, messages, output: output || null, updatedAt: Date.now() }
            : s
        ),
      }))
    },
  }))
}

export const useDocStore = createChatSessionStore('document')
export const usePrototypeStore = createChatSessionStore('prototype')
