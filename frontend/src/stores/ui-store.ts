import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Citation } from '@/schemas/conversation'

export type ThemeMode = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemeMode
  sidebarCollapsed: boolean
  /** 引用详情抽屉：当前查看的引用，null 表示抽屉关闭 */
  activeCitation: Citation | null
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  openCitation: (citation: Citation) => void
  closeCitation: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      activeCitation: null,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      openCitation: (citation) => set({ activeCitation: citation }),
      closeCitation: () => set({ activeCitation: null }),
    }),
    {
      name: 'ta.ui',
      // 抽屉内容属临时 UI 状态，不持久化
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)

/** 把主题模式落到 <html> 的 class 上，供 Tailwind v4 的 dark 变体识别 */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', shouldUseDark)
  root.style.colorScheme = shouldUseDark ? 'dark' : 'light'
}
