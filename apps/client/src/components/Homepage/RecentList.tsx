import { useEffect, useState } from 'react'
import { db } from '../../db'
import { useAppStore } from '../../store/appStore'
import { useTreeStore } from '../../store/treeStore'

interface RecentItem {
  id: string
  title: string
  module: string
  type: 'doc' | 'thinking' | 'prototype'
  updatedAt: number
}

const dotColors: Record<RecentItem['type'], string> = {
  doc: 'bg-green-500',
  thinking: 'bg-blue-500',
  prototype: 'bg-orange-500',
}

const moduleLabels: Record<RecentItem['type'], string> = {
  doc: '写文档',
  thinking: 'AI 思考',
  prototype: 'AI 原型',
}

function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
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

export default function RecentList() {
  const [items, setItems] = useState<RecentItem[]>([])
  const { navigateTo } = useAppStore()

  useEffect(() => {
    async function load() {
      const merged: RecentItem[] = []

      // Load trees (thinking)
      const trees = await db.trees.orderBy('updatedAt').reverse().limit(5).toArray()
      for (const t of trees) {
        merged.push({
          id: t.id,
          title: t.title || '未命名思考',
          module: moduleLabels.thinking,
          type: 'thinking',
          updatedAt: t.updatedAt,
        })
      }

      // Load chat sessions (doc/prototype)
      const sessions = await db.chatSessions.orderBy('updatedAt').reverse().limit(5).toArray()
      for (const s of sessions) {
        const type = s.type === 'document' ? 'doc' : s.type === 'prototype' ? 'prototype' : null
        if (!type) continue
        merged.push({
          id: s.id,
          title: s.title || '未命名会话',
          module: moduleLabels[type],
          type,
          updatedAt: s.updatedAt,
        })
      }

      // Sort by updatedAt desc, take top 5
      merged.sort((a, b) => b.updatedAt - a.updatedAt)
      setItems(merged.slice(0, 5))
    }
    load()
  }, [])

  const handleClick = async (item: RecentItem) => {
    if (item.type === 'thinking') {
      // Load tree and navigate to thinking-tree
      const { loadTree, setCurrentNode } = useTreeStore.getState()
      await loadTree(item.id)
      const state = useTreeStore.getState()
      const rootNode = state.nodes.find(n => n.treeId === item.id && n.parentId === null)
      if (rootNode) {
        setCurrentNode(rootNode.id)
      }
      navigateTo('thinking-tree')
    } else if (item.type === 'doc') {
      navigateTo('doc')
    } else if (item.type === 'prototype') {
      navigateTo('prototype')
    }
  }

  if (items.length === 0) return null

  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary mb-3">最近使用</h2>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => handleClick(item)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-left"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColors[item.type]}`} />
            <span className="text-sm text-text-primary truncate flex-1">
              {item.title}
            </span>
            <span className="text-xs text-text-secondary shrink-0">
              {item.module} · {relativeTime(item.updatedAt)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
