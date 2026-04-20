# Think With AI — 项目规范

## WHAT：项目概述

**Think With AI** 是一个全栈 AI 助手应用，核心特色是**树状思维导图对话**——用户可以在对话中选中文本创建分支节点，以非线性方式探索问题。同时集成文档生成、原型开发和新闻聚合等 AI 工作流模块。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5.7 |
| 构建工具 | Vite 6 |
| 样式 | Tailwind CSS 4（@tailwindcss/vite） |
| 状态管理 | Zustand 5 |
| 本地存储 | Dexie 4（IndexedDB） |
| 思维导图 | @xyflow/react 12 + dagre 自动布局 |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| 后端框架 | Hono 4（Node.js） |
| AI SDK | Vercel AI SDK 4 + @ai-sdk/openai + @ai-sdk/anthropic |
| RSS 解析 | fast-xml-parser |
| 包管理 | pnpm workspace（monorepo） |
| 运行时 | Node.js 22 |

### 目录结构

```
think_with_ai/
├── apps/
│   ├── client/                     # React 前端 SPA
│   │   ├── src/
│   │   │   ├── components/         # React 组件（按功能模块分目录）
│   │   │   │   ├── Chat/           # 聊天：消息气泡、输入框、对话面板
│   │   │   │   ├── MindMap/        # 思维导图可视化（ReactFlow）
│   │   │   │   ├── Doc/            # 文档生成模块
│   │   │   │   ├── Prototype/      # 原型生成模块
│   │   │   │   ├── News/           # 新闻聚合模块
│   │   │   │   ├── Homepage/       # 主页 + 最近列表
│   │   │   │   ├── TreeList/       # 思考树列表
│   │   │   │   ├── TopNav/         # 顶部导航栏
│   │   │   │   ├── TextSelectionPopup/ # 文本选择分支弹窗
│   │   │   │   └── ChatPreview/    # 聊天预览
│   │   │   ├── store/              # Zustand 状态管理
│   │   │   │   ├── appStore.ts     # 全局视图状态
│   │   │   │   ├── treeStore.ts    # 对话树 CRUD + 节点操作
│   │   │   │   ├── chatSessionStore.ts # 文档/原型会话（工厂模式）
│   │   │   │   ├── newsStore.ts    # 新闻列表状态
│   │   │   │   └── treeUtils.ts    # 树操作工具函数
│   │   │   ├── hooks/              # 自定义 hooks
│   │   │   │   ├── useChatStream.ts   # 通用聊天流（文档/原型）
│   │   │   │   └── useNodeStream.ts   # 树节点流（思考模式）
│   │   │   ├── db/index.ts         # Dexie 数据库定义
│   │   │   ├── App.tsx             # 主组件 + 路由逻辑
│   │   │   ├── main.tsx            # 入口
│   │   │   └── index.css           # Tailwind 自定义主题
│   │   └── vite.config.ts          # Vite 配置（含 /api 代理）
│   │
│   └── server/                     # Hono 后端
│       └── src/
│           ├── routes/
│           │   ├── chat.ts         # POST /api/chat（流式 AI 对话）
│           │   └── news.ts         # GET/POST /api/news（新闻聚合）
│           ├── news/               # 新闻子模块
│           │   ├── sources.ts      # RSS 源配置（8 个源）
│           │   ├── fetcher.ts      # RSS 批量抓取 + 解析
│           │   ├── summarizer.ts   # AI 摘要生成
│           │   └── cache.ts        # 内存缓存（30 分钟 TTL）
│           ├── providers.ts        # AI 模型初始化
│           ├── prompts.ts          # 系统提示词（thinking/document/prototype）
│           └── index.ts            # Hono 服务器入口
│
├── packages/
│   └── types/src/index.ts          # 共享 TypeScript 类型定义
│
├── .env.example                    # 环境变量模板
├── pnpm-workspace.yaml             # pnpm 工作空间配置
└── tsconfig.base.json              # 根 TypeScript 配置
```

---

## WHY：模块职责与设计决策

### 前端模块职责

| 模块 | 职责 |
|------|------|
| `store/appStore` | 全局视图切换（home / thinking-list / thinking-tree / news / doc / prototype） |
| `store/treeStore` | 对话树和节点的 CRUD，连接 Dexie 持久化 |
| `store/chatSessionStore` | 工厂函数，为 doc 和 prototype 各生成独立 store |
| `hooks/useNodeStream` | 树节点的流式消息处理：构建祖先链上下文 → 请求 → 逐 chunk 更新 |
| `hooks/useChatStream` | 文档/原型模块的通用流式处理 |
| `components/MindMap` | ReactFlow + dagre 自动布局，可视化对话分支结构 |
| `components/TextSelectionPopup` | 选中消息文本时弹出"创建分支"按钮 |
| `db/index.ts` | Dexie 数据库（trees / nodes / chatSessions 三张表），支持版本迁移 |

### 后端模块职责

| 模块 | 职责 |
|------|------|
| `routes/chat` | 统一的流式 AI 聊天端点，支持三种模式和多个 AI 提供者 |
| `routes/news` | 新闻 API，缓存优先 + 后台异步刷新 |
| `news/sources` | RSS 源配置，含 RSSHub 代理 Twitter/X |
| `news/fetcher` | 并行抓取多 RSS 源，支持 RSS 2.0 和 Atom 格式 |
| `news/summarizer` | AI 批量摘要（3 篇/批，避免 API 限流） |
| `news/cache` | 简单 Map 缓存，TTL 30 分钟 |
| `providers` | AI 模型工厂（OpenAI / Anthropic / Moonshot） |
| `prompts` | 三种模式的系统提示词定义 |

### 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 状态管理 | Zustand | 极简 API，无 boilerplate，适合中小型应用 |
| 本地存储 | Dexie (IndexedDB) | 浏览器离线能力，类 SQL 查询接口，支持版本迁移 |
| 思维导图 | ReactFlow + dagre | ReactFlow 提供交互能力，dagre 自动布局有向无环图 |
| 后端框架 | Hono | 轻量（~14KB），原生支持 Web Standard API，性能优秀 |
| AI 流式 | Vercel AI SDK | 统一封装多 provider 的流式响应，自动 SSE 序列化 |
| 新闻缓存 | 内存 Map | 单实例部署足够，无需引入 Redis 等外部依赖 |
| Monorepo | pnpm workspace | 原生工作空间支持，共享类型包，无需额外工具 |

---

## HOW：开发指南

### 环境变量

复制 `.env.example` 到 `.env` 并填入 API Key：

```bash
cp .env.example .env
```

必要变量：
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `MOONSHOT_API_KEY`（至少一个）
- `AI_PROVIDER`：默认 AI 提供者（moonshot / openai / anthropic）
- `AI_MODEL`：默认模型名
- `PORT`：后端端口（默认 3066）

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

同时启动：
- 前端 Vite：http://localhost:5173（HMR 热重载）
- 后端 tsx watch：http://localhost:3066（文件变更自动重启）
- Vite 代理 `/api` 请求到后端

### 类型检查

```bash
pnpm typecheck    # 全工作空间 TypeScript 检查
```

### 生产构建

```bash
pnpm build        # 先构建 types 包，再构建前端 → apps/client/dist/
```

### 测试

<!-- 暂无测试框架配置 -->

### 部署（阿里云 ECS）

#### 服务器信息

| 项目 | 值 |
|------|------|
| ECS IP | `47.111.169.246` |
| SSH Key | `~/.ssh/ecs_deploy`（无密码） |
| 部署路径 | `/home/think-with-ai` |
| Node 版本 | v20 |
| 访问地址 | `http://47.111.169.246:5173` |
| 安全组已开放端口 | 5173（TCP） |

#### SSH 连接

```bash
ssh -i ~/.ssh/ecs_deploy root@47.111.169.246
```

#### 部署流程

```bash
# 1. 本地构建
pnpm build

# 2. 打包上传（排除 node_modules 和 .env）
tar czf /tmp/think-with-ai.tar.gz --exclude=node_modules --exclude=.env -C /Users/bytedance/Desktop think_with_ai
scp -i ~/.ssh/ecs_deploy /tmp/think-with-ai.tar.gz root@47.111.169.246:/tmp/

# 3. ECS 上解压并替换（保留 .env 和 node_modules）
ssh -i ~/.ssh/ecs_deploy root@47.111.169.246 "
  cd /home/think-with-ai &&
  tar xzf /tmp/think-with-ai.tar.gz -C /tmp &&
  rsync -a --exclude=node_modules --exclude=.env --exclude=data /tmp/think_with_ai/ /home/think-with-ai/ &&
  rm -rf /tmp/think_with_ai /tmp/think-with-ai.tar.gz &&
  pnpm install --frozen-lockfile &&
  echo 'deploy done'
"

# 4. 重启服务
ssh -i ~/.ssh/ecs_deploy root@47.111.169.246 "
  cd /home/think-with-ai &&
  pkill -f 'tsx.*src/index.ts' || true &&
  nohup pnpm --filter server dev > app.log 2>&1 &
  sleep 2 && ss -tlnp | grep 5173 && echo 'server running'
"
```

#### 运行方式

线上通过 `tsx` 直接运行后端，Hono serve 前端静态文件（`apps/client/dist/`），统一监听 5173 端口。**不使用 Vite dev 模式**（ECS 配置低会白屏）。

#### 注意事项

- `.env` 在 ECS 上单独维护，不随代码覆盖（含 API Key）
- `data/` 目录存放 SQLite 数据库（`news.db`），部署时不要覆盖
- `crypto.randomUUID()` 在 HTTP 下不可用，已有 polyfill，构建时会包含
- 域名尚未备案，当前通过 IP 直接访问

### 常用端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 Vite Dev Server | 5173 | 本地开发 |
| 后端 Hono Server | 3066 | 本地开发 |
| 线上（Hono 统一）| 5173 | 前端静态文件 + API |

---

## 验收流程（强制）

**所有需求类任务（新功能、UI 变更、bug 修复）在实现完成后，必须使用 `boss` agent 进行验收。**

### 流程

1. 实现需求
2. 确保 `pnpm dev` 开发服务器正在运行（默认 `http://localhost:5173`）
3. 调用 `boss` agent 验收：
   - `goal`：描述本次实现的内容
   - `scenarios`：相关场景（可省略，由 boss 自行判断）
   - `baseUrl`：开发服务器地址（默认 `http://localhost:5173`）
4. 如果验收 ❌ 未通过：
   - 根据 boss 返回的修复建议逐一修复
   - 再次调用 boss 验收
   - 循环直到 ✅ 通过
5. 验收通过后告知用户

### 什么算"需求类任务"

触发验收的任务类型：
- 新增功能或组件
- 修改现有 UI 行为
- 修复用户可见的 bug
- 样式/布局调整

不需要验收的任务类型：
- 纯重构（不改变行为）
- 文档更新
- 配置/依赖变更
- 代码分析/解释类问题

### 示例

```
用户：给消息输入框添加自动聚焦功能

Claude Code 的工作流：
1. 阅读相关代码
2. 实现自动聚焦
3. 如果改动量较大，调用 boss agent 进行验收
4. boss 返回 ✅ → 告知用户完成
   boss 返回 ❌ → 修复问题 → 再次调用 boss → 直到 ✅
```
