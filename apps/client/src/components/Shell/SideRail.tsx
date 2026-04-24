import { useEffect, useMemo, useState } from 'react'
import { Book, Home, Network, Sparkles } from 'lucide-react'
import { useAppStore, type AppView } from '../../store/appStore'
import { useTreeStore } from '../../store/treeStore'
import { db } from '../../db/index'
import { EXAMPLE_TREE_TITLE, seedExampleTree } from '../../utils/seedExampleTree'

/** 已展开节点数达到该阈值即视为满进度（100%）。 */
const FULL_THRESHOLD = 7

const C = {
  panel: '#15140f',
  text: '#f5f2ea',
  text2: '#a8a399',
  text3: '#6c6760',
  border: 'rgba(245,242,234,0.08)',
  borderSoft: 'rgba(245,242,234,0.05)',
  accent: '#d4a574',
  serif: '"Noto Serif SC", "Fraunces", Georgia, serif',
}

interface SideRailProps {
  /** Force an active view. Defaults to current appStore view. */
  active?: AppView
  /** Collapse to 52px icon-only mode — used by thinking-tree alongside TreeNavPanel. */
  compact?: boolean
}

/** A navigation group "anchor" — which top-level section a given AppView belongs to. */
type NavGroup = 'home' | 'trees' | 'prototypes' | 'news'

function viewToGroup(v: AppView): NavGroup {
  if (v === 'thinking-list' || v === 'thinking-tree') return 'trees'
  if (v === 'prototype' || v === 'prototype-list') return 'prototypes'
  if (v === 'news') return 'news'
  return 'home'
}

export default function SideRail({ active, compact }: SideRailProps) {
  const { currentView, navigateTo } = useAppStore()
  const { trees, loadTrees } = useTreeStore()
  // Re-derive progress when the currently-loaded tree's nodes change (e.g. after sending a message),
  // so the bar in the SideRail reflects fresh "explored" counts without a manual refresh.
  const liveNodes = useTreeStore((s) => s.nodes)

  useEffect(() => {
    if (!trees.length) loadTrees()
  }, [trees.length, loadTrees])

  const group = viewToGroup(active ?? currentView)
  const sorted = useMemo(() => [...trees].sort((a, b) => b.updatedAt - a.updatedAt), [trees])
  const topTrees = sorted.slice(0, 4)

  const topTreeIds = topTrees.map((t) => t.id)
  const [progressMap, setProgressMap] = useState<Record<string, { explored: number; total: number }>>({})

  // Recompute progress whenever the visible tree set changes, or whenever the in-memory
  // `nodes` slice mutates (covers the case where the user is typing in the currently open tree).
  const liveSig = `${liveNodes.length}:${liveNodes.reduce((acc, n) => acc + (n.messages.length > 0 ? 1 : 0), 0)}`
  const idsKey = topTreeIds.join('|')
  useEffect(() => {
    if (!topTreeIds.length) {
      setProgressMap({})
      return
    }
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        topTreeIds.map(async (id) => {
          const ns = await db.nodes.where('treeId').equals(id).toArray()
          const total = ns.length
          const explored = ns.reduce((acc, n) => acc + (n.messages.length > 0 ? 1 : 0), 0)
          return [id, { explored, total }] as const
        })
      )
      if (!cancelled) setProgressMap(Object.fromEntries(entries))
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, liveSig])

  const openTree = async (id: string) => {
    const { loadTree, setCurrentNode } = useTreeStore.getState()
    await loadTree(id)
    const s = useTreeStore.getState()
    const root = s.nodes.find(n => n.treeId === id && n.parentId === null)
    if (root) setCurrentNode(root.id)
    navigateTo('thinking-tree')
  }

  const navItems: Array<{
    key: NavGroup
    icon: React.ReactNode
    label: string
    count?: number
    onClick: () => void
  }> = [
    {
      key: 'home',
      icon: <Home size={13} />,
      label: '主页',
      onClick: () => navigateTo('home'),
    },
    {
      key: 'trees',
      icon: <Network size={13} />,
      label: '对话树',
      count: trees.length || undefined,
      onClick: () => navigateTo('thinking-list'),
    },
    {
      key: 'prototypes',
      icon: <Sparkles size={13} />,
      label: '造物台',
      onClick: () => navigateTo('prototype-list'),
    },
    {
      key: 'news',
      icon: <Book size={13} />,
      label: '每日早读',
      onClick: () => navigateTo('news'),
    },
  ]

  // ─── Compact (icon-only) rail ────────────────────────────────
  if (compact) {
    return (
      <aside
        className="flex flex-col"
        style={{
          width: 52,
          borderRight: `1px solid ${C.border}`,
          padding: '18px 0',
          background: C.panel,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigateTo('home')}
          className="grid place-items-center mx-auto"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: `1px solid ${C.accent}`,
            color: C.accent,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: C.serif,
            background: 'transparent',
            marginBottom: 18,
            cursor: 'pointer',
          }}
        >
          P
        </button>
        {navItems.map((it) => {
          const isActive = it.key === group
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              title={it.label}
              className="grid place-items-center mx-auto"
              style={{
                width: 36,
                height: 36,
                marginBottom: 4,
                border: 'none',
                background: 'transparent',
                color: isActive ? C.accent : C.text2,
                borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                marginLeft: -2,
                cursor: 'pointer',
              }}
            >
              {it.icon}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div
          style={{
            padding: '10px 0',
            borderTop: `1px solid ${C.borderSoft}`,
            fontSize: 9.5,
            color: C.text3,
            fontFamily: 'Inter',
            textAlign: 'center',
          }}
        >
          ⌘K
        </div>
      </aside>
    )
  }

  // ─── Full rail (190px) ───────────────────────────────────────
  return (
    <aside
      className="flex flex-col"
      style={{
        width: 190,
        borderRight: `1px solid ${C.border}`,
        padding: '18px 14px',
        background: C.panel,
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-2.5" style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigateTo('home')}
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: `1px solid ${C.accent}`,
            color: C.accent,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: C.serif,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          P
        </button>
        <div style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: 0.3, color: C.text }}>
          PMtoken
        </div>
      </div>

      <RailSection title="书房" />
      {navItems.map((it) => (
        <RailNav
          key={it.key}
          icon={it.icon}
          label={it.label}
          count={it.count}
          active={it.key === group}
          onClick={it.onClick}
        />
      ))}

      <RailSection title="正在读" style={{ paddingTop: 18 }} />
      {topTrees.length > 0 ? (
        topTrees.map((t) => {
          const p = progressMap[t.id]
          const explored = p?.explored ?? 0
          // 7 个已展开节点视为 100%（饱和阈值），超出仍显示满格。
          const pct = Math.min(100, Math.round((explored / FULL_THRESHOLD) * 100))
          return (
            <RailRecent
              key={t.id}
              label={t.title || '未命名'}
              read={pct}
              dim={explored === 0}
              tooltip={
                explored === 0
                  ? '尚未展开任何节点'
                  : explored >= FULL_THRESHOLD
                    ? `已展开 ${explored} 节点 · 已充分探索`
                    : `已展开 ${explored} / ${FULL_THRESHOLD} 节点`
              }
              onClick={() => openTree(t.id)}
            />
          )
        })
      ) : (
        <RailRecent
          label={`样例 · ${EXAMPLE_TREE_TITLE}`}
          read={0}
          dim
          tooltip="点击载入样例对话树"
          onClick={async () => {
            await seedExampleTree()
            navigateTo('thinking-tree')
          }}
        />
      )}

      <div style={{ flex: 1 }} />

      <div
        className="flex justify-between"
        style={{
          padding: '10px 8px',
          borderTop: `1px solid ${C.borderSoft}`,
          fontSize: 10.5,
          color: C.text3,
          fontFamily: 'Inter',
        }}
      >
        <span>PM · Pro</span>
        <span>⌘K</span>
      </div>
    </aside>
  )
}

function RailSection({ title, style }: { title: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        color: C.text3,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        padding: '4px 6px 8px',
        fontFamily: 'Inter',
        fontWeight: 500,
        ...style,
      }}
    >
      {title}
    </div>
  )
}

function RailNav({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center text-left"
      style={{
        gap: 9,
        padding: '6px 8px 6px 14px',
        marginLeft: -14,
        fontSize: 12.5,
        color: active ? C.accent : C.text2,
        background: 'transparent',
        border: 'none',
        borderLeft: active ? `2px solid ${C.accent}` : '2px solid transparent',
        cursor: 'pointer',
      }}
    >
      <span className="flex">{icon}</span>
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            color: C.text3,
            fontFamily: 'Inter',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function RailRecent({
  label,
  read,
  dim,
  tooltip,
  onClick,
}: {
  label: string
  read: number
  dim?: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left"
      title={tooltip}
      style={{
        padding: '5px 8px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: dim ? C.text3 : C.text2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ height: 2, background: C.borderSoft }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, read))}%`,
            height: '100%',
            background: dim ? C.text3 : C.accent,
          }}
        />
      </div>
    </button>
  )
}
