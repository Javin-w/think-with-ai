/**
 * Generic Agent types — module-agnostic infrastructure
 */

// ── SSE Events (shared by all agent modules) ──

export interface AgentStepEvent {
  type: 'step'
  tool: string
  summary: string
  [key: string]: unknown
}

export interface AgentClarifyEvent {
  type: 'clarify'
  questions: string[]
}

export interface AgentPreviewEvent {
  type: 'preview'
  [key: string]: unknown
}

export interface AgentCompleteEvent {
  type: 'complete'
  text: string
  [key: string]: unknown
}

export interface AgentErrorEvent {
  type: 'error'
  message: string
}

export interface AgentRequestFeedbackEvent {
  type: 'request_feedback'
  requestId: string
  feedbackType: 'dom_info' | 'screenshot'
}

export type AgentEvent =
  | AgentStepEvent
  | AgentClarifyEvent
  | AgentPreviewEvent
  | AgentCompleteEvent
  | AgentErrorEvent
  | AgentRequestFeedbackEvent

export type SSEEmitter = (event: AgentEvent) => void

/** Request feedback from frontend and wait for the response */
export type FeedbackRequester = (feedbackType: 'dom_info' | 'screenshot') => Promise<string>

// ── Agent State (generic over module state) ──

export interface AgentState<T> {
  sessionId: string
  stepCount: number
  maxSteps: number
  moduleState: T
}

// ── Agent Module Config (each module implements this) ──

export interface AgentModuleConfig<T> {
  /** Module name (used for logging/routing) */
  name: string
  /** Default AI provider */
  defaultProvider: string
  /** Default AI model */
  defaultModel: string
  /** Max tool-call steps before forced stop */
  maxSteps: number
  /** Create initial module state (optionally from persisted state) */
  createInitialState: (existing?: Partial<T>) => T
  /** Create tools bound to current state, SSE emitter, and feedback requester */
  createTools: (state: AgentState<T>, emit: SSEEmitter, requestFeedback: FeedbackRequester) => Record<string, unknown>
  /** Build system prompt from current state (called each iteration) */
  buildSystemPrompt: (state: AgentState<T>) => string
}

// ── Agent Run Options ──

export interface AgentRunOptions {
  message: string
  sessionId: string
  provider?: string
  model?: string
  existingModuleState?: Record<string, unknown>
  existingMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
}
