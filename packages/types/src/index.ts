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
}

/**
 * Represents a single message in a conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

/**
 * Chat mode determines which UI experience is used
 */
export type ChatMode = 'thinking' | 'document' | 'prototype';

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
}
