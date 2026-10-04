import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { logout } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useUiStore } from '@/stores/ui-store'

/** 作者与开源仓库（与 PAD 文档头部、package.json 保持一致） */
const AUTHOR_NAME = '星河一叶Roxy'
const REPO_URL = 'https://github.com/RainxButterfly/SmartCourseTeachingAssistantPlatform'

const NAV_ITEMS = [
  { to: '/', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/courses', label: '课程', icon: BookOpen, end: false },
  { to: '/chat', label: '对话', icon: MessageSquareText, end: false },
  { to: '/quiz', label: '练习', icon: NotebookPen, end: false },
  { to: '/stats', label: '统计', icon: BarChart3, end: false },
  { to: '/settings', label: '设置', icon: Settings, end: false },
] as const

/** lucide 已下架品牌图标，这里内联 GitHub 官方 mark */
function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

/** 分包页面的加载占位（PAD §6.5：加载态统一 Skeleton） */
function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <p className="sr-only">页面加载中…</p>
    </div>
  )
}

interface SidebarBodyProps {
  /** 折叠为图标栏；抽屉里恒为展开 */
  collapsed: boolean
  /** 桌面上的收起/展开回调；不传则不渲染该按钮（抽屉里不需要） */
  onToggle?: () => void
  /** 点击导航项后的回调；抽屉里用于自动关闭 */
  onNavigate?: () => void
}

/** 侧边栏内容 —— 桌面固定栏与窄屏抽屉共用，避免两处维护 */
function SidebarBody({ collapsed, onToggle, onNavigate }: SidebarBodyProps) {
  return (
    <>
      <div className="flex h-14 items-center gap-2 px-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        >
          助
        </span>
        {collapsed ? null : <span className="truncate font-semibold text-sm">智能课程助教</span>}
      </div>

      <nav aria-label="主导航" className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                isActive
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <item.icon aria-hidden="true" className="size-4 shrink-0" />
            {collapsed ? null : <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          title={`作者 ${AUTHOR_NAME} · 查看源码`}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground text-xs transition-colors',
            'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
            collapsed && 'justify-center px-0',
          )}
        >
          <GitHubMark />
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="block truncate">作者 {AUTHOR_NAME}</span>
              <span className="block truncate opacity-70">查看源码</span>
            </span>
          )}
        </a>
      </div>

      {onToggle === undefined ? null : (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start')}
            onClick={onToggle}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" />
                <span>收起侧边栏</span>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  )
}

export function AppLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  /** 窄屏（< md）下主导航改为抽屉，避免固定 240px 侧栏把正文挤到不可用 */
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isDark = theme === 'dark'

  const handleLogout = (): void => {
    const refreshToken = useAuthStore.getState().refreshToken
    const finish = (): void => {
      clearSession()
      navigate('/login', { replace: true })
    }

    if (refreshToken === null) {
      finish()
      return
    }

    // 先吊销 refresh token（PAD §7.1），失败也不阻断本地登出
    void logout(refreshToken)
      .catch(() => undefined)
      .finally(finish)
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        跳到主要内容
      </a>

      {/* 桌面固定侧栏：md 以下隐藏，改由顶部菜单按钮打开抽屉 */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarBody collapsed={collapsed} onToggle={toggleSidebar} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="gap-0 bg-sidebar p-0 text-sidebar-foreground">
          {/* 抽屉需要一个可访问标题；视觉上已由品牌行承担，故仅屏幕阅读器可见 */}
          <SheetTitle className="sr-only">主导航</SheetTitle>
          <SidebarBody collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="打开主导航"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <p className="min-w-0 truncate text-sm font-medium">
              {user ? `你好，${user.username}` : '你好'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="退出登录" onClick={handleLogout}>
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </header>

        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {/* 路由分包后页面组件会 suspend，占位统一走 Skeleton */}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
