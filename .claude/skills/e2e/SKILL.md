---
name: e2e
description: "E2E 测试工作流。命令：/e2e test <场景>, /e2e check, /e2e report, /e2e scenarios。"
---

# E2E 测试技能

Think With AI 的端到端测试工作流，基于 Chrome DevTools MCP。

## 命令

解析用户在 `/e2e` 后的输入，判断要执行哪个命令：

### `/e2e check` — 检查前置条件

检查测试环境是否就绪：

1. **Chrome 调试端口**：运行 `lsof -i :9222 | grep LISTEN` 检查 Chrome 是否监听调试端口
   - 未就绪：提示用户用 `--remote-debugging-port=9222` 启动 Chrome
2. **开发服务器**：运行 `lsof -i :5173 | grep LISTEN` 检查开发服务器是否运行
   - 未就绪：提示用户在项目根目录运行 `pnpm dev`
3. **Chrome DevTools MCP**：调用 `mcp__chrome-devtools__list_pages` 验证 MCP 连接
   - 失败：提示用户检查 MCP 服务器配置

每项检查报告为「就绪」或「未就绪」。

### `/e2e test <场景>` — 执行测试

1. 解析场景参数。有效场景定义在 `.claude/skills/e2e/data/scenarios.md`：
   - `smoke` — 基础冒烟测试
   - `chat-flow` — 对话与流式响应
   - `branch-explore` — 文本选择与分支探索
   - `mindmap-nav` — 思维导图导航

2. 创建会话目录：`e2e-reports/{YYYY-MM-DD}-{场景名}/`

3. 启动 `e2e-test-runner` agent，传入：
   - `session`：目录名
   - `scenario`：场景名（agent 会从 `scenarios.md` 读取步骤）
   - `baseUrl`：`http://localhost:5173`

4. agent 完成后，展示报告摘要。

如果未指定场景，询问用户要执行哪个场景，并列出可选项。

如果参数不匹配预定义场景，作为自定义功能名称处理，请用户描述测试步骤，然后传给 agent 作为自定义测试计划。

### `/e2e report [会话名]` — 查看报告

1. 指定了会话名 → 读取 `e2e-reports/{会话名}/report.md`
2. 未指定 → 查找最新报告：
   - `ls -t e2e-reports/` 取第一个目录
   - 读取 `e2e-reports/{最新目录}/report.md`
3. 展示报告内容

### `/e2e scenarios` — 列出可用场景

读取 `.claude/skills/e2e/data/scenarios.md`，展示场景列表、描述和步骤数。

## 说明

- 所有测试产物（截图、报告）存放在 `e2e-reports/`（已 gitignore）
- agent 负责所有浏览器交互 — 本技能只做编排
- 自定义测试计划：描述要测什么，agent 会自行规划步骤
