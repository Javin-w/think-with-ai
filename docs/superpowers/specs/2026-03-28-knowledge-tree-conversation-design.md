# AI Knowledge Tree Conversation — Design Spec

## Overview

Redesign the AI Thinking module from a mind-map + structured output approach to a **tree-structured conversation** that preserves linear chat fluidity while enabling branching. Users chat normally; every follow-up question can become a child node, organically growing a knowledge tree.

**Core principle:** The conversation is not a stream — it's a tree. Each branch is a child node with inherited context.

## Decisions Log

| Question | Decision |
|----------|----------|
| Branch trigger mechanism | **C: Both** — paragraph-level buttons for coarse branching + text selection for precise branching |
| Tree navigation style | **A: File tree** — VS Code-style indented tree with expand/collapse |
| "Merge back to main" behavior | **B: Reference card** — collapsible card in parent showing branch conversation |
| Context display on node switch | **C: Breadcrumb + parent message preview** |
| Implementation approach | **A: Incremental refactor** — reuse existing data model, store, useNodeStream, /api/chat |

## Layout

```
┌──────────────────────────────────────────────────┐
│                     TopNav                        │
├───────────┬──────────────────────────────────────-┤
│ TreeNav   │          ConversationArea              │
│ 240px     │                                        │
│ collapsible│  Breadcrumb: root > branch1 > leaf    │
│           │  ┌─ ParentQuoteCard ──────────┐        │
│ ▼ Root    │  │ "triggering text..."       │        │
│   ▼ Branch│  └────────────────────────────┘        │
│     Leaf  │                                        │
│   ▸ Branch│  [Messages — document-style prose]      │
│           │    每段落旁有 [+] 展开按钮              │
│           │    选中文本可精确分支                     │
│           │                                        │
│ [返回列表] │  ────────────────────────────          │
│           │  [MessageInput — max-w-2xl centered]    │
├───────────┴──────────────────────────────────────-─┤
```

- Left: `TreeNavPanel` — fixed 240px, collapsible to 40px icon strip
- Center: `BranchConversationPanel` — flex-1, content `max-w-2xl mx-auto`
- No more `Layout` component 35/65 split

## Component Design

### TreeNavPanel

**Data:** Build nested structure from `treeStore.nodes` using `parentId` relationships.

**Node display:**
- Expand arrow `▸`/`▼` (when has children)
- Title: `selectedText` → first user message (30 chars) → "新对话"
- Message count badge (gray, small)
- Active node: 2px left border brand color + background highlight

**Interactions:**
- Click node → `setCurrentNode(nodeId)`, conversation area switches
- Expand/collapse → local UI state, default: path from root to current node is expanded
- Bottom: tree title (editable) + "返回列表" button

**Collapsed state:** 40px narrow strip with expand icon button.

### BranchConversationPanel

**Header section:**

1. `Breadcrumb` — ancestor chain from `getAncestorChain(nodes, nodeId)`, each node clickable, shows shortened title, separated by `>`
2. `ParentQuoteCard` — only for non-root nodes, shows `node.selectedText`, gray left-border blockquote style, click to jump to parent

**Message area:**

- Document-style rendering (existing prose typography), centered `max-w-2xl`
- User messages: `Q: content` in brand color
- AI messages: `article.prose` full-width Markdown
- `BranchTrigger` on each AI paragraph: semi-transparent `+` button on hover, click creates branch with paragraph text as `selectedText`
- `TextSelectionPopup` preserved for precise text-selection branching
- `BranchSummaryCard` below AI messages that have been branched: collapsible card showing `📌 Branch: {title} ({n} messages)`, expands to show branch conversation read-only, or "jump to branch" link

**Footer:** `MessageInput` centered, sends via `useNodeStream.sendMessage(currentNodeId, message)`

**Empty state (new tree, no nodes):** Centered title + input: "开始一个话题，探索你的知识"

### BranchTrigger

- Renders inside AI message, attached to each `<p>` element
- Semi-transparent `+` icon on paragraph right edge
- Hover: highlight + tooltip "展开此话题"
- Click: `createNode(currentNodeId, paragraphText)` → auto-navigate to new node

### BranchSummaryCard

- For each AI message in current node, checks if any child nodes have `selectedText` that is a substring of that message's content. If yes, renders a summary card below that message.
- Collapsed: `📌 分支：{selectedText} ({messageCount}条对话)` — inline, subtle
- Expanded: read-only document-style rendering of branch conversation
- "跳转到分支" link to navigate into the branch node

### Breadcrumb

- Uses `treeUtils.getAncestorChain(nodes, nodeId)` for path
- Root shows tree title, others show selectedText or first user message (20 chars)
- Each segment clickable → `setCurrentNode(ancestorId)`
- Small gray text, pinned to top of conversation area

### ParentQuoteCard

- Only shown for non-root nodes
- Displays `node.selectedText` in blockquote style (gray left border)
- Click jumps to parent node

## Data Model Changes

### Keep (no changes)

```typescript
Tree { id, title, createdAt, updatedAt }
TreeNode { id, treeId, parentId, selectedText, messages[], createdAt }
ChatMessage { id, role, content, createdAt }
```

### Remove from types

- `ThinkingIntent`, `QuickAction`, `ThinkingRequest`, `GeneratedSubtopic`
- TreeNode fields: `detailedContent`, `summary`, `intent`, `isAutoGenerated`, `feynmanInput`, `feynmanFeedback`
- Tree field: `intent`

Keep `title` on TreeNode — useful for display in TreeNav.

### Store changes

- **Remove:** `updateNodeContent`, `createNodesFromSubtopics`, `updateTreeIntent`
- **Add:** `getChildNodes(nodeId)` — returns direct child nodes

### treeUtils additions

- `buildTreeStructure(nodes)` — converts flat node array to nested tree for TreeNavPanel
- `getAncestorChain` already exists, reuse as-is

## Backend Changes

- `/api/chat` — **no changes**, fully reused
- `/api/thinking` route — **remove**
- `prompts.ts` — remove `THINKING_STRUCTURED`, `THINKING_EXPAND`, `QUICK_ACTION_PROMPTS`; keep base `thinking` prompt in `SYSTEM_PROMPTS`
- `index.ts` — remove thinking route registration

## File Changes Summary

### Remove

```
apps/client/src/components/MindMap/           # entire directory
apps/client/src/components/Thinking/          # entire directory
apps/client/src/hooks/useThinkingStream.ts
apps/server/src/routes/thinking.ts
```

### Create

```
apps/client/src/components/KnowledgeTree/
  ├── TreeNavPanel.tsx
  ├── TreeNavNode.tsx
  ├── Breadcrumb.tsx
  ├── ParentQuoteCard.tsx
  ├── BranchTrigger.tsx
  ├── BranchSummaryCard.tsx
  └── BranchConversationPanel.tsx
```

### Modify

```
packages/types/src/index.ts          # clean up structured fields
apps/client/src/store/treeStore.ts   # remove structured actions, add getChildNodes
apps/client/src/store/treeUtils.ts   # add buildTreeStructure
apps/client/src/App.tsx              # rewire thinking-tree view
apps/server/src/prompts.ts           # remove structured prompts
apps/server/src/index.ts             # remove thinking route
```

### Keep unchanged

```
apps/client/src/components/Chat/MessageInput.tsx
apps/client/src/components/TextSelectionPopup/
apps/client/src/hooks/useNodeStream.ts
apps/client/src/db/index.ts
apps/server/src/routes/chat.ts
```

## Key Reuse Points

| Existing code | Role in new design |
|---------------|-------------------|
| `useNodeStream` | Streams AI responses into node messages — core chat engine, zero changes |
| `treeStore` core CRUD | createTree, createNode, addMessage, etc. — all reused directly |
| `treeUtils.getAncestorChain` | Builds breadcrumb path |
| `treeUtils.getContextMessages` | Builds AI context from ancestor chain (existing behavior) |
| `TextSelectionPopup` | Precise text-selection branching — reused as-is |
| `MessageInput` | Chat input — reused as-is |
| `@tailwindcss/typography` prose | Document-style Markdown rendering — reused |
| `/api/chat` + `SYSTEM_PROMPTS.thinking` | Backend AI endpoint — zero changes |
| Dexie DB schema | All existing tree/node data compatible |

## Future Iterations (out of scope for MVP)

- Node right-click menu (rename, delete, star)
- AI-powered tree summary / export to Markdown
- Drag-and-drop node reordering
- Cross-tree references
- Mobile responsive (tree nav as slide-over)
- Knowledge card generation
