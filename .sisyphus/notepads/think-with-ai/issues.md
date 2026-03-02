# Think With AI — Known Issues

## BUG-001: ConversationPanel Dead-End After "开始探索" CTA

**Severity**: Critical (blocks primary user flow)
**Found in**: Task 11 (E2E QA)
**Status**: Open

### Description
When a user clicks the "开始探索" CTA button on the empty state (list view), `handleCreateTree()` in `App.tsx` sets `currentTreeId: null`, `currentNodeId: null`, and `nodes: []`, then switches view to `'tree'`. However, `ConversationPanel.tsx` (lines 27-33) returns early with just text "选择或创建一个话题开始探索" when `nodeId` is null — **without rendering the `MessageInput` component**. This means the user cannot type their first message, creating a dead-end.

### Expected Behavior
After clicking "开始探索", the user should see the tree view with an input box where they can type their first question. The first message should trigger `createTree()` + `sendMessage()`.

### Actual Behavior
After clicking "开始探索", the tree view shows but the conversation panel only displays "选择或创建一个话题开始探索" text with no input. The user is stuck.

### Root Cause
`ConversationPanel` has two empty states:
1. `nodeId === null` → Returns text only (no input) — **this is the bug path**
2. `nodeId !== null` but no messages → Returns text + `MessageInput` — **this is the intended path**

The `handleCreateTree()` function doesn't create a tree/node upfront, so `nodeId` remains null after navigation.

### Files Affected
- `apps/client/src/App.tsx` — `handleCreateTree()` (line ~60)
- `apps/client/src/components/Chat/ConversationPanel.tsx` — early return (lines 27-33)

### Suggested Fix Options
1. **Option A**: Show `MessageInput` even when `nodeId` is null, and create tree+node on first message send
2. **Option B**: Have `handleCreateTree()` create a tree and root node immediately before switching to tree view
3. **Option C**: Add a separate "new conversation" input state in ConversationPanel for the `nodeId === null` case

### Workaround
Create tree and node programmatically via `window.__db` (Dexie), then navigate back to list and click the tree item.
