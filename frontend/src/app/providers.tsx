import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type ReactNode, useEffect } from 'react'
import { Toaster } from 'sonner'

import { queryClient } from '@/lib/query-client'
import { applyTheme, useUiStore } from '@/stores/ui-store'

/** 把主题模式同步到 <html>，并跟随系统偏好变化 */
function ThemeController(): null {
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return undefined

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => applyTheme('system')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeController />
      {children}
      <Toaster richColors closeButton position="top-center" />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
