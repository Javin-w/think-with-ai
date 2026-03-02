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
 * Represents a request to stream a response from an AI provider
 */
export interface StreamRequest {
  message: string;
  context: ChatMessage[];
  provider?: string;    // 'openai' | 'anthropic'
  model?: string;
}
