# Think With AI - Learnings

## [Task 1] Monorepo Scaffolding

### Completion Status
✅ COMPLETE

### Key Achievements
- pnpm install completed successfully (267 packages installed)
- Client dev server: localhost:5173 ✓
- Server health endpoint: localhost:3000/api/health ✓
- TypeScript typecheck: PASS (0 errors)
- @repo/types workspace package working correctly

### Package Versions Installed
- typescript: 5.9.3
- concurrently: 9.2.1
- vite: 6.0.0
- react: 19.0.0
- react-dom: 19.0.0
- hono: 4.6.0
- @hono/node-server: 1.13.0
- tailwindcss: 4.0.0
- @tailwindcss/vite: 4.0.0

### Issues Encountered & Resolutions

#### Issue 1: tsconfig.node.json composite flag
**Problem**: TypeScript complained about referenced project needing "composite": true
**Resolution**: Removed the references field from main tsconfig.json and simplified the configuration. The node config doesn't need to be referenced for typecheck-only builds.

#### Issue 2: allowImportingTsExtensions
**Problem**: TypeScript complained about importing .tsx files
**Resolution**: Added `"allowImportingTsExtensions": true` to client tsconfig.json compilerOptions

### Monorepo Structure Verified
```
think_with_ai/
├── pnpm-workspace.yaml ✓
├── package.json (root) ✓
├── tsconfig.base.json ✓
├── .gitignore ✓
├── .env.example ✓
├── apps/
│   ├── client/ (Vite + React + TypeScript) ✓
│   └── server/ (Hono + Node.js) ✓
└── packages/
    └── types/ (Shared TypeScript types) ✓
```

### Commands Verified
- `pnpm install` - ✓ Works
- `pnpm dev` - ✓ Starts both client and server concurrently
- `pnpm -r typecheck` - ✓ All packages pass
- `curl localhost:3000/api/health` - ✓ Returns `{"status":"ok"}`
- `curl localhost:5173` - ✓ Returns HTML with 200 status

### Next Steps (Task 2)
- Define shared types in @repo/types
- Implement core business logic
- Add database integration (Dexie for client, server persistence)

## [Task 2] Shared TypeScript Interfaces

### Completion Status
✅ COMPLETE

### Key Achievements
- Defined 4 core interfaces in `packages/types/src/index.ts`:
  - `Tree`: Root container for conversation branches
  - `TreeNode`: Individual node with parent/child relationships
  - `ChatMessage`: Single message with role and content
  - `StreamRequest`: AI provider request with context
- All interfaces properly exported with `export interface`
- TypeScript typecheck: PASS (0 errors)
- Evidence saved to `.sisyphus/evidence/task-2-types-check.txt`

### Interface Design Rationale
- **Tree**: Minimal metadata (id, title, timestamps) for conversation containers
- **TreeNode**: Supports branching via `parentId` (null = root), tracks `selectedText` for branch context
- **ChatMessage**: Simple role-based structure ('user' | 'assistant') for conversation history
- **StreamRequest**: Includes optional `provider` and `model` for flexible AI integration

### Context Passing Pattern
- `TreeNode.messages`: Array of all messages in that node
- `StreamRequest.context`: Parent node's full message history passed to AI
- This enables proper conversation context when branching from selected text

### No Build Step Required
- `packages/types/package.json` exports `./src/index.ts` directly
- Vite and tsx consume TypeScript directly
- `allowImportingTsExtensions: true` in client tsconfig.json handles .ts imports

### Next Steps (Task 3)
- Implement core business logic (tree creation, branching, message handling)
- Add database integration (Dexie for client, server persistence)

## [Task 4] Design Tokens & Split-Panel Layout

### Completion Status
✅ COMPLETE

### Key Achievements
- Tailwind v4 `@theme` design tokens defined in `apps/client/src/index.css`
- Inter font loaded via Google Fonts `<link>` in `index.html` (with preconnect)
- `Layout.tsx` component with 35/65 split-panel using `flex-[35]`/`flex-[65]`
- Both panels independently scrollable with `overflow-auto`
- TypeScript typecheck: PASS (0 errors)
- Playwright verification: layout renders at correct dimensions

### Tailwind v4 @theme Pattern
- Uses CSS-first `@theme { }` block — NO `tailwind.config.js`
- Custom tokens become utility classes automatically (e.g., `bg-surface`, `text-text-primary`)
- Nested token names use hyphens: `--color-text-primary` → `text-text-primary`
- `--font-sans` overrides the default `font-sans` utility

### Layout Dimensions (Verified via Playwright)
- Left panel: ~420px (33% of 1280px viewport) — `flex-[35]`
- Right panel: ~779px (61% of 1280px viewport) — `flex-[65]`
- 1px divider between panels using `w-px bg-border`
- Full viewport height with `h-screen`
- Minimum width: `min-w-[1024px]`

### Design Decisions
- Used `flex-[N]` instead of `w-[35%]` for proportional sizing — more robust with divider
- Left panel `bg-surface-secondary` (#f8fafc), right panel `bg-surface` (#ffffff)
- Both panels accept `ReactNode` props for future content injection
- `data-testid` attributes added for testing

### Notes
- `.sisyphus/evidence/` is gitignored — evidence files are local only
- Inter font weights: 400, 500, 600, 700 loaded
- The subtle color difference between panels is intentional (Notion/Linear aesthetic)

## [Task 3] Dexie Database & Zustand Store

### Completion Status
✅ COMPLETE

### Key Achievements
- Created `apps/client/src/db/index.ts` with Dexie database class
  - `trees` table with indexes: `id, updatedAt`
  - `nodes` table with indexes: `id, treeId, parentId, [treeId+parentId], createdAt`
  - Compound index `[treeId+parentId]` enables efficient child node queries
  - Exposed `db` singleton for use throughout app
  - Added `navigator.storage.persist()` for Safari IndexedDB persistence
  - Window debug hook: `window.__db` for dev console access
- Created `apps/client/src/store/treeUtils.ts` with tree traversal utilities
  - `getChildren()`: Find direct children of a node
  - `getAncestorChain()`: Build path from root to node (inclusive)
  - `getContextMessages()`: Assemble full context for AI (parent messages + current node messages)
- Created `apps/client/src/store/treeStore.ts` with Zustand store
  - State: `trees`, `nodes`, `currentTreeId`, `currentNodeId`, `view`
  - Actions: `loadTrees`, `loadTree`, `createTree`, `createNode`, `addMessage`, `updateLastMessage`, `updateTreeTitle`, `setCurrentTree`, `setCurrentNode`, `setView`
  - All actions write to BOTH Dexie AND Zustand state simultaneously (no separate sync)
  - Uses `crypto.randomUUID()` for all IDs (string UUIDs)
- TypeScript typecheck: PASS (0 errors)
- Evidence saved to `.sisyphus/evidence/task-3-typecheck.txt`
- Committed with message: `feat(store): add Dexie database and Zustand tree store`

### Design Decisions

#### Dexie Indexing Strategy
- Primary index on `id` (auto-indexed by Dexie)
- `updatedAt` on trees for sorting by recency
- Compound index `[treeId+parentId]` on nodes for efficient child queries
- `createdAt` on nodes for chronological ordering within a tree

#### Store State Shape
- Flat arrays (`trees[]`, `nodes[]`) instead of normalized state
- ID-based lookups via `.find()` — simple and sufficient for this app scale
- `view: 'list' | 'tree'` drives UI switching (no router library)
- `currentTreeId` and `currentNodeId` track user's position

#### Message Handling Pattern
- `addMessage()`: Appends new message to node's array
- `updateLastMessage()`: Updates the last message's content (for streaming)
- Streaming flow: add empty assistant message → update content as chunks arrive
- `getContextMessages()` builds full context chain for AI requests

#### Dual-Write Pattern
- Every action writes to Dexie first (persistence)
- Then updates Zustand state (UI reactivity)
- No separate sync step — state is always consistent
- Dexie is source of truth; Zustand is cache

### No New Dependencies
- `dexie` and `zustand` already installed in Task 1
- No additional npm packages needed

### Next Steps (Task 4+)
- Implement React hooks for store integration (useTreeStore, useLiveQuery)
- Build UI components (TreeList, TreeView, ChatPanel)
- Integrate with AI streaming API


## [Task 5] AI Streaming Proxy Endpoint

### Completion Status
✅ COMPLETE

### Key Achievements
- Created `apps/server/src/routes/chat.ts` with POST /api/chat streaming endpoint
- Registered route in `apps/server/src/index.ts` via `app.route('/api/chat', chat)`
- Updated dev script to `tsx watch --env-file=../../.env src/index.ts` (no dotenv dep needed)
- TypeScript typecheck: PASS (0 errors)
- Evidence saved to `.sisyphus/evidence/task-5-typecheck.txt`

### Implementation Details
- Uses Vercel AI SDK `streamText()` with `toDataStreamResponse()` for SSE
- Supports both OpenAI and Anthropic providers, selected via `provider` field or `AI_PROVIDER` env var
- Default model: `gpt-4o-mini` (overridable via `model` field or `AI_MODEL` env var)
- Context history passed as messages array (role cast to 'user' | 'assistant')
- System prompt in Chinese: learning assistant with Markdown output
- `Content-Encoding: none` header prevents proxy compression breaking SSE stream
- Abort signal wired: client disconnect → AbortController → streamText abort
- Error handling: 401 for invalid API key, 500 for other errors

### SSE Stream Pattern (Vercel AI SDK + Hono)
- `streamText()` returns a result object (not a promise — it's lazy)
- `result.toDataStreamResponse()` returns a Web Standard `Response` with SSE headers
- Hono accepts Web Standard Response directly — zero adapter needed
- Headers must be copied to new `Headers()` to add custom ones (Content-Encoding, CORS)

### Env Loading Strategy
- No dotenv dependency — uses Node.js `--env-file` flag via tsx
- Dev script: `tsx watch --env-file=../../.env src/index.ts`
- .env file at project root: `../../.env` relative to `apps/server/`

### Next Steps
- Build React chat UI components that consume this streaming endpoint
- Integrate with Zustand store for message state management


## [Task 6] Conversation Panel UI with Markdown Rendering

### Completion Status
✅ COMPLETE

### Key Achievements
- Created `apps/client/src/components/Chat/MessageBubble.tsx` — renders user/assistant messages
- Created `apps/client/src/components/Chat/MessageInput.tsx` — textarea with auto-resize + send
- Created `apps/client/src/components/Chat/ConversationPanel.tsx` — full chat container with mock data
- Updated `apps/client/src/App.tsx` — wires ConversationPanel into right panel
- Added `highlight.js/styles/github.css` import in `main.tsx` for code block syntax highlighting
- TypeScript typecheck: PASS (0 errors)
- Playwright screenshot: `.sisyphus/evidence/task-6-messages.png`

### Component Architecture
- **MessageBubble**: User messages → right-aligned slate bg; Assistant messages → left-aligned white with markdown
- **MessageInput**: Auto-resizing textarea, Enter to send, Shift+Enter for newline, disabled state support
- **ConversationPanel**: Scrollable message list + input, streaming indicator (bounce dots), optional header for selectedText
- Mock messages show markdown features: bold, headings, ordered lists, fenced code blocks (Python)

### Markdown Rendering Stack
- `react-markdown` v9 for base rendering
- `remark-gfm` for GFM extensions (tables, strikethrough, task lists)
- `rehype-highlight` for syntax-highlighted code blocks
- `highlight.js/styles/github.css` for code block theme
- Custom `code` component distinguishes inline vs block code via `className?.includes('language-')`
- Custom `pre` component adds rounded corners and overflow handling

### Critical Implementation Details
- `data-testid="assistant-message"` on assistant bubbles — used by Task 8 for text selection branching
- Mock MOCK_MESSAGES constant with Chinese content for visual testing
- Streaming indicator with 3 bouncing dots (staggered animationDelay: 0, 150, 300ms)
- `highlight.js` needed explicit install as peer dep of rehype-highlight (not auto-installed in pnpm strict mode)

### Design Tokens Used
- `text-text-primary`, `text-text-secondary` for typography
- `bg-surface`, `bg-surface-secondary` for backgrounds
- `border-border` for dividers and borders
- `bg-brand` for send button, `focus:ring-brand` for input focus
- `prose prose-sm` for markdown content typography baseline

### Next Steps
- Task 7: Wire ConversationPanel to Zustand store + streaming API
- Task 8: Text selection → branching from assistant messages