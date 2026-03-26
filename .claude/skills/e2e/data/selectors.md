# E2E 元素选择器

所有 E2E 测试使用的 CSS 选择器的唯一数据源。按页面/组件分类。

> **优先级约定**：`data-testid` > `#id` > `[aria-*]` > 稳定的 CSS 选择器 > 文本内容

---

## 首页（列表视图）

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 页面标题 | `h1` 包含 "Think With AI" | 渐变文字 |
| 副标题 | 文本 "探索式 AI 学习工具" | 标题下方 |
| 新建知识树按钮（头部） | `button` 包含 "新建知识树" | 头部始终可见 |
| 新建知识树 CTA（空状态） | `[data-testid="create-tree-cta"]` | 仅无知识树时显示 |
| 知识树列表项 | 列表中的 `button`，包含知识树标题文本 | 点击打开知识树 |
| 知识树默认名称 | 文本 "未命名知识树" | 知识树无标题时 |

---

## 布局（树视图）

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 返回按钮 | `button` 包含 "返回列表" | 左上角，z-10 |
| 左面板（思维导图） | `[data-testid="left-panel"]` | flex-[35] |
| 右面板（对话） | `[data-testid="right-panel"]` | flex-[65] |

---

## 对话面板

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 空状态图标 | `.animate-breathe` | MessageCircle 图标 |
| 空状态文字 | 文本 "开始一段新对话" | 未选中节点时显示 |
| 空状态副标题 | 文本 "输入你的问题，AI 会帮你思考和探索" | 空状态文字下方 |
| 节点头部 | 包含文本 "探索：" 的元素 | 显示选中文本上下文 |
| 消息容器 | 右面板内的 `.overflow-y-auto` | 可滚动消息区域 |
| 消息空状态文字 | 文本 "开始提问吧..." | 节点无消息时 |
| 流式指示器 | `.thinking-dot` | 三个跳动的点 |

---

## 消息气泡

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 用户消息 | 带 User 图标的消息气泡 | `bg-surface-secondary` |
| AI 回复消息 | `[data-testid="assistant-message"]` | 包含 Markdown `.prose` |
| AI 回复内容 | `[data-testid="assistant-message"] .prose` | 渲染后的 Markdown |

---

## 消息输入

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 文本输入框 | `#message-input` 或 `textarea[name="message"]` | 自动调整高度 |
| 占位文本 | 默认："输入你的问题..." | 随上下文变化 |
| 发送按钮 | `button` 包含屏幕阅读器文本 "发送" | 输入框右下角 |
| 提示文字 | 文本 "Enter 发送 · Shift+Enter 换行" | 输入框下方 |

---

## 思维导图

| 元素 | 选择器 | 备注 |
|------|--------|------|
| ReactFlow 容器 | `.react-flow` | 主画布 |
| 思维导图节点 | `[data-testid="mind-map-node"]` | 所有节点 |
| 活跃节点 | `[data-testid="mind-map-node"]` 带 `ring-2 ring-brand/40` | 当前选中 |
| 根节点 | `[data-testid="mind-map-node"]` 带 `border-brand/30` | 第一个/根节点 |
| 空状态 | 文本 "开始对话后，思维导图将在这里显示" | 未加载知识树时 |
| 控制按钮 | `.react-flow__controls` | 缩放控件 |

---

## 文本选择弹窗

| 元素 | 选择器 | 备注 |
|------|--------|------|
| 弹窗容器 | `[data-testid="explore-popup"]` | 浮动定位，z-50 |
| 深入探索按钮 | `button` 包含 "深入探索" | 弹窗内 |
| 深入探索按钮（禁用） | 同上按钮带 `disabled` 属性 | 流式响应期间 |

---

## 交互模式

### 点击元素
```
使用：mcp__chrome-devtools__click
选择器：上方表格中的 CSS 选择器
```

### 在消息输入框输入
```
使用：mcp__chrome-devtools__click 点击 #message-input
然后：mcp__chrome-devtools__type_text
```

### 发送消息
```
使用：mcp__chrome-devtools__press_key，key 为 "Enter"
```

### 选中 AI 回复中的文本（触发分支探索）
```javascript
// 使用：mcp__chrome-devtools__evaluate_script
const msg = document.querySelector('[data-testid="assistant-message"]');
const prose = msg?.querySelector('.prose');
const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
const textNode = walker.nextNode();
if (textNode) {
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(textNode.textContent.length, 20));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  msg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}
```

### 等待流式响应完成
```javascript
// 使用：mcp__chrome-devtools__wait_for 或用 evaluate_script 轮询
// 检查：页面上没有 .thinking-dot 元素
document.querySelectorAll('.thinking-dot').length === 0
```

### 检查思维导图节点是否活跃
```javascript
// 活跃节点带 ring-2 类
document.querySelector('[data-testid="mind-map-node"].ring-2') !== null
```
