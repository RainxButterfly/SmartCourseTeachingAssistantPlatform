import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth-store'

/**
 * mock 模式下的开发便利开关：冷加载时确保本地存在会话，从而直接进入受保护路由。
 *
 * 语义由 VITE_MOCK_AUTO_LOGIN 单独决定，无隐式状态：
 * - `true`（默认）：每次冷加载都确保已登录 —— 适合日常开发，但无法验证「未登录被守卫拦截」。
 * - `false`：完全不注入 —— 用于验证登录页、路由守卫与 redirect 回跳。
 *
 * 真实后端联调时（VITE_ENABLE_MOCK=false）本函数不会被调用。
 */
export function ensureMockSession(): void {
  if (!env.mockAutoLogin) return

  const state = useAuthStore.getState()
  if (state.accessToken) return

  state.setSession({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: { id: 1, username: '张三', avatar: null, email: 'demo@example.com' },
  })
}
