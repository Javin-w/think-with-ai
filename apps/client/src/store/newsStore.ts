import { create } from 'zustand'
import type { NewsItem } from '@repo/types'

interface NewsStore {
  items: NewsItem[]
  isLoading: boolean
  lastUpdated: number | null
  fetchNews: () => Promise<void>
  refreshNews: () => Promise<void>
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  items: [],
  isLoading: false,
  lastUpdated: null,

  fetchNews: async () => {
    if (get().isLoading) return
    set({ isLoading: true })
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({
        items: data.items,
        lastUpdated: data.lastUpdated || null,
      })
    } catch (error) {
      console.error('[newsStore] fetchNews failed:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  refreshNews: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/news/refresh', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({
        items: data.items,
        lastUpdated: data.lastUpdated || null,
      })
    } catch (error) {
      console.error('[newsStore] refreshNews failed:', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))
