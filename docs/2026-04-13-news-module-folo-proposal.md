# 新闻模块重构方案备忘：Folo + 自建日报链路

**日期**：2026-04-13
**状态**：待决策（暂存档，后续再评估）
**关联会话**：`2853d8b4-0fdf-4f98-8f06-9a266b5045a0`（2026-03-25 至 03-30，Brave API / CloudFlare-AI-Insight-Daily / last30days-skill 调研）

---

## 1. 背景与动机

当前 AI 新闻模块的"数据"完全依赖爬取 `ai.hubtoday.app` 这个第三方成品页（它本身是开源项目 `CloudFlare-AI-Insight-Daily` 的输出）。存在以下风险：

- hubtoday 一旦停更 / 改版 / 收费，新闻模块立刻哑巴
- DOM 结构一变，正则提取全挂
- 内容选品受制于上游作者的订阅偏好，无法按用户兴趣定制
- 只是"消费者"，没有任何自主可控性

目标是把新闻模块改造成**自建日报链路**——自己聚合信息源，自己用 LLM 合成结构化日报。

---

## 2. 当前实现现状（简要快照）

| 层 | 位置 | 做法 |
|----|------|------|
| 抓取 | `apps/server/src/news/scraper.ts` | 并行 `fetch` 两源：`ai.hubtoday.app` + `news.smol.ai`，`node-html-markdown` 转 MD |
| 清洗 | `apps/server/src/news/refiner.ts` | 纯正则过滤广告/二维码/标签引用等噪声 |
| 存储 | `apps/server/src/news/store.ts` | `better-sqlite3`，表 `briefings` + `daily_questions` |
| 定时 | `apps/server/src/news/scheduler.ts` | `setTimeout` → `setInterval` 每天 11:00 |
| API | `apps/server/src/routes/news.ts` | CRUD + `/today`（切分类头条 + AI 关键词）+ `/fetch-daily` |
| 前端 | `apps/client/src/components/News/NewsModule.tsx` | 双 Tab（当日/归档）+ Markdown 渲染 |

LLM 调用仅用于"学习关键词"生成，每天 1 次，落库缓存。

---

## 3. 参考过的开源项目（历史调研）

### 3.1 `justlovemaki/CloudFlare-AI-Insight-Daily` ⭐ 核心参考

- **关系**：我们当前爬的 `ai.hubtoday.app` 就是这个项目的输出页面
- **架构**：Folo（RSS 聚合）→ Google Gemini 合成 → Cloudflare Workers + GitHub Pages 发布
- **输出版块**：今日摘要 / 产品与功能更新 / 前沿研究 / 行业展望 / 开源 TOP / 社媒分享
- **我们的 `CATEGORY_MAP`（`routes/news.ts:38-46`）直接对齐它的分类**

### 3.2 `RSSNext/Folo`（`app.follow.is`）

- **定位**：新一代开源 RSS 聚合平台，由 RSS3 团队开发
- **能力**：RSS / Atom / JSON Feed / X / YouTube / B 站 / 播客统一订阅，内置 AI 摘要
- **对开发者的价值**：有 HTTP API，Cookie 鉴权后可程序化拉取订阅流（省掉自己写 N 个爬虫的脏活）
- **合规性**：API 非完全公开，第三方用 F12 抓 Cookie 的方式接入，Cookie 有效期约 7-30 天

### 3.3 `mvanhorn/last30days-skill`

- Python Claude Code skill，跨 Reddit / X / YouTube / HN / Polymarket / Web 8 个源
- 采集 30 天讨论 → Claude 合成报告
- 因国内网络限制未集成

### 3.4 被放弃的：Brave Search API

- 2026-03-25 讨论过，免费 2000 次/月 + 独立 News 端点
- 因**阿里云 ECS 国内网络不可达** `api.search.brave.com` 而放弃
- 同一原因导致 RSSHub Twitter 源、Tavily/Serper/Exa 等搜索 API 都不可用

### 3.5 `Aas-ee/open-webSearch` ⭐ 漏掉的方案（2026-03-30 用户提过但未采纳）

**历史：** 2026-03-30 20:31 用户原话："基于 websearch 能力来做吧，不走 rss 接入了，**参考社区里的 Open-WebSearch MCP 方案**，访问这个网站来获取信息 https://ai.hubtoday.app/2026-03/2026-03-30/"

当时 AI 助手把"参考 MCP 方案"这层弱信号丢失，只执行了"访问这个 URL"的强信号，落地为单站爬虫。**实际上 Open-WebSearch 是更合适的方案**。

| 维度 | 情况 |
|------|------|
| 定位 | 多引擎 WebSearch MCP Server（也支持 CLI / HTTP 守护进程）|
| 引擎 | Bing / DuckDuckGo / Baidu / Brave / Exa / CSDN / 掘金 / Startpage |
| 鉴权 | **无需 API Key**（全爬网页）|
| 网络 | 内置 `USE_PROXY` + `PROXY_URL`；百度/CSDN/掘金**国内直连**，其他需代理 |
| 部署 | NPX 一行 / docker-compose / MCP streamableHttp |
| 技术栈 | Node + Express + Axios + Playwright（可选）|

**关键优势**：
- 不依赖 Cookie（vs Folo）
- 不需要自己维护 feed 列表（vs RSSHub）
- 国内能跑（百度/掘金等内置中文源）
- 多引擎并联，单源故障可切换
- 副产品：能给其他 AI 模块（对话/思考树）提供实时检索能力

**当时未采纳的复盘**详见第 9 节"决策回顾"。

---

## 4. 候选方案对比

| 方案 | 核心思路 | 海外网络 | 运维 | 自主度 | 实现成本 |
|------|---------|---------|------|-------|---------|
| **A. Folo + Cookie** | 订阅 Folo → API 拉订阅流 → LLM 合成 | **强依赖** | Cookie 定期轮换 | 中 | 低 |
| **B. Folo + 代理** | A + HTTP_PROXY 配置 | 需代理 | ECS 需搭代理 | 中 | 中 |
| **C. RSSHub 自托管** | Docker 跑 RSSHub → 自维护 feed 列表 → LLM 合成 | **不需要** | 自己维护 Docker | 高 | 中 |
| **D. 混合** | 本地用 A，线上 fallback 到 C | 部分 | 两套都要维护 | 高 | 高 |
| **E. Open-WebSearch MCP** ⭐ | 部署 Open-WebSearch 服务 → 按关键词搜 → LLM 合成 | **不强需要**（百度/掘金可用）| 国内 ECS 直接 docker 跑 | 高 | 中 |

**当前评估倾向**：方案 E 综合最优 —— 无 Cookie 风险、无 feed 维护负担、国内可跑、能扩展到其他模块。

---

## 5. 方案一详细设计（Folo + Cookie）

### 5.1 目标

新起一个模块（不动现有 `news/`），验证"Folo → LLM → 结构化日报"的产品形态。先本地跑通看效果。

### 5.2 网络依赖

| 域名 | 用途 | 国内 | 本地开发 | 阿里云 ECS |
|------|------|-----|---------|-----------|
| `app.follow.is` | Cookie 入口 | ❌ | ⚠️ 需代理 | ❌ |
| `api.follow.is` | 订阅流 API | ❌ | ⚠️ 需代理 | ❌ |

**结论：方案一无法直接部署到当前 ECS**。要么开发者本地代理跑 demo，要么换海外节点。

### 5.3 模块结构（建议）

```
apps/server/src/
├── news/                    # 保留现有
└── briefing/                # 新模块（名字暂定）
    ├── folo-client.ts       # Folo API 封装 + Cookie 鉴权
    ├── entries.ts           # 拉订阅流 → 归一化 Entry 类型
    ├── synthesizer.ts       # 把 N 条 entries 投喂 LLM → 结构化日报
    ├── store.ts             # 独立表 `briefings_v2`
    ├── scheduler.ts         # 独立定时任务
    └── routes.ts            # /api/briefing/* 端点
```

前端：
```
apps/client/src/components/Briefing/
└── BriefingModule.tsx       # 独立 UI，可与 NewsModule 并存对比
```

### 5.4 核心数据流

```
1. 用户在 Folo Web 端订阅 15-20 个 AI 源
2. F12 → Application → Cookies 复制 `.follow.is` 域下的 token
3. 写入 .env：FOLO_COOKIE="xxx"
4. 后端定时任务（每天 9:00）：
   - GET api.follow.is/entries?view=... &publishedAfter=yesterday
   - 归一化为 { title, url, summary, author, publishedAt, source }
   - 按来源/关键词聚类
   - 分批投喂 LLM（提示词参考 CloudFlare-AI-Insight-Daily）
   - 合成 7 版块结构化 MD
   - 落库 briefings_v2
5. 前端展示（同现有 NewsModule 的样式）
```

### 5.5 提示词模板（参考 CloudFlare-AI-Insight-Daily）

```
系统：你是 AI 资讯编辑，负责把过去 24 小时的信息合成日报。
输入：N 条新闻 entries（JSON）
输出：Markdown 格式日报，必须包含以下版块：
  ## 今日摘要（3-5 句话）
  ### 产品与功能更新
  ### 前沿研究
  ### 行业展望与社会影响
  ### 开源 TOP 项目
  ### 社媒热议

每个版块用 `1. **标题**  \n描述` 列表格式，保留原始链接。
```

### 5.6 Folo API 调研待办

Folo 官方没公开 API 文档，需要逆向：
- [ ] F12 抓"订阅流/Timeline"请求，记录端点、参数、响应结构
- [ ] 确认 Cookie / Authorization 头的字段名
- [ ] 测试分页、时间过滤、按 View 过滤
- [ ] 写出最小可复现的 `curl` 命令

### 5.7 风险与缓解

| 风险 | 缓解 |
|------|------|
| Cookie 过期 | 后端检测 401 → 发邮件/通知提醒更换 |
| API 路径变更 | 抽象一层 `FoloClient` 接口，便于替换 |
| 限流 | 每天只拉 1 次，单次 1 个请求 |
| ToS 违规 | 个人项目风险可控，不做商业化、不高频 |

---

## 6. 方案三备用设计（RSSHub 自托管）

如果后续决定不碰 Folo 走 RSSHub：

```yaml
# docker-compose.yml
services:
  rsshub:
    image: diygod/rsshub
    ports: ["1200:1200"]
    environment:
      CACHE_TYPE: redis
```

在国内 ECS 上跑，维护一份 `sources.ts`：

```ts
export const SOURCES = [
  { id: 'openai-blog', url: 'https://openai.com/blog/rss.xml' },
  { id: 'anthropic-news', url: 'https://www.anthropic.com/news/rss' },
  { id: 'twitter-sama', url: 'http://rsshub-internal:1200/twitter/user/sama' },
  // ...
]
```

用现有的 `fast-xml-parser` 解析，复用 `news/scraper.ts` 的大部分逻辑。

---

## 7. 方案五详细设计（Open-WebSearch MCP）

### 7.1 目标

把"被动爬一个站"改成"按关键词主动搜全网"，新闻模块从此**真正具备 WebSearch 能力**。

### 7.2 部署形态

**优先选择**：HTTP 守护进程（不走 MCP 协议，避免和现有 Hono 后端协议冲突）。

```yaml
# docker-compose.yml（部署在阿里云 ECS）
services:
  open-websearch:
    image: aasee/open-websearch:latest  # 或自己 build
    ports: ["3001:3000"]
    environment:
      DEFAULT_SEARCH_ENGINE: baidu       # 国内直连
      ENABLED_ENGINES: baidu,csdn,juejin # 默认只用国内源
      # USE_PROXY: 'true'                # 如有代理可启用 bing/brave/exa
      # PROXY_URL: http://proxy:7890
```

启动后 Hono 后端通过 `http://localhost:3001/search?q=xxx` 调用。

### 7.3 模块结构

```
apps/server/src/
├── news/                    # 保留现有 hubtoday 爬虫作为 fallback
└── briefing/                # 新模块
    ├── search-client.ts     # Open-WebSearch HTTP 客户端封装
    ├── topics.ts            # AI 关键词列表（GPT/Claude/Gemini/开源模型/...）
    ├── pipeline.ts          # 多关键词并行搜索 → 合并 → 去重 → 时间过滤
    ├── synthesizer.ts       # 投喂 LLM 生成结构化日报
    ├── store.ts             # 表 briefings_v2
    ├── scheduler.ts         # 定时 11:00 触发
    └── routes.ts            # /api/briefing/* 端点
```

### 7.4 核心数据流

```
1. topics.ts 维护一组 AI 主题关键词：
   ['GPT-5', 'Claude', 'Gemini', 'AI agents', '开源大模型', 'AI 创业', ...]
2. 每天定时任务：
   a. 对每个关键词 → 调 Open-WebSearch /search → 拿前 10 条结果
   b. 按 URL 去重，按发布时间过滤（24 小时内）
   c. 可选：对前 N 个结果调 /fetch 抓正文
   d. 把所有 entries 投喂 LLM
   e. 合成 7 版块 Markdown → 落库
3. 前端展示同方案一
```

### 7.5 与现有 hubtoday 爬虫的关系

建议保留双轨：
- 主路径：Open-WebSearch + LLM 合成（自主可控）
- Fallback：现有 hubtoday 爬虫（外援素材）
- 两套数据同存 SQLite 不同表，前端可切换"自建版/聚合版"

### 7.6 关键优势 vs 其他方案

| 维度 | 方案 A (Folo) | 方案 C (RSSHub) | **方案 E (Open-WebSearch)** |
|------|-------|-------|----------|
| 数据维护 | Folo 订阅列表 | 手维 feed 列表 | **关键词列表（最易维护）** |
| 鉴权风险 | Cookie 失效 | 无 | **无** |
| 国内可用 | 不可 | 可 | **可（百度/掘金内置）** |
| 故障容忍 | 单点 | 多源但要逐个加 | **多引擎并联** |
| 扩展性 | 限于订阅源 | 限于 RSS 站 | **全网**，副产品给其他模块 |
| 运维 | Cookie 轮换 | docker + feed 维护 | **docker 一行起** |

### 7.7 风险与缓解

| 风险 | 缓解 |
|------|------|
| 搜索引擎反爬 | Open-WebSearch 已实现轮换；必要时配住宅代理 |
| Playwright 资源占用 | 关闭 Bing fallback 选项，只用纯 HTTP 引擎 |
| 搜索结果质量参差 | LLM 合成阶段做相关性过滤 |
| 新闻去重困难 | 按 URL hash + 标题相似度去重 |

### 7.8 实施待办

- [ ] 在本地 docker 跑通 Open-WebSearch，验证 /search 端点
- [ ] 测试中文 AI 关键词的 baidu/掘金返回质量
- [ ] 设计 topics.ts 关键词列表（建议 8-12 个）
- [ ] 起一个最小 spike：1 个关键词 → 1 次合成 → 看产出质量
- [ ] 决定是否接入 Bing/Brave 等海外引擎（取决于 ECS 是否能配代理）

---

## 8. 待决策事项

1. **是否接受"只在本地 / 海外节点运行"的限制？**（决定方案 A 是否可行）
2. **是否愿意投入精力维护 RSSHub 实例？**（决定方案 C 是否可行）
3. **是否保留现有 hubtoday 爬虫作为 fallback？**（决定方案 D / E 双轨制）
4. **LLM 成本预算**：自建后每天合成日报的 token 消耗量会显著上升（当前只生成关键词），是否接受？
5. **新模块与现有 NewsModule 的关系**：并存 / 替换 / AB 对比？
6. **方案 E 是否要接入海外引擎？** 若要，需先解决 ECS 出海代理；若不要，只用百度/掘金质量是否够用？

---

## 9. 决策回顾：当时为什么没选 Open-WebSearch

**事实**：2026-03-30 20:31 用户已经明确提到"参考 Open-WebSearch MCP 方案"，但当时 AI 助手未采纳，原因复盘如下：

| 原因 | 详情 |
|------|------|
| **指令信号强弱混合** | 用户同一句话给了"Open-WebSearch MCP"（弱/抽象）+ 具体 URL（强/具体）。AI 选择了执行强信号 |
| **"参考"的模糊性被自利解读** | "参考" ≠ "使用"，AI 默认方向对了就行，倾向选省力路径 |
| **前一个 plan 的惯性** | 同一会话 20:06 刚写完"集成 last30days"的 plan，最小变更路径是把"调脚本"换成"fetch URL" |
| **未做尽调** | 没有 WebFetch 调研 Open-WebSearch 是什么；plan 文档里只字未提 MCP |
| **plan 模式下时间压力** | 选了 4 分钟即可成型的 MVP 路径，6 分钟后 commit |

**教训**：用户给出"方向 + 示例"复合指令时，应先调研方向，再判断示例是"全部需求"还是"第一个验证目标"。

**修正动作**：本文档将 Open-WebSearch 作为方案 E 列入正式选项，等待用户决策是否启用。

---

## 10. 下一步

待你决策。此文档为存档，不进入实施。

**推荐路径**（基于现有信息）：方案 E（Open-WebSearch）+ 保留方案 D 中的 hubtoday 双轨。

