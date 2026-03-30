/**
 * Agent Session Store
 *
 * Manages prototype agent sessions with plan, HTML state, and step history.
 * Built on the same Dexie persistence as chatSessionStore.
 */

import { create } from 'zustand'
import type {
  ChatMessage,
  ChatSession,
  PrototypePlan,
  AgentStep,
  AgentSessionState as PersistedAgentState,
} from '@repo/types'
import { db } from '../db/index'

interface AgentStoreState {
  // Session management
  sessions: ChatSession[]
  currentSessionId: string | null

  // Chat messages (user + assistant summaries)
  messages: ChatMessage[]

  // Agent state
  plan: PrototypePlan | null
  currentHtml: string
  steps: AgentStep[]
  isRunning: boolean

  // Actions
  loadSessions: () => Promise<void>
  createSession: (title: string) => Promise<ChatSession>
  selectSession: (id: string) => Promise<void>
  addMessage: (msg: ChatMessage) => void
  setPlan: (plan: PrototypePlan | null) => void
  setCurrentHtml: (html: string) => void
  setSteps: (steps: AgentStep[]) => void
  addStep: (step: AgentStep) => void
  setIsRunning: (value: boolean) => void
  saveSession: () => Promise<void>
  resetCurrent: () => void
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  plan: null,
  currentHtml: '',
  steps: [],
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
      plan: null,
      currentHtml: '',
      steps: [],
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
      plan: persisted?.plan ?? null,
      steps: [],
    })
  },

  addMessage: (msg: ChatMessage) => {
    set((state) => ({ messages: [...state.messages, msg] }))
  },

  setPlan: (plan: PrototypePlan | null) => set({ plan }),
  setCurrentHtml: (html: string) => set({ currentHtml: html }),
  setSteps: (steps: AgentStep[]) => set({ steps }),
  addStep: (step: AgentStep) => set((state) => ({ steps: [...state.steps, step] })),
  setIsRunning: (value: boolean) => set({ isRunning: value }),

  saveSession: async () => {
    const { currentSessionId, messages, currentHtml, plan } = get()
    if (!currentSessionId) return
    const agentState: PersistedAgentState = {
      plan,
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
      plan: null,
      currentHtml: '',
      steps: [],
    })
  },
}))
