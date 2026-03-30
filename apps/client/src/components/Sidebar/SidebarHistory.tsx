/**
 * SidebarHistory — recent sessions in the sidebar
 * Reuses data loading logic from the old RecentList component
 */

import { useEffect, useState } from 'react'
import { db } from '../../db'
import { useAppStore } from '../../store/appStore'
import { useTreeStore } from '../../store/treeStore'

interface HistoryItem {
  id: string
  title: string
  type: 'thinking' | 'prototype'
  updatedAt: number
}

const TYPE_ICONS: Record<HistoryItem['type'], string> = {
  thinking: '🧠',
  prototype: '🎨',
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export default function SidebarHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const { navigateTo } = useAppStore()

  useEffect(() => {
    async function load() {
      const merged: HistoryItem[] = []

      const trees = await db.trees.orderBy('updatedAt').reverse().limit(8).toArray()
      for (const t of trees) {
        merged.push({
          id: t.id,
          title: t.title || '未命名思考',
          type: 'thinking',
          updatedAt: t.updatedAt,
        })
      }

      const sessions = await db.chatSessions
        .where('type')
        .equals('prototype')
        .reverse()
        .sortBy('updatedAt')
      for (const s of sessions.slice(0, 8)) {
        merged.push({
          id: s.id,
          title: s.title || '未命名原型',
          type: 'prototype',
          updatedAt: s.updatedAt,
        })
      }

      merged.sort((a, b) => b.updatedAt - a.updatedAt)
      setItems(merged.slice(0, 10))
    }
    load()
  }, [])

  const handleClick = async (item: HistoryItem) => {
    if (item.type === 'thinking') {
      const { loadTree, setCurrentNode } = useTreeStore.getState()
      await loadTree(item.id)
      const state = useTreeStore.getState()
      const rootNode = state.nodes.find((n) => n.treeId === item.id && n.parentId === null)
      if (rootNode) setCurrentNode(rootNode.id)
      navigateTo('thinking-tree')
    } else {
      navigateTo('prototype')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.length === 0 ? (
        <div className="px-3 py-4 text-xs text-text-secondary/40 text-center">
          暂无记录
        </div>
      ) : (
        <>
          <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
            最近
          </div>
          <div className="space-y-0.5">
            {items.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleClick(item)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors text-left"
              >
                <span className="shrink-0">{TYPE_ICONS[item.type]}</span>
                <span className="truncate flex-1">{item.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
