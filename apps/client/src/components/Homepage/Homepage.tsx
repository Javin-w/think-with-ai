import { useEffect, useMemo, useState } from 'react'
import { Flame } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import type { CategoryHeadline } from '../../store/newsStore'
import { useTreeStore } from '../../store/treeStore'
import type { Tree, TreeNode } from '@repo/types'
import { db } from '../../db/index'
import SideRail from '../Shell/SideRail'
import { EXAMPLE_TREE_TITLE, seedExampleTree } from '../../utils/seedExampleTree'

const S = {
  bg: '#0f0e0c',
  panel: '#15140f',
  panel2: '#1b1a14',
  text: '#f5f2ea',
  text2: '#a8a399',
  text3: '#6c6760',
  border: 'rgba(245,242,234,0.08)',
  borderSoft: 'rgba(245,242,234,0.05)',
  accent: '#d4a574',
  accent2: '#e8c89a',
  accentSoft: 'rgba(212,165,116,0.12)',
  rust: '#c8785a',
  sage: '#8a9a7b',
  font: '"Noto Sans SC", -apple-system, sans-serif',
  serif: '"Noto Serif SC", "Fraunces", Georgia, serif',
}

function enDate(d: Date) {
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}.${m}.${day}`
}

function enWeekdayTime(d: Date) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${days[d.getDay()]} ${hh}:${mm}`
}

function computeStreak(trees: Tree[]): number {
  if (!trees.length) return 0
  const daySet = new Set<number>()
  const now = new Date()
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  for (const t of trees) {
    const d = new Date(t.updatedAt)
    daySet.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())
  }
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const day = today0 - i * 86400_000
    if (daySet.has(day)) streak++
    else if (streak > 0) break
  }
  return streak
}

/** Greeting by time of day, returned in the editorial voice. */
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '深夜好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 19) return '下午好'
  return '晚上好'
}

// Category → V4 editorial palette mapping
const KIND_COLOR: Record<string, { label: string; color: string }> = {
  product: { label: '产品', color: S.rust },
  research: { label: '研究', color: S.accent },
  technology: { label: '研究', color: S.accent },
  industry: { label: '行业', color: S.sage },
  social: { label: '行业', color: S.sage },
  opensource: { label: '开源', color: '#a0976a' },
  design: { label: '产品', color: S.rust },
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { trees, loadTrees } = useTreeStore()
  const { todayCategoryHeadlines, todayLoading, fetchToday } = useNewsStore()
  const [input, setInput] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadTrees()
      if (cancelled) return
      // First-run onboarding: if the user has never had any tree and has never
      // been seeded before, drop in the Transformer example so the hero TreeSVG
      // renders immediately instead of showing the "从下方种下你的第一棵" empty state.
      if (typeof localStorage !== 'undefined' && !localStorage.getItem('pmtoken.example-seeded')) {
        const { trees: currentTrees } = useTreeStore.getState()
        if (currentTrees.length === 0) {
          localStorage.setItem('pmtoken.example-seeded', '1')
          await seedExampleTree()
        }
      }
    })()
    fetchToday()
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [loadTrees, fetchToday])

  const sortedTrees = useMemo(
    () => [...trees].sort((a, b) => b.updatedAt - a.updatedAt),
    [trees],
  )
  const streak = useMemo(() => computeStreak(sortedTrees), [sortedTrees])
  const continueTree = sortedTrees[0]

  const handleSow = (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
    navigateTo('thinking-tree')
    sessionStorage.setItem('pendingMessage', msg)
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSow()
    }
  }

  const openTree = async (id: string) => {
    const { loadTree, setCurrentNode } = useTreeStore.getState()
    await loadTree(id)
    const state = useTreeStore.getState()
    const root = state.nodes.find(n => n.treeId === id && n.parentId === null)
    if (root) setCurrentNode(root.id)
    navigateTo('thinking-tree')
  }

  const handleEnterContinued = async () => {
    if (continueTree) {
      await openTree(continueTree.id)
      return
    }
    // Cold start: plant the Transformer example tree and enter its root.
    await seedExampleTree()
    navigateTo('thinking-tree')
  }

  /**
   * Jump to the news view and scroll to a specific headline or category.
   * First tries to match a heading that contains the first 8 chars of the
   * title; falls back to the category label.
   */
  const openNewsAt = (headline: CategoryHeadline) => {
    navigateTo('news')
    setTimeout(() => {
      const headings = document.querySelectorAll('.news-atheneum h2, .news-atheneum h3')
      const titleKey = headline.title.slice(0, 8)
      for (const el of headings) {
        if (el.textContent?.includes(titleKey)) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
      const label = KIND_COLOR[headline.category]?.label
      const categoryEl = Array.from(headings).find(el =>
        (label && el.textContent?.includes(label)) || el.textContent?.includes(headline.category)
      )
      categoryEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
  }

  // Right column featured + list
  const featured = todayCategoryHeadlines?.[0]
  const listItems = (todayCategoryHeadlines || []).slice(1, 8)

  return (
    <div
      className="w-full h-screen grid overflow-hidden"
      style={{
        gridTemplateColumns: '190px 1fr',
        background: S.bg,
        color: S.text,
        fontFamily: S.font,
      }}
    >
      <SideRail />

      {/* ─── Main ───────────────────────────────────────────────────── */}
      <main
        className="flex flex-col overflow-hidden"
        style={{ padding: '28px 44px' }}
      >
        {/* Masthead */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 0 12px', borderBottom: `1px solid ${S.border}` }}
        >
          <div className="flex items-baseline gap-2.5">
            <span
              style={{
                fontSize: 10.5,
                letterSpacing: 3,
                color: S.accent,
                fontFamily: 'Inter',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              THE EVENING EDITION
            </span>
            <span style={{ fontSize: 10, color: S.text3, letterSpacing: 0.5 }}>
              · VOL. {trees.length + 24} · {enDate(now)} ·
            </span>
          </div>
          <div
            className="flex items-center gap-3.5"
            style={{ fontSize: 10.5, color: S.text3, fontFamily: 'Inter' }}
          >
            <span>{enWeekdayTime(now)}</span>
            {streak > 0 && (
              <span style={{ color: S.accent }}>● {streak} 天连续</span>
            )}
          </div>
        </div>

        {/* Headline row */}
        <div style={{ padding: '22px 0 16px' }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 2,
              color: S.text3,
              textTransform: 'uppercase',
              marginBottom: 8,
              fontFamily: 'Inter',
              fontWeight: 500,
            }}
          >
            致 · 探索者
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: S.serif,
              fontWeight: 600,
              fontSize: 42,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              color: S.text,
            }}
          >
            {greeting()}。
            <span style={{ color: S.text2, fontStyle: 'italic', fontWeight: 400 }}>
              今天想继续哪棵树，
            </span>
            <br />
            <span style={{ color: S.accent }}>还是种一棵新的？</span>
          </h1>
        </div>

        {/* Two-column body */}
        <div
          className="grid min-h-0"
          style={{
            gridTemplateColumns: '1.35fr 0.85fr',
            gap: 36,
            padding: '14px 0 18px',
            borderTop: `1px solid ${S.border}`,
            flex: 1,
          }}
        >
          {/* LEFT column */}
          <div className="flex flex-col min-h-0" style={{ gap: 18 }}>
            {continueTree ? (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: S.accent,
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  续篇 · CONTINUED
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: S.serif,
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    lineHeight: 1.25,
                  }}
                >
                  {continueTree.title || '未命名的探索'}
                </h2>
                <div
                  style={{
                    fontSize: 12,
                    color: S.text2,
                    marginTop: 6,
                    lineHeight: 1.55,
                    fontFamily: S.serif,
                  }}
                >
                  上次更新于 {relativeTime(continueTree.updatedAt)}。接着往下走，这棵树还能长更深。
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: S.accent,
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  样例 · EXAMPLE
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: S.serif,
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    lineHeight: 1.25,
                  }}
                >
                  {EXAMPLE_TREE_TITLE}
                </h2>
                <div
                  style={{
                    fontSize: 12,
                    color: S.text2,
                    marginTop: 6,
                    lineHeight: 1.55,
                    fontFamily: S.serif,
                  }}
                >
                  这是一棵预先种下的样例树，点右下「进入」即可翻阅。也可以直接从下面的输入框种下你自己的第一棵。
                </div>
              </div>
            )}

            {/* Tree SVG as hero visual */}
            <div
              className="relative flex flex-col min-h-0"
              style={{
                background: S.panel,
                border: `1px solid ${S.border}`,
                padding: '18px 20px 12px',
                flex: 1,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 14,
                  fontSize: 9.5,
                  color: S.text3,
                  letterSpacing: 1.2,
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                }}
              >
                FIG. I — {continueTree ? `对话树 · ${continueTree.title.slice(0, 12)}` : `样例 · ${EXAMPLE_TREE_TITLE} · 11 节点`}
              </div>
              <TreeSVG tree={continueTree ?? null} />
              <div
                className="flex justify-between items-center"
                style={{
                  marginTop: 8,
                  fontSize: 10.5,
                  color: S.text3,
                  fontFamily: 'Inter',
                }}
              >
                <span>● 已展开　○ 待探索</span>
                <button
                  onClick={handleEnterContinued}
                  style={{ color: S.accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  进入 →
                </button>
              </div>
            </div>

            {/* Input — understated */}
            <div
              style={{
                border: `1px solid ${S.border}`,
                padding: '12px 14px',
                background: S.panel,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: S.text3,
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                —— 或，种一棵新的
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="一个主题、一个疑问、一段引文…"
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{
                    fontSize: 14.5,
                    fontFamily: S.serif,
                    color: S.text,
                  }}
                />
                <button
                  onClick={() => handleSow()}
                  disabled={!input.trim()}
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${S.accent}`,
                    background: 'transparent',
                    color: S.accent,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  播种 ↵
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT column — today's brief */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ borderLeft: `1px solid ${S.border}`, paddingLeft: 30 }}
          >
            <div
              className="flex items-baseline justify-between"
              style={{ marginBottom: 14 }}
            >
              <h3 style={{ margin: 0, fontFamily: S.serif, fontSize: 16, fontWeight: 600 }}>
                今日要闻
              </h3>
              <button
                onClick={() => navigateTo('news')}
                style={{
                  fontSize: 10,
                  color: S.text3,
                  letterSpacing: 1.2,
                  fontFamily: 'Inter',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                查看全部 →
              </button>
            </div>

            {featured ? (
              <FeaturedArticle
                headline={featured}
                onOpen={() => openNewsAt(featured)}
              />
            ) : todayLoading ? (
              <NewsSkeleton />
            ) : (
              <div
                style={{
                  padding: '14px 0',
                  borderBottom: `1px solid ${S.border}`,
                  fontSize: 12,
                  color: S.text3,
                  fontFamily: S.serif,
                }}
              >
                今日要闻尚未同步 —{' '}
                <button
                  onClick={() => navigateTo('news')}
                  style={{ color: S.accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  前往抓取
                </button>
              </div>
            )}

            {listItems.length > 0 ? (
              <ArticleList items={listItems} onOpen={openNewsAt} />
            ) : !featured ? null : (
              <div
                style={{
                  padding: '14px 0',
                  fontSize: 11.5,
                  color: S.text3,
                  fontFamily: S.serif,
                }}
              >
                更多要闻请前往「今日要闻」页面。
              </div>
            )}
          </div>
        </div>

        {/* Footer strip */}
        <div
          className="flex justify-between"
          style={{
            borderTop: `1px solid ${S.border}`,
            padding: '10px 0 0',
            fontSize: 10,
            color: S.text3,
            fontFamily: 'Inter',
            letterSpacing: 0.5,
          }}
        >
          <span>本周 · {trees.length} 棵树 · {trees.length * 3} 分支</span>
          <span style={{ color: S.accent }}>"种下一个想法，让它自己长枝叶。"</span>
          <span>© PMtoken</span>
        </div>
      </main>
    </div>
  )
}

// ─── Tree SVG (real-data fig) ──────────────────────────────────────────
// Reads the actual nodes of `tree` from IndexedDB and lays out 3 layers:
//   Layer 0: root (always shown if tree exists)
//   Layer 1: root's direct children (cap MAX_LV1)
//   Layer 2: each level-1 node's children (cap MAX_LV2_PER_PARENT)
// "Explored" (messages.length > 0) → filled disc; "未探索" → hollow ring.
// Branch with the most messages gets the gold path highlight.

const MAX_LV1 = 5
const MAX_LV2_PER_PARENT = 3
const W = 420
const H = 200
const Y_ROOT = 30
const Y_LV1 = 95
const Y_LV2 = 165

function nodeLabel(n: TreeNode | undefined, max = 14): string {
  if (!n) return ''
  const raw = n.title || n.selectedText || n.messages.find((m) => m.role === 'user')?.content || '新对话'
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  return trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed
}

function TreeSVG({ tree }: { tree: Tree | null }) {
  const [nodes, setNodes] = useState<TreeNode[]>([])

  useEffect(() => {
    if (!tree) {
      setNodes([])
      return
    }
    let cancelled = false
    db.nodes
      .where('treeId')
      .equals(tree.id)
      .toArray()
      .then((ns) => {
        if (!cancelled) setNodes(ns)
      })
    return () => {
      cancelled = true
    }
  }, [tree?.id])

  const layout = useMemo(() => buildLayout(tree, nodes), [tree, nodes])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', minHeight: 160 }}>
      <defs>
        <pattern id="v4grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={S.borderSoft} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#v4grid)" />

      {layout.kind === 'empty' ? (
        <>
          <circle cx={W / 2} cy={H / 2 - 6} r="7" fill="transparent" stroke={S.accent} strokeWidth="1.2" />
          <text
            x={W / 2}
            y={H / 2 + 18}
            textAnchor="middle"
            fontSize="10.5"
            fill={S.text2}
            fontFamily={'"Noto Serif SC"'}
          >
            从下方种下你的第一棵
          </text>
        </>
      ) : (
        <>
          {/* Edges */}
          {layout.edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.highlight ? S.accent : S.border}
              strokeWidth={e.highlight ? 1.5 : 1}
              strokeDasharray={e.highlight ? '0' : '3 3'}
            />
          ))}

          {/* Root */}
          <circle cx={layout.root.x} cy={layout.root.y} r="7" fill={S.accent} />
          <text
            x={layout.root.x}
            y={layout.root.y - 12}
            textAnchor="middle"
            fontSize="10"
            fill={S.text}
            fontFamily={'"Noto Serif SC"'}
            fontWeight="600"
          >
            {layout.root.label}
          </text>

          {/* Level 1 */}
          {layout.lv1.map((n) => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r="6"
                fill={n.highlight ? S.accent : n.explored ? S.text2 : 'transparent'}
                stroke={S.accent}
                strokeWidth="1.2"
              />
              <text
                x={n.x}
                y={n.y - 11}
                textAnchor="middle"
                fontSize="9.5"
                fill={n.highlight ? S.accent : S.text2}
                fontFamily={'"Noto Serif SC"'}
              >
                {n.label}
              </text>
            </g>
          ))}

          {/* Level 2 */}
          {layout.lv2.map((n) => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r="4.5"
                fill={n.explored ? S.text2 : 'transparent'}
                stroke={n.highlight ? S.accent : S.text3}
                strokeWidth="1.2"
              />
              <text
                x={n.x}
                y={n.y + 14}
                textAnchor="middle"
                fontSize="8.5"
                fill={n.highlight ? S.accent : S.text3}
                fontFamily={'"Noto Serif SC"'}
              >
                {n.label}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  )
}

type LaidOutNode = { id: string; x: number; y: number; label: string; explored: boolean; highlight: boolean }
type Edge = { x1: number; y1: number; x2: number; y2: number; highlight: boolean }
type Layout =
  | { kind: 'empty' }
  | { kind: 'tree'; root: { x: number; y: number; label: string }; lv1: LaidOutNode[]; lv2: LaidOutNode[]; edges: Edge[] }

function buildLayout(tree: Tree | null, all: TreeNode[]): Layout {
  if (!tree) return { kind: 'empty' }
  const root = all.find((n) => n.parentId === null)
  if (!root) return { kind: 'empty' }

  const childrenOf = (parentId: string) =>
    all.filter((n) => n.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt)

  const lv1Raw = childrenOf(root.id).slice(0, MAX_LV1)

  // Pick the "deepest" branch for the gold highlight: the lv1 node whose subtree
  // has the most messages (sum across descendants). Falls back to no highlight.
  const subtreeWeight = (rootId: string): number => {
    const stack = [rootId]
    let w = 0
    while (stack.length) {
      const id = stack.pop()!
      const n = all.find((x) => x.id === id)
      if (!n) continue
      w += n.messages.length
      for (const c of all.filter((x) => x.parentId === id)) stack.push(c.id)
    }
    return w
  }
  const weights = lv1Raw.map((n) => subtreeWeight(n.id))
  const maxW = Math.max(0, ...weights)
  const highlightLv1Id = maxW > 0 ? lv1Raw[weights.indexOf(maxW)].id : null

  // Lay out by leaves: each lv1 parent owns N "slots" (one per visible child,
  // min 1 even if it has no children). All slots are evenly distributed across
  // the usable width, so adjacent parents' children never crowd each other.
  // Each parent sits at the horizontal centroid of its own children.
  const groups = lv1Raw.map((p) => ({
    parent: p,
    kids: childrenOf(p.id).slice(0, MAX_LV2_PER_PARENT),
  }))
  const slotCounts = groups.map((g) => Math.max(1, g.kids.length))
  const totalSlots = slotCounts.reduce((a, b) => a + b, 0)
  const padding = 35
  const usableW = W - padding * 2
  const slotW = totalSlots > 0 ? usableW / totalSlots : 0

  const lv1: LaidOutNode[] = []
  const lv2: LaidOutNode[] = []
  const edges: Edge[] = []
  let cursor = 0

  for (const g of groups) {
    const isHL = g.parent.id === highlightLv1Id
    const kidCount = g.kids.length
    let parentX: number

    if (kidCount === 0) {
      parentX = padding + (cursor + 0.5) * slotW
      cursor += 1
    } else {
      const kidXs = g.kids.map((_, i) => padding + (cursor + i + 0.5) * slotW)
      parentX = (kidXs[0] + kidXs[kidXs.length - 1]) / 2

      // Within highlighted parent, pick its heaviest child for the gold thread
      let highlightChildId: string | null = null
      if (isHL) {
        const cw = g.kids.map((k) => subtreeWeight(k.id) || k.messages.length)
        const maxC = Math.max(0, ...cw)
        if (maxC > 0) highlightChildId = g.kids[cw.indexOf(maxC)].id
      }

      g.kids.forEach((k, i) => {
        const x = kidXs[i]
        const isH = k.id === highlightChildId
        lv2.push({
          id: k.id,
          x,
          y: Y_LV2,
          label: nodeLabel(k, 8),
          explored: k.messages.length > 0,
          highlight: isH,
        })
        edges.push({ x1: parentX, y1: Y_LV1, x2: x, y2: Y_LV2, highlight: isH })
      })
      cursor += kidCount
    }

    lv1.push({
      id: g.parent.id,
      x: parentX,
      y: Y_LV1,
      label: nodeLabel(g.parent, 10),
      explored: g.parent.messages.length > 0,
      highlight: isHL,
    })
    edges.push({ x1: W / 2, y1: Y_ROOT, x2: parentX, y2: Y_LV1, highlight: isHL })
  }

  return {
    kind: 'tree',
    root: { x: W / 2, y: Y_ROOT, label: nodeLabel(root, 18) || tree.title.slice(0, 18) },
    lv1,
    lv2,
    edges,
  }
}

// ─── Right column ─────────────────────────────────────────────────────

/** Skeleton shown while /api/news/today is loading (cold start can take 10–30s). */
function NewsSkeleton() {
  const bar = (w: string, op = 0.08) => (
    <div
      style={{
        height: 10,
        width: w,
        borderRadius: 3,
        background: `rgba(245,242,234,${op})`,
        marginBottom: 8,
      }}
    />
  )
  return (
    <div
      style={{
        padding: '14px 0 16px',
        borderBottom: `1px solid ${S.border}`,
      }}
      aria-busy="true"
      aria-label="今日要闻加载中"
    >
      {bar('40%', 0.06)}
      {bar('88%', 0.12)}
      {bar('70%', 0.1)}
      <div
        style={{
          fontSize: 10,
          color: S.text3,
          letterSpacing: 1,
          fontFamily: 'Inter',
          marginTop: 4,
        }}
      >
        正在同步今日要闻…
      </div>
    </div>
  )
}

function FeaturedArticle({
  headline,
  onOpen,
}: {
  headline: CategoryHeadline
  onOpen: () => void
}) {
  const kind = KIND_COLOR[headline.category] || KIND_COLOR.technology
  const excerpt = headline.items?.[0]?.excerpt || ''
  return (
    <button
      onClick={onOpen}
      className="text-left"
      style={{
        padding: '14px 0 16px',
        borderBottom: `1px solid ${S.border}`,
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        borderBottomColor: S.border,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 9.5,
            color: kind.color,
            letterSpacing: 1.5,
            fontFamily: 'Inter',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          ◆ {kind.label}
        </span>
        <Flame size={11} color={S.rust} />
      </div>
      <div
        className="flex items-baseline"
        style={{
          gap: 10,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            flex: 1,
            fontFamily: S.serif,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.3,
            color: S.text,
          }}
        >
          {headline.title}
        </span>
        {headline.items?.length ? (
          <span
            style={{
              fontSize: 9.5,
              color: S.text3,
              fontFamily: 'Inter',
              letterSpacing: 0.3,
              flexShrink: 0,
            }}
          >
            {headline.items.length} 条
          </span>
        ) : null}
      </div>
      {excerpt && (
        <div
          style={{
            fontSize: 12,
            color: S.text2,
            lineHeight: 1.55,
            fontFamily: S.serif,
            marginBottom: 7,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </div>
      )}
      <div style={{ fontSize: 10, color: S.text3, fontFamily: 'Inter', letterSpacing: 0.4 }}>
        {kind.label} · 3 min
      </div>
    </button>
  )
}

function ArticleList({
  items,
  onOpen,
}: {
  items: CategoryHeadline[]
  onOpen: (headline: CategoryHeadline) => void
}) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ flex: 1 }}>
      {items.map((it, i) => {
        const kind = KIND_COLOR[it.category] || KIND_COLOR.technology
        // Show up to 2 item titles inside the same dashed block for this category.
        // Fall back to the category's own title if items are missing.
        const lines = (it.items && it.items.length > 0)
          ? it.items.slice(0, 2).map(x => x.title)
          : [it.title]
        return (
          <div
            key={i}
            style={{
              padding: '8px 0',
              borderBottom: `1px dashed ${S.borderSoft}`,
            }}
          >
            {lines.map((line, j) => (
              <button
                key={j}
                onClick={() => onOpen(it)}
                className="flex items-baseline text-left w-full"
                style={{
                  gap: 10,
                  padding: j === 0 ? 0 : '4px 0 0 0',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 9.5,
                    // Only the first row displays the category label; following rows keep the slot for alignment
                    color: j === 0 ? kind.color : 'transparent',
                    width: 30,
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    letterSpacing: 1,
                    flexShrink: 0,
                  }}
                >
                  {kind.label}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    color: S.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: S.serif,
                  }}
                >
                  {line}
                </span>
                {j === 0 && it.items?.length ? (
                  <span
                    style={{
                      fontSize: 9.5,
                      color: S.text3,
                      fontFamily: 'Inter',
                      letterSpacing: 0.3,
                      flexShrink: 0,
                    }}
                  >
                    {it.items.length} 条
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}
