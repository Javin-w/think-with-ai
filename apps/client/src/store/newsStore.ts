import { create } from 'zustand'

interface BriefingSummary {
  id: string
  title: string
  date: string
  createdAt: number
}

interface BriefingFull extends BriefingSummary {
  content: string
}

interface NewsStore {
  briefings: BriefingSummary[]
  currentBriefing: BriefingFull | null
  isLoading: boolean
  error: string | null
  isFetching: boolean
  todaySummary: string | null
  todayQuestions: string[] | null
  fetchBriefings: () => Promise<void>
  fetchBriefing: (id: string) => Promise<void>
  createBriefing: (data: { title: string; content: string; date: string }) => Promise<void>
  deleteBriefing: (id: string) => Promise<void>
  fetchDaily: (date?: string) => Promise<void>
  fetchToday: () => Promise<void>
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  briefings: [],
  currentBriefing: null,
  isLoading: false,
  isFetching: false,
  error: null,
  todaySummary: null,
  todayQuestions: null,

  fetchBriefings: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ briefings: data.briefings })
      // Auto-select first if none selected
      if (!get().currentBriefing && data.briefings.length > 0) {
        get().fetchBriefing(data.briefings[0].id)
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '获取简报列表失败' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchBriefing: async (id: string) => {
    try {
      const res = await fetch(`/api/news/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ currentBriefing: data })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '获取简报失败' })
    }
  },

  createBriefing: async (data) => {
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await get().fetchBriefings()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '创建简报失败' })
    }
  },

  deleteBriefing: async (id: string) => {
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { currentBriefing } = get()
      if (currentBriefing?.id === id) set({ currentBriefing: null })
      await get().fetchBriefings()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '删除简报失败' })
    }
  },

  fetchToday: async () => {
    try {
      const res = await fetch('/api/news/today')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ todaySummary: data.summary, todayQuestions: data.questions })
    } catch {
      // silent fail — homepage modules just won't show
    }
  },

  fetchDaily: async (date?: string) => {
    set({ isFetching: true, error: null })
    try {
      const res = await fetch('/api/news/fetch-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date || new Date().toISOString().slice(0, 10) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await get().fetchBriefings()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '抓取日报失败' })
    } finally {
      set({ isFetching: false })
    }
  },
}))
