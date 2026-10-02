import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { configureHttpAuth } from '@/lib/http'

export interface AuthUser {
  id: number
  username: string
  avatar: string | null
}

interface AuthSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'ta.auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)

/** 注入到 HTTP 层，避免 lib 反向依赖 store 造成循环引用 */
configureHttpAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => {
    useAuthStore.getState().clearSession()
  },
})

export function isAuthenticated(): boolean {
  return useAuthStore.getState().accessToken !== null
}
