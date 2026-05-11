/**
 * Shared TypeScript interfaces for Think With AI tree-conversation app
 */

/**
 * Represents a conversation tree (root container for all branches)
 */
export interface Tree {
  id: string;           // crypto.randomUUID()
  title: string;        // first 60 chars of first question
  createdAt: number;
  updatedAt: number;
}

/**
 * Represents a single node in the conversation tree
 * Each node can have multiple child branches based on selected text
 */
export interface TreeNode {
  id: string;
  treeId: string;
  parentId: string | null;  // null = root node
  selectedText: string | null;  // text that triggered this branch
  messages: ChatMessage[];
  createdAt: number;
  title?: string;  // display name for tree nav
  annotations?: Annotation[];
}

/**
 * A user annotation on a specific text selection within a message
 */
export interface Annotation {
  id: string;
  nodeId: string;
  messageId: string;       // which ChatMessage this annotation belongs to
  selectedText: string;    // the text that was selected
  content: string;         // user's annotation content
  createdAt: number;
}

/**
 * One web search result returned to the client (citation card data).
 * The `n` field is the 1-based index used in answer text as `[N]`.
 */
export interface SearchCitation {
  n: number;
  title: string;
  url: string;
  snippet: string;       // short excerpt
  summary?: string;      // longer excerpt when available
  siteName: string;
  favicon: string;       // siteIcon URL
  datePublished?: string;  // ISO timestamp if available
}

/**
 * Per-message metadata, persisted alongside the assistant message.
 */
export interface ChatMessageMeta {
  /** Query string while a web_search round is in flight (UI shows "searching…") */
  searchInProgress?: string;
  /** All queries issued for this message (populated as searches complete) */
  searchQueries?: string[];
  /** Citations attached to the answer; ordered by `n`. */
  citations?: SearchCitation[];
}

/**
 * Represents a single message in a conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];  // base64 data URLs for user-uploaded images
  createdAt: number;
  meta?: ChatMessageMeta;
}

/**
 * Chat mode determines which UI experience is used
 */
export type ChatMode = 'thinking' | 'prototype';

/**
 * Represents a generic chat session (document, prototype, etc.)
 */
export interface ChatSession {
  id: string;
  type: ChatMode;
  title: string;
  messages: ChatMessage[];
  output: string | null;
  createdAt: number;
  updatedAt: number;
  /** Agent state for prototype sessions — persisted for session recovery */
  agentState?: AgentSessionState | null;
}

/**
 * Persisted agent state for session recovery
 */
export interface AgentSessionState {
  currentHtml: string;
  requirementSummary: string;
  htmlSnapshots: Array<{ html: string; summary: string; timestamp: number }>;
}

/**
 * Represents a single news item from a tech source
 */
export interface NewsItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: number;
  summary: string;
}

/**
 * Represents a response containing news items
 */
export interface NewsResponse {
  items: NewsItem[];
  lastUpdated: number;
  sources: string[];
}

/**
 * Represents a request to stream a response from an AI provider
 */
export interface StreamRequest {
  message: string;
  context: ChatMessage[];
  provider?: string;    // 'openai' | 'anthropic'
  model?: string;
  mode?: ChatMode;
  webSearch?: boolean;  // when true, enable Agentic web search via Bocha
}

// ── Agent Types ──

export type PageType = 'landing' | 'dashboard' | 'form' | 'list' | 'detail' | 'multi-page';

export interface PlanSection {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
  priority: number;
}

export interface PrototypePlan {
  pageType: PageType;
  designStyle: string;
  sections: PlanSection[];
  globalProgress: number;
}

export interface AgentStep {
  id: string;
  tool: string;
  summary: string;
  timestamp: number;
}

export interface AgentStepEvent {
  type: 'step';
  tool: string;
  summary: string;
  html?: string;
}

export interface AgentClarifyEvent {
  type: 'clarify';
  questions: string[];
}

export interface AgentPreviewEvent {
  type: 'preview';
  html: string;
}

export interface AgentCompleteEvent {
  type: 'complete';
  text: string;
  html: string;
}

export interface AgentErrorEvent {
  type: 'error';
  message: string;
}

export interface AgentRequestFeedbackEvent {
  type: 'request_feedback';
  requestId: string;
  feedbackType: 'dom_info' | 'screenshot';
}

export type AgentEvent =
  | AgentStepEvent
  | AgentClarifyEvent
  | AgentPreviewEvent
  | AgentCompleteEvent
  | AgentErrorEvent
  | AgentRequestFeedbackEvent;

export interface AgentRunRequest {
  message: string;
  sessionId?: string;
  provider?: string;
  model?: string;
  existingState?: {
    currentHtml: string;
    htmlSnapshots: Array<{ html: string; summary: string; timestamp: number }>;
    requirementSummary: string;
  };
  existingMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
