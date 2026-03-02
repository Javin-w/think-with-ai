# Think With AI — 思维导图 + AI 问答学习工具

## TL;DR

> **Quick Summary**: 构建一个树状 AI 对话学习工具。用户在和 AI 对话时，可以选中回复中的任意文本「分叉」出去深入探索，整个对话以思维导图形式可视化，形成知识树。
> 
> **Deliverables**:
> - 左右分屏 Web 应用：左侧思维导图导航，右侧对话面板
> - 树状对话系统：每个节点是一个多轮对话线程
> - 选中文本分叉：选中 AI 回复中的文本 → 浮窗「深入探索」→ 创建子节点
> - 流式 AI 输出：后端代理 OpenAI/Claude API，SSE 流式返回
> - 本地持久化：IndexedDB 保存所有对话树数据
> - 多话题支持：可创建多棵独立的知识树
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → 2 → 3 → 5 → 7 → 8 → 9 → 10

---

## Context

### Original Request
用户希望解决传统 AI chat 的线性对话痛点——聊天过程中遇到不了解的概念时无法分叉追问。解决方案是将对话以树状结构组织，配合思维导图可视化，形成一个探索式学习工具。

### Interview Summary
**Key Discussions**:
- 分叉交互 → 选中 AI 回复中的文本触发分叉（非节点按钮或 AI 自动提取）
- 可视化形式 → 左右分屏：左侧思维导图导航，右侧对话内容
- MVP 范围 → 核心体验优先，不做用户认证/支付/协作/导出
- 技术栈 → React + TypeScript + Node.js 全栈，Vite 构建
- 数据存储 → MVP 阶段 localStorage/IndexedDB，无数据库
- AI 模式 → 后端代理托管 API key，自用工具无需用户认证
- 视觉风格 → 简洁现代风（Notion/Linear 风格）
- 流式输出 → 需要 SSE 流式返回（打字机效果）
- 测试策略 → 不写单元测试，Playwright QA 验证

**Research Findings**:
- **ReactFlow** (`@xyflow/react` v12, 35k stars)：React 生态中树/图可视化的事实标准，官方提供 mind map tutorial
- **Dagre** (`@dagrejs/dagre`)：自动布局算法，20 行代码集成，ReactFlow 官方推荐
- **Hono**：比 Express 更适合 SSE 流式场景，内置 `streamSSE`，Web Standard API
- **Vercel AI SDK**：多模型统一接口，`streamText()` 处理流式输出，`@ai-sdk/openai` + `@ai-sdk/anthropic`
- **Dexie.js**：IndexedDB 最佳 React 集成，`useLiveQuery` 响应式查询
- **@floating-ui/react**：文本选中浮窗定位，`inline()` middleware 处理多行选择
- **Zustand**：状态管理首选，18M 周下载量，单 store 管理树状数据
- **Tailwind CSS v4**：零配置内容检测，Vite 原生插件，5x 更快构建
- **pnpm workspaces**：2 包 monorepo 最简方案，无需 Turborepo

### Metis Review
**Identified Gaps** (addressed):
- 数据模型歧义 → 明确：节点 = 多轮对话线程（非单个 Q&A 对），详见下方 Defaults Applied
- Context 传递规则 → 明确：分叉时传递选中文本 + 当前节点的完整对话历史
- 自由追问 vs 仅选中分叉 → 明确：输入框追问=继续当前节点对话，选中文本=创建分叉
- Markdown 渲染 → 锁定 react-markdown + remark-gfm + rehype-highlight，不做 LaTeX/Mermaid
- 多棵树支持 → 加入 MVP，数据模型上近乎零成本
- SSE 关键模式 → abort signal 传递、`Content-Encoding: none` header、`consumeStream` 模式
- 文本选中关键细节 → `onMouseDown={e.preventDefault()}` 防止选中坍塌、`range.cloneRange()` 防突变

---

## Work Objectives

### Core Objective
构建一个「树状 AI 对话」Web 应用，用户可以在对话中通过选中文本分叉探索子话题，所有对话以思维导图形式可视化，支持多棵独立知识树。

### Concrete Deliverables
- 完整的 pnpm monorepo 项目（apps/client + apps/server + packages/types）
- 左右分屏布局（35%/65%）：左侧 ReactFlow 思维导图，右侧对话面板
- 树状对话引擎：每个节点为独立多轮对话线程，支持分叉
- 文本选中分叉：选中 AI 回复文本 → 浮窗按钮 → 创建子节点
- SSE 流式 AI 代理：后端 Hono + Vercel AI SDK，支持 OpenAI/Claude
- IndexedDB 本地持久化：Dexie.js 存储所有树和节点数据
- 话题列表：创建/切换/管理多棵知识树
- 空状态引导：首次使用引导创建第一棵知识树

### Definition of Done
- [ ] `pnpm dev` 同时启动前后端，前端 localhost:5173，后端 localhost:3000
- [ ] 创建新话题 → 提问 → AI 流式回复 → 选中文本分叉 → 子节点对话 → 导图导航 全流程跑通
- [ ] 刷新页面后所有数据保留
- [ ] 配置 .env 中的 API key 即可使用，无需其他设置

### Must Have
- 树状对话数据模型（节点 = 多轮对话线程）
- 选中文本分叉交互（浮窗按钮）
- ReactFlow 思维导图可视化 + Dagre 自动布局
- SSE 流式 AI 输出（打字机效果）
- 多模型支持（OpenAI + Claude）
- IndexedDB 本地持久化
- 多棵知识树管理
- Markdown 渲染（GFM + 代码高亮）
- 分屏导航：点击导图节点切换右侧对话

### Must NOT Have (Guardrails)
- ❌ 用户认证 / 登录注册
- ❌ 付费体系 / 配额管理
- ❌ 暗色模式（仅亮色）
- ❌ 设置页面 UI（API key 通过 .env 配置）
- ❌ 导出/导入功能
- ❌ 分享/协作功能
- ❌ 搜索功能（跨树搜索）
- ❌ 节点拖拽重排（导图为只读布局）
- ❌ 键盘快捷键
- ❌ 移动端适配（桌面端优先，最小宽度 1024px）
- ❌ LaTeX / Mermaid 图表渲染
- ❌ AI 自动推荐分叉点
- ❌ 对话摘要生成
- ❌ Docker 容器化部署
- ❌ MiniMap 组件（ReactFlow 自带 pan/zoom 足够）
- ❌ AI SDK middleware（日志/限流/缓存）
- ❌ SSE 自定义 data 事件（仅流式文本）
- ❌ 自定义 tree layout 算法（用 Dagre）
- ❌ 自定义 AI provider 抽象（用 Vercel AI SDK）
- ❌ 自定义 markdown 渲染器（用 react-markdown）
- ❌ 抽象基类 / 工厂模式 / 过度封装
- ❌ 复杂加载状态（simple spinner 即可）
- ❌ Code block 内选中的语言类型检测
- ❌ 移动端/触摸文本选择处理

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: None (MVP 阶段不写单元测试)
- **Framework**: None
- **Primary QA**: Playwright browser automation + curl API 验证

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Data persistence**: Playwright — Create data → page.reload() → verify data preserved

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: Monorepo scaffolding + 全部依赖安装 [quick]
├── Task 2: 共享类型定义 + 数据模型 [quick]
├── Task 3: Dexie 数据库 + Zustand store [quick]
└── Task 4: 设计系统 tokens + 基础布局 [visual-engineering]

Wave 2 (After Wave 1 — 核心模块):
├── Task 5: 后端 AI 流式代理 API (depends: 2) [unspecified-high]
├── Task 6: 对话面板 UI + Markdown 渲染 (depends: 2, 3, 4) [visual-engineering]
└── Task 7: 对话面板接入流式 API (depends: 5, 6) [unspecified-high]

Wave 3 (After Wave 2 — 分叉 + 导图):
├── Task 8: 文本选中分叉交互 (depends: 7) [deep]
└── Task 9: ReactFlow 思维导图可视化 (depends: 3, 8) [visual-engineering]

Wave 4 (After Wave 3 — 整合 + QA):
├── Task 10: 话题列表 + 空状态 + 整合打磨 (depends: 9) [visual-engineering]
└── Task 11: 端到端 QA 验证 (depends: 10) [unspecified-high]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → 2 → 5 → 7 → 8 → 9 → 10 → 11
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1. Monorepo scaffolding | — | 2, 3, 4, 5, 6, 7 | 1 |
| 2. 共享类型定义 | 1 | 3, 5, 6 | 1 |
| 3. Dexie + Zustand | 1, 2 | 6, 9, 10 | 1 |
| 4. 设计系统 + 布局 | 1 | 6, 9, 10 | 1 |
| 5. 后端 AI 流式 API | 1, 2 | 7 | 2 |
| 6. 对话面板 UI | 2, 3, 4 | 7 | 2 |
| 7. 流式 API 接入 | 5, 6 | 8 | 2 |
| 8. 文本选中分叉 | 7 | 9 | 3 |
| 9. 思维导图可视化 | 3, 8 | 10 | 3 |
| 10. 话题列表 + 打磨 | 9 | 11 | 4 |
| 11. 端到端 QA | 10 | F1-F4 | 4 |
| F1-F4. Final review | 11 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1 (4 tasks)**: T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `visual-engineering`
- **Wave 2 (3 tasks)**: T5 → `unspecified-high`, T6 → `visual-engineering`, T7 → `unspecified-high`
- **Wave 3 (2 tasks)**: T8 → `deep`, T9 → `visual-engineering`
- **Wave 4 (2 tasks)**: T10 → `visual-engineering`, T11 → `unspecified-high`
- **FINAL (4 tasks)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Monorepo 项目脚手架 + 全部依赖安装

  **What to do**:
  - 初始化 pnpm monorepo 项目，创建 `pnpm-workspace.yaml` 指向 `apps/*` 和 `packages/*`
  - 创建 `apps/client/`：使用 `pnpm create vite@latest . -- --template react-ts` 初始化 Vite + React + TypeScript
  - 创建 `apps/server/`：初始化 Node.js + TypeScript 项目
  - 创建 `packages/types/`：共享类型包，`name: "@repo/types"`，直接导出 TS 源文件（无需编译）
  - 根 `package.json`：添加 `dev` script 使用 `concurrently` 同时启动前后端
  - 前端安装：`@xyflow/react`, `@dagrejs/dagre`, `react-markdown`, `remark-gfm`, `rehype-highlight`, `@floating-ui/react`, `dexie`, `dexie-react-hooks`, `zustand`, `tailwindcss`, `@tailwindcss/vite`
  - 后端安装：`hono`, `@hono/node-server`, `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
  - 开发工具：`concurrently`, `tsx`, `typescript` (root)
  - 配置 `tsconfig.base.json`（root）+ 各包 `tsconfig.json` 继承
  - 前端 `vite.config.ts`：配置 React plugin、Tailwind v4 plugin、`/api` 代理到后端 `localhost:3000`
  - 后端入口 `apps/server/src/index.ts`：Hono 实例 + health check endpoint `GET /api/health`
  - 创建 `.env.example`：`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_PROVIDER=openai`, `AI_MODEL=gpt-4o-mini`, `PORT=3000`
  - 创建 `.gitignore`：node_modules, dist, .env, .sisyphus/evidence

  **Must NOT do**:
  - 不装 Turborepo（2 包 monorepo 不需要）
  - 不装 ESLint/Prettier（MVP 不设 lint）
  - 不装 Docker 相关工具
  - 不写任何业务代码（仅脚手架和配置）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯脚手架配置任务，无复杂逻辑，但文件较多
  - **Skills**: []
    - 无需特殊技能，标准 Node.js 项目初始化

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 起始)
  - **Parallel Group**: Wave 1 — 此任务为所有后续任务的基础
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  - **Blocked By**: None (可立即开始)

  **References**:

  **Pattern References**:
  - pnpm workspace 配置模式参考：`pnpm-workspace.yaml` 使用 `packages: ['apps/*', 'packages/*']`
  - Vite 代理配置参考：`vite.config.ts` 中 `server.proxy['/api']` 指向后端

  **External References**:
  - Vite 官方 React 模板：`pnpm create vite@latest . -- --template react-ts`
  - Hono Node.js adapter：`@hono/node-server` 的 `serve()` 函数
  - Tailwind CSS v4 Vite 插件：`@tailwindcss/vite`（无需 postcss.config）
  - pnpm workspaces 文档：workspace:* 协议引用本地包

  **WHY Each Reference Matters**:
  - pnpm workspace 配置决定包之间如何引用（`@repo/types: workspace:*`）
  - Vite 代理配置让开发时前端请求自动转发到后端，避免 CORS 问题
  - Hono node-server adapter 是 Hono 在 Node.js 环境运行的必要桥接
  - Tailwind v4 使用 CSS-first 配置（`@theme` 指令），不需要 `tailwind.config.js`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 前端 dev server 启动
    Tool: Bash (curl)
    Preconditions: pnpm install 完成
    Steps:
      1. 在项目根目录执行 `pnpm dev`
      2. 等待 5 秒
      3. `curl -s http://localhost:5173` 获取 HTML
    Expected Result: 返回包含 `<div id="root">` 的 HTML
    Failure Indicators: 连接拒绝或 404
    Evidence: .sisyphus/evidence/task-1-client-dev.txt

  Scenario: 后端 health check
    Tool: Bash (curl)
    Preconditions: pnpm dev 正在运行
    Steps:
      1. `curl -s http://localhost:3000/api/health`
    Expected Result: 返回 JSON `{"status":"ok"}`
    Failure Indicators: 连接拒绝或非 JSON 响应
    Evidence: .sisyphus/evidence/task-1-server-health.txt

  Scenario: TypeScript 类型检查
    Tool: Bash
    Preconditions: 所有包已安装
    Steps:
      1. `pnpm -r typecheck`
    Expected Result: 0 errors（全部包通过）
    Failure Indicators: 任何 TS 编译错误
    Evidence: .sisyphus/evidence/task-1-typecheck.txt

  Scenario: 共享类型包引用
    Tool: Bash
    Preconditions: monorepo 结构完整
    Steps:
      1. 在 apps/client/src 中创建临时文件 import `@repo/types`
      2. 运行 `pnpm --filter client typecheck`
    Expected Result: import 解析成功，无类型错误
    Failure Indicators: Module not found 或类型错误
    Evidence: .sisyphus/evidence/task-1-shared-types-import.txt
  ```

  **Commit**: YES
  - Message: `chore(init): scaffold monorepo with pnpm workspaces`
  - Files: `pnpm-workspace.yaml, package.json, tsconfig.base.json, .gitignore, .env.example, apps/client/**, apps/server/**, packages/types/**`
  - Pre-commit: `pnpm -r typecheck`

- [ ] 2. 共享类型定义 + 数据模型设计

  **What to do**:
  - 在 `packages/types/src/index.ts` 中定义所有共享 TypeScript 接口
  - **核心数据模型**（节点 = 多轮对话线程模型）：
    ```typescript
    // 知识树
    interface Tree {
      id: string;           // crypto.randomUUID()
      title: string;        // 首个问题的前 60 字符
      createdAt: number;
      updatedAt: number;
    }
    
    // 树节点 = 一个对话线程
    interface TreeNode {
      id: string;           // crypto.randomUUID()
      treeId: string;       // 所属树
      parentId: string | null;  // null = 根节点
      selectedText: string | null;  // 触发此分叉的选中文本
      messages: ChatMessage[];  // 此节点的完整对话历史
      createdAt: number;
    }
    
    // 对话消息
    interface ChatMessage {
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: number;
    }
    
    // AI 流式请求
    interface StreamRequest {
      message: string;      // 用户当前输入
      context: ChatMessage[];  // 当前节点的历史对话
      provider?: string;    // 'openai' | 'anthropic'
      model?: string;       // 'gpt-4o-mini' | 'claude-sonnet-4-5' 等
    }
    ```
  - **Context 传递规则**：分叉时，新节点的第一条 user message = 选中文本。AI 接收的 context = 父节点的全部 messages（提供上下文）+ 当前节点的 messages
  - 所有 ID 使用 `crypto.randomUUID()`（string UUID），不使用自增 ID

  **Must NOT do**:
  - 不定义 UI 组件相关类型（放在各组件内部）
  - 不定义 API 路由类型（Hono 内部处理）
  - 不创建 class，仅用 interface/type

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义，无逻辑代码，单文件操作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4 after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 5, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - 类型包导出模式：`exports: { ".": { import: "./src/index.ts", types: "./src/index.ts" } }`
  - ChatGPT 内部分支对话数据结构：adjacency list + path reconstruction

  **External References**:
  - Vercel AI SDK 消息类型：`CoreMessage { role, content }` 模式
  - Dexie.js 表定义语法：`db.version(1).stores({ table: 'keyPath, index1, index2' })`

  **WHY Each Reference Matters**:
  - 类型包导出 TS 源文件（非编译后 .js）可以省去构建步骤，Vite 和 tsx 都能直接消费
  - ChatGPT 的分支对话用 adjacency list（parentId 指针），是经过验证的最佳实践
  - TreeNode.messages 数组结构与 AI SDK 的 CoreMessage 兼容，方便直接传给 streamText()

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 类型定义完整性
    Tool: Bash
    Preconditions: Task 1 完成
    Steps:
      1. `pnpm --filter @repo/types typecheck`
      2. 检查 packages/types/src/index.ts 导出了 Tree, TreeNode, ChatMessage, StreamRequest
    Expected Result: 编译通过，4 个核心接口全部导出
    Failure Indicators: 类型错误或缺少导出
    Evidence: .sisyphus/evidence/task-2-types-check.txt

  Scenario: 前后端均可引用共享类型
    Tool: Bash
    Preconditions: 类型包定义完成
    Steps:
      1. 在 apps/client/src/ 创建临时文件 import { Tree, TreeNode } from '@repo/types'
      2. 在 apps/server/src/ 创建临时文件 import { StreamRequest } from '@repo/types'
      3. 分别运行各包 typecheck
    Expected Result: 前后端都能正确解析共享类型，无错误
    Failure Indicators: Module not found 或类型不匹配
    Evidence: .sisyphus/evidence/task-2-cross-import.txt
  ```

  **Commit**: YES (group with Task 3)
  - Message: `feat(types): define shared tree and conversation types`
  - Files: `packages/types/src/index.ts`
  - Pre-commit: `pnpm -r typecheck`

- [ ] 3. Dexie 数据库 + Zustand 状态管理

  **What to do**:
  - 在 `apps/client/src/db/index.ts` 创建 Dexie 数据库定义：
    ```typescript
    db.version(1).stores({
      trees: 'id, updatedAt',
      nodes: 'id, treeId, parentId, [treeId+parentId], createdAt',
    });
    ```
  - 复合索引 `[treeId+parentId]` 用于高效查询某棵树的子节点
  - 在 `apps/client/src/store/treeStore.ts` 创建 Zustand store：
    - State: `trees: Tree[]`, `nodes: TreeNode[]`, `currentTreeId: string | null`, `currentNodeId: string | null`
    - Actions: `createTree()`, `createNode(parentId, selectedText?)`, `addMessage(nodeId, message)`, `setCurrentTree(id)`, `setCurrentNode(id)`, `loadTree(treeId)`
  - 在 `apps/client/src/store/treeUtils.ts` 创建树工具函数：
    - `getChildren(nodes, nodeId)` — 获取直接子节点
    - `getAncestorChain(nodes, nodeId)` — 从根到当前节点的路径
    - `getContextMessages(nodes, nodeId)` — 构建发送给 AI 的上下文消息链（父节点 messages + 当前节点 messages）
  - 在应用启动时调用 `navigator.storage.persist()` 防止 Safari 清除数据
  - Store actions 内部同时更新 Zustand state 和 Dexie 数据库（写入时同步）

  **Must NOT do**:
  - 不用 normalized state（保持扁平数组，用 ID 查找）
  - 不加 Zustand middleware/devtools
  - 不加 storage quota 监控（500 节点 << 浏览器限额）
  - 不写 React 组件（仅 store/db/utils）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯状态管理和数据层代码，无 UI 逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, after Tasks 1, 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6, 9, 10
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - Dexie 复合索引语法：`[field1+field2]` 在 stores 定义中
  - Zustand create 模式：`create<StoreType>((set, get) => ({ ... }))`

  **External References**:
  - Dexie.js 官方文档：Table Schema 和 compound index 语法
  - Zustand 官方文档：`create` 函数 + `set`/`get` 模式
  - `navigator.storage.persist()` MDN 文档：请求持久化存储

  **WHY Each Reference Matters**:
  - 复合索引是高效查询某棵树的某节点的子节点的关键，否则需要全表扫描
  - Zustand 的 set/get 模式决定了 actions 如何读写 state
  - Safari 会自动清除未 persist 的 IndexedDB 数据

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dexie 数据库创建和持久化
    Tool: Playwright
    Preconditions: 前端 dev server 运行
    Steps:
      1. 打开 localhost:5173
      2. 在浏览器控制台执行：
         await window.__db.trees.add({id: 'test-1', title: 'Test', createdAt: Date.now(), updatedAt: Date.now()})
      3. 执行：await window.__db.trees.get('test-1')
      4. 刷新页面
      5. 再次执行：await window.__db.trees.get('test-1')
    Expected Result: 步骤 3 和 5 都返回 {id: 'test-1', title: 'Test', ...}
    Failure Indicators: undefined 或 IndexedDB 错误
    Evidence: .sisyphus/evidence/task-3-dexie-persist.png

  Scenario: Zustand store CRUD 操作
    Tool: Playwright
    Preconditions: 前端 dev server 运行，应用已加载
    Steps:
      1. 通过控制台调用 store.createTree() → 获取 treeId
      2. store.createNode(treeId, null) → 获取 nodeId（根节点）
      3. store.addMessage(nodeId, {role:'user', content:'test'})
      4. 验证 store.getState().nodes 包含该节点
      5. 验证该节点的 messages 包含测试消息
    Expected Result: 所有 CRUD 操作正常，数据即存即取
    Failure Indicators: state 未更新或 Dexie 未同步
    Evidence: .sisyphus/evidence/task-3-zustand-crud.png
  ```

  **Commit**: YES (group with Task 2)
  - Message: `feat(store): add Dexie database and Zustand tree store`
  - Files: `apps/client/src/db/index.ts, apps/client/src/store/treeStore.ts, apps/client/src/store/treeUtils.ts`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 4. 设计系统 Tokens + 基础分屏布局

  **What to do**:
  - 在 `apps/client/src/index.css` 中定义 Tailwind v4 设计 tokens：
    ```css
    @import "tailwindcss";
    @theme {
      --color-brand: #6366f1;     /* Indigo-500 */
      --color-surface: #ffffff;
      --color-surface-secondary: #f8fafc;  /* Slate-50 */
      --color-border: #e2e8f0;    /* Slate-200 */
      --color-text-primary: #0f172a;  /* Slate-900 */
      --color-text-secondary: #64748b;  /* Slate-500 */
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --radius-md: 8px;
      --radius-lg: 12px;
    }
    ```
  - 创建 `apps/client/src/components/Layout.tsx`：左右分屏布局
    - 左侧面板 35% 宽度：思维导图容器（先显示 placeholder）
    - 右侧面板 65% 宽度：对话容器（先显示 placeholder）
    - 中间分割线：1px slate-200 border
    - 最小宽度 1024px，全屏高度 `h-screen`
  - 更新 `App.tsx` 使用 Layout 组件
  - 确保 Inter 字体通过 `<link>` 或 Google Fonts 加载

  **Must NOT do**:
  - 不做可拖拽调整宽度的 splitter（固定比例）
  - 不做响应式布局（最小 1024px）
  - 不加暗色模式
  - 不封装 Button/Card 等通用组件

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及 UI 布局和视觉设计
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 布局设计和 CSS 风格把控

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3 after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6, 9, 10
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Tailwind CSS v4 `@theme` 指令文档：定义设计 tokens 替代 tailwind.config.js
  - Inter 字体：https://rsms.me/inter/ 或 Google Fonts

  **WHY Each Reference Matters**:
  - Tailwind v4 的 @theme 是定义设计系统的新方式，替代了 tailwind.config.js
  - Inter 是 Notion/Linear 类产品的标配字体

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 分屏布局正确渲染
    Tool: Playwright
    Preconditions: 前端 dev server 运行
    Steps:
      1. 打开 localhost:5173，视窗宽度 1280px
      2. 检查 `[data-testid="left-panel"]` 存在且宽度约为视窗的 35%
      3. 检查 `[data-testid="right-panel"]` 存在且宽度约为视窗的 65%
      4. 检查两个面板之间有 1px 分割线
      5. 截图当前布局
    Expected Result: 左右分屏正确显示，占满全屏高度
    Failure Indicators: 面板重叠、不可见或比例错误
    Evidence: .sisyphus/evidence/task-4-layout.png

  Scenario: 设计 tokens 生效
    Tool: Playwright
    Preconditions: 前端 dev server 运行
    Steps:
      1. 打开 localhost:5173
      2. 检查 body 的 font-family 包含 'Inter'
      3. 检查背景色为 #ffffff
    Expected Result: 字体和颜色与设计 tokens 一致
    Failure Indicators: 默认字体或错误颜色
    Evidence: .sisyphus/evidence/task-4-tokens.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add design tokens and split-panel layout`
  - Files: `apps/client/src/index.css, apps/client/src/components/Layout.tsx, apps/client/src/App.tsx`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 5. 后端 AI 流式代理 API

  **What to do**:
  - 在 `apps/server/src/routes/chat.ts` 创建 `POST /api/chat` 流式端点：
    - 接受 `StreamRequest` body（message + context + provider + model）
    - 使用 Vercel AI SDK 的 `streamText()` 函数
    - 配置 provider registry：`createOpenAI({apiKey: env.OPENAI_API_KEY})` + `createAnthropic({apiKey: env.ANTHROPIC_API_KEY})`
    - 流式返回：使用 `result.toDataStreamResponse()` 返回 SSE 流
    - System prompt：`"你是一个乐于助人的学习助手。用清晰、条理分明的方式解释概念。支持 Markdown 格式化输出。"`
  - **关键 SSE 模式**（Metis 审查要求）：
    - 响应 header 包含 `Content-Encoding: none`（防止代理压缩破坏流）
    - 传递 abort signal：request abort → AbortController → streamText abortSignal → 取消上游 API 调用
  - 错误处理：
    - 无效 API key → 返回 JSON `{error: "Invalid API key"}` + 401 状态码
    - Provider 错误 → 返回 JSON `{error: message}` + 500 状态码
    - 不做重试/降级（MVP 单用户工具）
  - 在 `apps/server/src/index.ts` 中注册路由，添加 CORS 中间件（仅开发环境需要，Vite proxy 可以解决）
  - 从 `.env` 读取配置：AI_PROVIDER, AI_MODEL, OPENAI_API_KEY, ANTHROPIC_API_KEY

  **Must NOT do**:
  - 不加 AI SDK middleware（日志/限流/缓存）
  - 不发送自定义 data 事件（仅流式文本）
  - 不做请求验证库（基础类型检查即可）
  - 不做 rate limiting
  - 不抽象自定义 provider 层（直接用 AI SDK）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: SSE 流式代理有特定技术细节需要严格遵循
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - Vercel AI SDK `streamText` 函数签名：`streamText({ model, messages, system, abortSignal })`
  - Hono `streamSSE` 和直接返回 `Response` 的两种模式
  - AI SDK `toDataStreamResponse()` 输出标准 SSE 格式

  **External References**:
  - Vercel AI SDK 文档：`streamText()` API 参考
  - Hono 文档：CORS middleware 和 SSE streaming
  - OpenAI SDK：不直接使用，通过 `@ai-sdk/openai` 间接使用

  **WHY Each Reference Matters**:
  - AI SDK 的 `toDataStreamResponse()` 自动处理 SSE 格式、header 和编码，不需要手动拼接
  - Hono 使用 Web Standard Response，AI SDK 的输出可以直接返回，零适配层
  - abort signal 传递是防止用户取消后后端继续产生 token 费用的关键

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 流式请求正常返回
    Tool: Bash (curl)
    Preconditions: 后端运行，.env 配置有效 API key
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"message":"What is 2+2?","context":[]}' -N
      2. 观察 SSE 事件流
    Expected Result: 收到多个 SSE 数据块，内容包含 AI 回答
    Failure Indicators: 连接错误、非 SSE 格式、空响应
    Evidence: .sisyphus/evidence/task-5-stream-ok.txt

  Scenario: 无效 API key 错误处理
    Tool: Bash (curl)
    Preconditions: 后端运行，.env 中 API key 设为 'invalid-key'
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"message":"Hello","context":[]}' -w '\n%{http_code}'
    Expected Result: HTTP 401 状态码 + JSON 错误消息
    Failure Indicators: 500 错误、崩溃、无响应
    Evidence: .sisyphus/evidence/task-5-invalid-key.txt

  Scenario: 响应 header 正确
    Tool: Bash (curl)
    Preconditions: 后端运行
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"message":"Hi","context":[]}' -I
    Expected Result: Content-Type 包含 text/event-stream，含 Cache-Control: no-cache
    Failure Indicators: 错误的 Content-Type
    Evidence: .sisyphus/evidence/task-5-headers.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add AI streaming proxy with Hono and Vercel AI SDK`
  - Files: `apps/server/src/routes/chat.ts, apps/server/src/index.ts, .env.example`
  - Pre-commit: `curl localhost:3000/api/health`

- [ ] 6. 对话面板 UI + Markdown 渲染

  **What to do**:
  - 创建 `apps/client/src/components/Chat/ConversationPanel.tsx`：
    - 主容器，接受当前节点的 messages 并渲染
    - 滚动容器，消息列表向下滚动
    - 顶部显示当前节点信息（如果是分叉节点，显示「探索：{selectedText}」）
  - 创建 `apps/client/src/components/Chat/MessageBubble.tsx`：
    - user messages：右对齐，素色背景（slate-100），纯文本
    - assistant messages：左对齐，白色背景，使用 `react-markdown` 渲染
    - assistant 消息添加 `data-testid="assistant-message"` 属性（用于文本选中分叉）
    - Markdown 配置：`react-markdown` + `remark-gfm`（GFM）+ `rehype-highlight`（代码高亮）
    - 代码块样式：`font-mono, text-sm, bg-slate-50, rounded, p-3, overflow-x-auto`
  - 创建 `apps/client/src/components/Chat/MessageInput.tsx`：
    - 底部固定 textarea + 发送按钮
    - Enter 发送，Shift+Enter 换行
    - 发送时 disabled（防止流式过程中重复发送）
    - placeholder: "输入你的问题..."
  - 样式风格：Notion-like，白色背景，细微 border，`text-sm`，充足留白
  - 此任务仅做 UI 渲染，不接入后端 API（Task 7 接入）
  - 使用 mock 数据测试渲染（在组件内写死 2-3 条消息）

  **Must NOT do**:
  - 不封装 `<Button>` 组件（直接用 `<button>`）
  - 不加代码块复制按钮
  - 不加 LaTeX/Mermaid 渲染
  - 不做 loading skeleton（simple spinner）
  - 不接入后端 API（仅 UI）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 纯 UI 组件开发，需要视觉设计感
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Notion-like 视觉风格把控，Markdown 渲染样式

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3, 4

  **References**:

  **External References**:
  - react-markdown 文档：`<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>`
  - rehype-highlight：支持 highlight.js 的代码语法高亮
  - Tailwind v4 工具类：`text-sm`, `bg-slate-50`, `rounded-lg`

  **WHY Each Reference Matters**:
  - react-markdown 的 components prop 支持自定义渲染，可以给每个块添加 data-testid
  - rehype-highlight 自动处理代码块语言检测和高亮
  - assistant-message testid 是后续文本选中分叉的定位锡

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 消息渲染正确
    Tool: Playwright
    Preconditions: 前端 dev server 运行
    Steps:
      1. 打开 localhost:5173
      2. 检查对话面板显示 mock 消息
      3. 检查 user message 元素存在且右对齐
      4. 检查 `[data-testid="assistant-message"]` 存在
      5. 检查 assistant message 内的 Markdown 被渲染为 HTML（如 **bold** 变为 <strong>）
      6. 截图
    Expected Result: 用户和 AI 消息分别显示，Markdown 正确渲染
    Failure Indicators: 原始 Markdown 文本显示、布局错乱
    Evidence: .sisyphus/evidence/task-6-messages.png

  Scenario: 代码块渲染和高亮
    Tool: Playwright
    Preconditions: mock 数据包含代码块
    Steps:
      1. 检查 `pre > code` 元素存在
      2. 检查代码块有 `hljs` class（rehype-highlight 添加）
      3. 检查代码块背景色为 slate-50
    Expected Result: 代码块有语法高亮和正确样式
    Failure Indicators: 无高亮、样式缺失
    Evidence: .sisyphus/evidence/task-6-code-block.png

  Scenario: 输入框交互
    Tool: Playwright
    Preconditions: 前端 dev server 运行
    Steps:
      1. 在输入框中输入文本
      2. 按 Shift+Enter → 验证换行（不发送）
      3. 按 Enter → 验证触发发送事件（mock 版本可以看控制台日志）
    Expected Result: Shift+Enter 换行，Enter 发送
    Failure Indicators: Enter 也换行或两者行为相同
    Evidence: .sisyphus/evidence/task-6-input.png
  ```

  **Commit**: YES
  - Message: `feat(chat): add conversation panel with markdown rendering`
  - Files: `apps/client/src/components/Chat/ConversationPanel.tsx, MessageBubble.tsx, MessageInput.tsx`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 7. 对话面板接入流式 API

  **What to do**:
  - 创建 `apps/client/src/hooks/useNodeStream.ts` 自定义 hook：
    - 使用 `fetch` + `ReadableStream` 消费 SSE（不用 EventSource，因为需要 POST）
    - 状态：`content` (string), `isStreaming` (boolean), `error` (string | null)
    - 流式过程中实时更新 Zustand store 中对应节点的 assistant message content
    - 支持 abort：用户取消时调用 AbortController.abort()
  - 将 ConversationPanel 中的 mock 数据替换为真实数据：
    - 从 Zustand store 读取当前节点的 messages
    - 发送时：(1) 创建 user message 加入 store，(2) 调用 useNodeStream 发起流式请求，(3) 流式过程中更新 assistant message
    - context 构建：使用 `treeUtils.getContextMessages(nodes, currentNodeId)` 获取完整上下文
  - 流式指示器：`data-testid="streaming-indicator"` 在流式时显示，完成后消失
  - 自动滚动：流式过程中对话面板自动滚动到底部
  - 错误处理：API 错误作为系统消息显示在对话中（红色文本，不崩溃）
  - 如果是树的第一条消息，自动用问题前 60 字符更新 Tree.title

  **Must NOT do**:
  - 不用 Vercel AI SDK 客户端 `useChat` hook（它假设线性对话，不适合树状结构）
  - 不用 EventSource（仅支持 GET，我们需要 POST）
  - 不加消息编辑/删除功能

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: SSE 流解析 + 状态管理集成，有特定技术细节
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 5 和 6)
  - **Parallel Group**: Wave 2 (sequential after 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `fetch` + `ReadableStream` 消费 SSE 模式：`response.body.getReader()` + `TextDecoder` 读取流
  - Vercel AI SDK data stream 协议：`data: {type: "text-delta", delta: "..."}\n\n` 格式

  **External References**:
  - ReadableStream API MDN 文档：getReader() + read() 循环模式
  - Vercel AI SDK Data Stream Protocol 文档：了解服务端输出格式以正确解析

  **WHY Each Reference Matters**:
  - 不用 EventSource 因为它仅支持 GET，而我们的 chat API 需要 POST 发送 message body
  - AI SDK 的 data stream 协议有特定格式，客户端必须正确解析才能提取文本 delta

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 完整对话流程
    Tool: Playwright
    Preconditions: 前后端都在运行，有效 API key
    Steps:
      1. 打开 localhost:5173
      2. 在输入框输入 "什么是量子计算？"
      3. 按 Enter 发送
      4. 检查 `[data-testid="streaming-indicator"]` 出现
      5. 等待流式完成（indicator 消失），超时 30s
      6. 检查 `[data-testid="assistant-message"]` 存在且内容非空
    Expected Result: 用户消息显示，AI 流式回复完成，内容包含 Markdown 渲染
    Failure Indicators: 无响应、流式卡住、控制台错误
    Evidence: .sisyphus/evidence/task-7-full-chat.png

  Scenario: 流式过程自动滚动
    Tool: Playwright
    Preconditions: 前后端运行
    Steps:
      1. 发送一个会生成长回复的问题（如 "详细解释机器学习的历史和发展"）
      2. 在流式过程中观察滚动位置
    Expected Result: 对话面板在流式过程中自动滚动到底部
    Failure Indicators: 需要手动滚动才能看到新内容
    Evidence: .sisyphus/evidence/task-7-auto-scroll.png

  Scenario: 错误状态处理
    Tool: Playwright
    Preconditions: 后端 .env 中 API key 无效
    Steps:
      1. 发送任意消息
      2. 等待响应
      3. 检查对话中是否显示错误消息元素
      4. 检查控制台无未捕获异常
    Expected Result: 对话中显示友好的错误消息，应用不崩溃
    Failure Indicators: 白屏、未捕获异常、无错误提示
    Evidence: .sisyphus/evidence/task-7-error-handling.png
  ```

  **Commit**: YES
  - Message: `feat(stream): connect conversation panel to streaming API`
  - Files: `apps/client/src/hooks/useNodeStream.ts, apps/client/src/components/Chat/ConversationPanel.tsx`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 8. 文本选中分叉交互

  **What to do**:
  - 创建 `apps/client/src/components/TextSelectionPopup/TextSelectionPopup.tsx`：
    - 监听 `mouseup` 事件，检测 `window.getSelection()`
    - 判断选中是否在 `[data-testid="assistant-message"]` 内
    - 如果选中文本非空且在 assistant 消息内：
      - 使用 `range.cloneRange()` 保存选中范围（防止 live Range 突变）
      - 使用 `@floating-ui/react` 的 `useFloating` + `inline()` middleware 定位浮窗
      - 显示「🔍 深入探索」按钮
    - 浮窗按钮上必须 `onMouseDown={e.preventDefault()}`（用于防止点击时选中坡塞）
    - 点击「深入探索」后：
      1. 获取选中文本（strip markdown，用纯文本）
      2. 调用 `store.createNode(currentNodeId, selectedText)` 创建子节点
      3. 切换 `currentNodeId` 到新节点
      4. 自动生成并发送第一条消息："请详细解释：{selectedText}"（或允许用户编辑后发送）
      5. AI 流式回复开始（复用 Task 7 的 useNodeStream）
    - context 构建：父节点的全部 messages + 当前节点的 messages（通过 treeUtils.getContextMessages）
    - 关闭浮窗：点击外部或按 Escape
    - 代码块内选中：正常工作，用纯文本

  **Must NOT do**:
  - 不做代码块语言类型检测（全部当纯文本处理）
  - 不做反向选中方向检测（Range 自动归一化）
  - 不做触摸端文本选择处理
  - 不做 AI 自动推荐分叉点

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 文本选中 + 浮窗定位 + 树状态更新的复杂交互逻辑，是产品的核心差异化体验
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 浮窗 UX 设计和交互细节

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 7 的完整对话流程)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - Lexical editor 的 floating toolbar 模式：`getSelection()` + `getRangeAt(0)` + `getBoundingClientRect()`
  - `@floating-ui/react` 的 `inline()` middleware 处理多行选中定位

  **External References**:
  - @floating-ui/react 文档：`useFloating` + `inline` + `autoPlacement` 配置
  - MDN Selection API：`window.getSelection()`, `Range.cloneRange()`, `Range.getBoundingClientRect()`
  - Metis 审查要求：`onMouseDown={e.preventDefault()}` 防止选中坡塞是**必须的**

  **WHY Each Reference Matters**:
  - `range.cloneRange()` 是关键——原始 Range 对象在用户点击浮窗时会突变（选中坡塞），必须先克隆
  - `inline()` middleware 解决多行选中时浮窗定位在两行之间的问题
  - `e.preventDefault()` on mousedown 是防止浏览器收起选中的标准做法

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 选中文本显示探索按钮
    Tool: Playwright
    Preconditions: 完成一轮对话（有 AI 回复）
    Steps:
      1. 在 AI 回复文本中选中一段文字（使用 Playwright mouse drag 模拟选中）
      2. 检查 `[data-testid="explore-popup"]` 元素出现
      3. 检查按钮文本包含 "深入探索"
    Expected Result: 浮窗出现在选中区域附近
    Failure Indicators: 浮窗不出现、位置偏移过大
    Evidence: .sisyphus/evidence/task-8-popup-appear.png

  Scenario: 点击探索创建分叉
    Tool: Playwright
    Preconditions: 选中文本后浮窗已显示
    Steps:
      1. 点击 "深入探索" 按钮
      2. 等待新对话加载（streaming indicator 出现后消失）
      3. 检查右侧对话面板切换到新节点
      4. 检查新节点顶部显示「探索：{selectedText}」
      5. 检查 AI 回复内容与选中文本相关
    Expected Result: 分叉创建成功，新对话线程开始
    Failure Indicators: 无新节点、对话未切换、无 AI 回复
    Evidence: .sisyphus/evidence/task-8-branch-created.png

  Scenario: 关闭浮窗
    Tool: Playwright
    Preconditions: 浮窗已显示
    Steps:
      1. 按 Escape 键
      2. 检查 `[data-testid="explore-popup"]` 不再存在
    Expected Result: 浮窗消失，选中保留或清除都可接受
    Failure Indicators: 浮窗未消失
    Evidence: .sisyphus/evidence/task-8-dismiss.png
  ```

  **Commit**: YES
  - Message: `feat(branch): add text selection branching interaction`
  - Files: `apps/client/src/components/TextSelectionPopup/TextSelectionPopup.tsx`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 9. ReactFlow 思维导图可视化 + 导航

  **What to do**:
  - 创建 `apps/client/src/components/MindMap/MindMap.tsx`：
    - 使用 `@xyflow/react` 的 `<ReactFlow>` 组件
    - 从 Zustand store 读取当前树的所有节点，转换为 React Flow 的 nodes/edges
    - 使用 `@dagrejs/dagre` 计算 LR（左到右）布局：`rankdir: 'LR'`, `nodesep: 30`, `ranksep: 80`
    - 内置 `<Controls />` 组件提供 zoom/pan 控件
  - 创建 `apps/client/src/components/MindMap/MindMapNode.tsx` 自定义节点：
    - 显示截断的问题文本（前 50 字符 + 「…」）
    - 如果是分叉节点，显示 selectedText 而非问题文本
    - 当前活动节点：蓝色边框 (brand color) + 微影
    - 普通节点：白色背景，1px slate-200 边框，rounded-lg
    - 添加 `data-testid="mind-map-node"` 属性
    - **必须用 `React.memo` 包裹**（Metis 审查要求，否则 pan/zoom 性能严重下降）
  - 节点点击交互：
    - `onNodeClick` → `store.setCurrentNode(nodeId)` → 右侧对话面板更新
  - 树变化时自动重新布局：新节点创建后重新计算 Dagre 布局 + `fitView()`
  - 将 MindMap 组件嵌入 Layout.tsx 的左侧面板

  **Must NOT do**:
  - 不加 MiniMap 组件
  - 不加节点拖拽重排
  - 不加曲线边、动画过渡
  - 不加颜色编码深度、图标
  - 不自定义 layout 算法（用 Dagre）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 可视化组件，需要 ReactFlow 集成和样式设计
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 节点视觉设计和导图布局

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 8 的分叉逻辑)
  - **Parallel Group**: Wave 3 (after Task 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 3, 8

  **References**:

  **Pattern References**:
  - ReactFlow 官方 mind map tutorial + `xyflow/react-flow-mindmap-app` 示例仓库
  - Dagre 布局集成模式：`dagre.graphlib.Graph` + `setGraph/setNode/setEdge` + `dagre.layout(g)`
  - Cherry Studio 的 React Flow AI 对话树可视化实现

  **External References**:
  - ReactFlow 文档：Custon Nodes 、`onNodeClick` 、`fitView()` 、`<Controls />`
  - @dagrejs/dagre 文档：`rankdir`, `nodesep`, `ranksep` 配置项
  - ReactFlow Dagre layout 示例：https://reactflow.dev/examples/layout/dagre

  **WHY Each Reference Matters**:
  - ReactFlow 的官方 mind map tutorial 是完全匹配我们 use case 的参考实现
  - Dagre 的 LR layout 正好是思维导图横向扩展的布局方式
  - `React.memo` 包裹自定义节点是防止 pan/zoom 时所有节点重渲染的关键

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 单节点渲染
    Tool: Playwright
    Preconditions: 已创建一棵树并完成根节点对话
    Steps:
      1. 检查 `[data-testid="mind-map-node"]` 数量为 1
      2. 检查节点显示截断的问题文本
      3. 检查节点有蓝色边框（当前活动）
    Expected Result: 思维导图显示单个根节点，样式正确
    Failure Indicators: 无节点、文本缺失、样式错误
    Evidence: .sisyphus/evidence/task-9-single-node.png

  Scenario: 分叉后导图更新
    Tool: Playwright
    Preconditions: 根节点对话已完成
    Steps:
      1. 选中文本并点击“深入探索”
      2. 等待分叉创建完成
      3. 检查 `[data-testid="mind-map-node"]` 数量为 2
      4. 检查两个节点之间有连接线（`.react-flow__edge` 存在）
    Expected Result: 导图显示 2 个节点 + 1 条连接线，自动重新布局
    Failure Indicators: 节点数不对、无连接线、布局重叠
    Evidence: .sisyphus/evidence/task-9-branch-update.png

  Scenario: 节点点击导航
    Tool: Playwright
    Preconditions: 树有3+节点
    Steps:
      1. 点击导图上的根节点
      2. 检查右侧对话面板切换到根节点的对话内容
      3. 检查根节点获得蓝色边框，其他节点为普通样式
    Expected Result: 点击节点切换对话，活动节点视觉反馈正确
    Failure Indicators: 对话未切换、活动状态未变
    Evidence: .sisyphus/evidence/task-9-node-nav.png
  ```

  **Commit**: YES
  - Message: `feat(mindmap): add ReactFlow mind map with Dagre layout`
  - Files: `apps/client/src/components/MindMap/MindMap.tsx, MindMapNode.tsx, apps/client/src/components/Layout.tsx`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 10. 话题列表 + 空状态 + 整合打磨

  **What to do**:
  - 创建 `apps/client/src/components/TreeList/TreeList.tsx`：
    - 显示所有知识树列表（title + 创建时间）
    - 「新建知识树」按钮
    - 点击树 → 进入分屏视图（导图 + 对话）
    - 返回按钮：从分屏视图返回列表
  - 空状态设计：
    - 无树时：居中显示「开始你的第一次探索」+ CTA 按钮
    - 新树空对话：输入框自动 focus，placeholder 引导
  - 视图切换：Zustand state 驱动（`view: 'list' | 'tree'`），无路由库
  - 更新 App.tsx 整合所有视图切换逻辑
  - 最终打磨：
    - 所有 `data-testid` 属性就位
    - 所有页面状态转换流畅
    - IndexedDB 持久化端到端验证
    - 1024px 最小宽度布局不破碎

  **Must NOT do**:
  - 不加路由库（state 驱动视图切换）
  - 不加树的删除/重命名功能
  - 不加搜索功能
  - 不加动画/过渡效果

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件 + 视图切换 + 空状态设计
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 空状态设计和整体打磨

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 11
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - Zustand state-driven view：`{view: 'list' | 'tree'}` 替代路由

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 空状态引导
    Tool: Playwright
    Preconditions: 无任何知识树数据（清空 IndexedDB）
    Steps:
      1. 打开 localhost:5173
      2. 检查显示空状态引导文本
      3. 检查「新建知识树」CTA 按钮存在
      4. 点击 CTA 按钮
      5. 检查进入分屏视图，输入框自动 focus
    Expected Result: 空状态 → 新建 → 进入对话 流程顺畅
    Failure Indicators: 无空状态、CTA 无效、未进入对话
    Evidence: .sisyphus/evidence/task-10-empty-state.png

  Scenario: 多棵树切换
    Tool: Playwright
    Preconditions: 已创建 2 棵树，各有不同对话
    Steps:
      1. 从对话视图点击返回列表
      2. 检查 2 棵树显示在列表中
      3. 点击第二棵树
      4. 检查右侧对话显示第二棵树的内容
    Expected Result: 树切换正确，各树数据独立
    Failure Indicators: 数据混淆、切换失败
    Evidence: .sisyphus/evidence/task-10-tree-switch.png

  Scenario: 刷新持久化
    Tool: Playwright
    Preconditions: 已创建树并完成多节点对话
    Steps:
      1. 记录当前树列表和节点数量
      2. 执行 page.reload()
      3. 检查树列表与刷新前一致
      4. 进入树检查节点数量与刷新前一致
    Expected Result: 刷新后所有数据完整保留
    Failure Indicators: 数据丢失、节点缺失
    Evidence: .sisyphus/evidence/task-10-persist.png
  ```

  **Commit**: YES
  - Message: `feat(topics): add tree list, empty states, and view switching`
  - Files: `apps/client/src/components/TreeList/TreeList.tsx, apps/client/src/App.tsx, apps/client/src/store/treeStore.ts`
  - Pre-commit: `pnpm --filter client typecheck`

- [ ] 11. 端到端集成 QA 验证

  **What to do**:
  - 执行完整用户旅程的 Playwright E2E 测试：
    1. 打开应用 localhost:5173
    2. 看到空状态，点击「新建知识树」
    3. 输入 "什么是机器学习？" 并发送
    4. 等待 AI 流式回复完成
    5. 验证思维导图显示 1 个节点
    6. 在 AI 回复中选中 "神经网络" 文本
    7. 点击「深入探索」
    8. 验证导图显示 2 个节点 + 连接线
    9. 验证新对话线程开始流式回复
    10. 点击导图上的根节点，验证对话切换回根节点
    11. 刷新页面，验证所有数据保留
    12. 返回列表，验证树显示在列表中
  - 边界测试：
    - 无效 API key → 友好错误信息
    - 连续快速分叉 3 次 → 各分叉独立工作
    - 极长 AI 回复 → 滚动正常
  - 每个场景截图保存到 `.sisyphus/evidence/`

  **Must NOT do**:
  - 不修复代码（仅测试，发现问题记录不修）
  - 不写自动化测试文件（手动执行 Playwright 命令）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: E2E 测试需要严谨执行每个场景
  - **Skills**: [`playwright`]
    - `playwright`: 浏览器自动化测试执行

  **Parallelization**:
  - **Can Run In Parallel**: NO (最后一个实现任务)
  - **Parallel Group**: Wave 4 (after Task 10)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 10

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 完整用户旅程 E2E
    Tool: Playwright
    Preconditions: 前后端运行，有效 API key
    Steps:
      1-12: 如上述完整流程
    Expected Result: 所有 12 步验证通过，零控制台错误
    Failure Indicators: 任何步骤失败
    Evidence: .sisyphus/evidence/task-11-e2e-journey.png

  Scenario: 错误状态体验
    Tool: Playwright
    Preconditions: 后端 .env API key 无效
    Steps:
      1. 创建新树 → 发送消息
      2. 验证错误消息显示
      3. 验证应用不崩溃
    Expected Result: 友好错误提示，无白屏
    Evidence: .sisyphus/evidence/task-11-error-state.png

  Scenario: 多分叉压力测试
    Tool: Playwright
    Preconditions: 前后端运行
    Steps:
      1. 创建根节点对话
      2. 从 AI 回复中连续分叉 3 次
      3. 验证导图显示 4 个节点
      4. 验证各节点可独立导航
    Expected Result: 多分叉正常工作，导图布局合理
    Evidence: .sisyphus/evidence/task-11-multi-branch.png
  ```

  **Commit**: YES
  - Message: `test(e2e): complete end-to-end verification with evidence`
  - Files: `.sisyphus/evidence/task-11-*.png`
  - Pre-commit: none

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify no wrapper components where native elements suffice.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (branching → mind map update → navigation). Test edge cases: empty state, invalid API key, rapid branching, long AI responses. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `chore(init): scaffold monorepo with pnpm workspaces` — all config files
- **Task 2**: `feat(types): define shared tree and conversation types` — packages/types/
- **Task 3**: `feat(store): add Dexie database and Zustand store` — apps/client/src/store/, apps/client/src/db/
- **Task 4**: `feat(ui): add design tokens and split-panel layout` — apps/client/src/App.tsx, index.css, components/Layout
- **Task 5**: `feat(api): add AI streaming proxy with Hono + Vercel AI SDK` — apps/server/src/
- **Task 6**: `feat(chat): add conversation panel with markdown rendering` — apps/client/src/components/Chat/
- **Task 7**: `feat(stream): connect conversation panel to streaming API` — apps/client/src/hooks/useNodeStream.ts
- **Task 8**: `feat(branch): add text selection branching interaction` — apps/client/src/components/TextSelectionPopup/
- **Task 9**: `feat(mindmap): add ReactFlow mind map with Dagre layout` — apps/client/src/components/MindMap/
- **Task 10**: `feat(topics): add tree list, empty states, and polish` — apps/client/src/components/TreeList/
- **Task 11**: `test(e2e): add full end-to-end Playwright verification` — evidence files

---

## Success Criteria

### Verification Commands
```bash
pnpm dev                          # Expected: both apps start, client on 5173, server on 3000
curl localhost:3000/api/health    # Expected: {"status":"ok"}
pnpm typecheck                    # Expected: 0 errors
```

### Final Checklist
- [ ] 完整创建 → 提问 → 流式回复 → 选中分叉 → 导图导航 流程跑通
- [ ] 刷新页面后所有数据保留
- [ ] 多棵知识树可独立创建和切换
- [ ] 无效 API key 时显示友好错误信息
- [ ] 最小宽度 1024px 布局不破碎
- [ ] 所有 "Must Have" 已实现
- [ ] 所有 "Must NOT Have" 未出现在代码中
