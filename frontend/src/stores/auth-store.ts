import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { refreshSession } from '@/features/auth/api'
import { configureHttpAuth } from '@/lib/http'

export interface AuthUser {
  id: number
  username: string
  avatar: string | null
  email: string
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
  /** refresh 轮换后更新 token（用户信息不变） */
  setTokens: (accessToken: string, refreshToken: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
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
  /**
   * 401 时用 refresh token 换新 access token（PAD §7.1 v0.13）。
   * 失败返回 null，由 http 层决定清会话跳登录；刷新走裸 axios，不会递归触发本回调。
   */
  refresh: async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken === null) return null

    try {
      const tokens = await refreshSession(refreshToken)
      useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token)
      return tokens.access_token
    } catch {
      return null
    }
  },
})

export function isAuthenticated(): boolean {
  return useAuthStore.getState().accessToken !== null
}
