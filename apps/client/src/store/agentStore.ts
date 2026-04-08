/**
 * Agent Session Store — simplified for ReAct style prototype agent
 */

import { create } from 'zustand'
import type {
  ChatMessage,
  ChatSession,
  AgentSessionState as PersistedAgentState,
} from '@repo/types'
import { db } from '../db/index'

interface AgentStoreState {
  sessions: ChatSession[]
  currentSessionId: string | null
  messages: ChatMessage[]
  currentHtml: string
  isRunning: boolean

  loadSessions: () => Promise<void>
  createSession: (title: string) => Promise<ChatSession>
  selectSession: (id: string) => Promise<void>
  addMessage: (msg: ChatMessage) => void
  setCurrentHtml: (html: string) => void
  setIsRunning: (value: boolean) => void
  saveSession: () => Promise<void>
  resetCurrent: () => void
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  currentHtml: '',
  isRunning: false,

  loadSessions: async () => {
    const sessions = await db.chatSessions
      .where('type')
      .equals('prototype')
      .reverse()
      .sortBy('updatedAt')
    set({ sessions })
  },

  createSession: async (title: string) => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      type: 'prototype',
      title,
      messages: [],
      output: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.chatSessions.add(session)
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
      messages: [],
      currentHtml: '',
    }))
    return session
  },

  selectSession: async (id: string) => {
    const session = await db.chatSessions.get(id)
    if (!session) return
    const persisted = session.agentState as PersistedAgentState | null | undefined
    set({
      currentSessionId: session.id,
      messages: session.messages,
      currentHtml: persisted?.currentHtml ?? session.output ?? '',
    })
  },

  addMessage: (msg: ChatMessage) => {
    set((state) => ({ messages: [...state.messages, msg] }))
  },

  setCurrentHtml: (html: string) => set({ currentHtml: html }),
  setIsRunning: (value: boolean) => set({ isRunning: value }),

  saveSession: async () => {
    const { currentSessionId, messages, currentHtml } = get()
    if (!currentSessionId) return
    const agentState: PersistedAgentState = {
      currentHtml,
      requirementSummary: '',
      htmlSnapshots: [],
    }
    await db.chatSessions.update(currentSessionId, {
      messages,
      output: currentHtml || null,
      agentState,
      updatedAt: Date.now(),
    })
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages, output: currentHtml || null, agentState, updatedAt: Date.now() }
          : s
      ),
    }))
  },

  resetCurrent: () => {
    set({
      currentSessionId: null,
      messages: [],
      currentHtml: '',
    })
  },
}))
