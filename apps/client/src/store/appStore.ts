import { create } from 'zustand'

export type AppView = 'home' | 'news' | 'prototype' | 'prototype-list' | 'thinking-list' | 'thinking-tree'

interface AppStore {
  currentView: AppView
  previousView: AppView | null
  navigateTo: (view: AppView) => void
  goBack: () => void
  goHome: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'home',
  previousView: null,

  navigateTo: (view) => set({ previousView: get().currentView, currentView: view }),

  goBack: () => {
    const prev = get().previousView
    if (prev) {
      set({ currentView: prev, previousView: null })
    } else {
      set({ currentView: 'home' })
    }
  },

  goHome: () => set({ previousView: get().currentView, currentView: 'home' }),
}))
