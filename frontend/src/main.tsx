import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/app/index.css'

/** 仅在 VITE_ENABLE_MOCK=true 时动态引入 MSW，生产构建下整包被 tree-shake */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') return

  const { worker } = await import('@/mocks/browser')
  const { ensureMockSession } = await import('@/mocks/ensure-session')

  await worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })

  // 必须在路由创建之前注入会话，否则初始 loader 会读到空 token 并判为未登录
  ensureMockSession()
}

async function bootstrap(): Promise<void> {
  await enableMocking()

  // 动态引入 App，保证路由模块的求值发生在 mock 会话注入之后
  const { App } = await import('@/app/app')

  const container = document.getElementById('root')
  if (!container) throw new Error('未找到 #root 挂载节点')

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
