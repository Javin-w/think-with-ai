import { useEffect, useState } from 'react'
import { MessageSquare, Code } from 'lucide-react'
import { db } from '../../db'
import { useAppStore } from '../../store/appStore'
import { useTreeStore } from '../../store/treeStore'

interface HistoryItem {
  id: string
  title: string
  type: 'thinking' | 'prototype'
  updatedAt: number
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
          title: t.title || '未命名',
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
          title: s.title || '未命名',
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

  if (items.length === 0) return null

  return (
    <div className="flex-1 overflow-y-auto px-3 mt-4">
      <div className="px-2 pb-2 text-[11px] font-medium text-text-primary/35 uppercase tracking-wider">
        最近
      </div>
      <div className="space-y-px">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => handleClick(item)}
            className="w-full flex items-center gap-2 px-2 py-[6px] rounded-md text-[12px] text-text-primary/50 hover:bg-black/[0.04] hover:text-text-primary transition-colors text-left"
          >
            {item.type === 'thinking'
              ? <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              : <Code className="w-3.5 h-3.5 shrink-0" />
            }
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
