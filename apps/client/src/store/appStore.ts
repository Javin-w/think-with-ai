import { create } from 'zustand'

export type AppView = 'home' | 'news' | 'news-admin' | 'doc' | 'prototype' | 'thinking-list' | 'thinking-tree'

interface AppStore {
  currentView: AppView
  navigateTo: (view: AppView) => void
  goHome: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentView: 'home',

  navigateTo: (view) => set({ currentView: view }),

  goHome: () => set({ currentView: 'home' }),
}))
