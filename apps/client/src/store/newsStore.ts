import { create } from 'zustand'
import type { NewsItem } from '@repo/types'

interface NewsStore {
  items: NewsItem[]
  isLoading: boolean
  lastUpdated: number | null
  error: string | null
  fetchNews: () => Promise<void>
  refreshNews: () => Promise<void>
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  items: [],
  isLoading: false,
  lastUpdated: null,
  error: null,

  fetchNews: async () => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error(`服务器错误 (${res.status})`)
      const data = await res.json()
      set({
        items: data.items,
        lastUpdated: data.lastUpdated || null,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : '获取新闻失败'
      set({ error: msg })
    } finally {
      set({ isLoading: false })
    }
  },

  refreshNews: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/news/refresh', { method: 'POST' })
      if (!res.ok) throw new Error(`刷新失败 (${res.status})`)
      const data = await res.json()
      set({
        items: data.items,
        lastUpdated: data.lastUpdated || null,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : '刷新新闻失败'
      set({ error: msg })
    } finally {
      set({ isLoading: false })
    }
  },
}))
