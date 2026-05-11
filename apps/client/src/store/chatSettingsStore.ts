import { create } from 'zustand'

const STORAGE_KEY = 'chatSettings.webSearchEnabled'

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === null) return true // default on
  return v === 'true'
}

interface ChatSettingsState {
  webSearchEnabled: boolean
  toggleWebSearch: () => void
}

export const useChatSettingsStore = create<ChatSettingsState>((set) => ({
  webSearchEnabled: readInitial(),
  toggleWebSearch: () =>
    set((s) => {
      const next = !s.webSearchEnabled
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // quota / privacy mode — state still toggles, just no persistence
      }
      return { webSearchEnabled: next }
    }),
}))
