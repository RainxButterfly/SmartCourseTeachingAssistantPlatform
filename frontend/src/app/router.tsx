import { lazy } from 'react'
import { createBrowserRouter, redirect } from 'react-router'

import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { LoginPage } from '@/routes/auth/login-page'
import { RegisterPage } from '@/routes/auth/register-page'
import { NotFoundPage } from '@/routes/not-found-page'
import { isAuthenticated } from '@/stores/auth-store'

/**
 * 路由表 —— 严格对齐 PAD §6.1，不新增任何路由。
 * 守卫：AuthLayout 下已登录则跳首页；AppLayout 下未登录则保留原目标跳 /login。
 *
 * **路由级代码分割（PAD §6.5）**：业务页面全部按访问才加载。
 * 在此之前所有页面静态引入，首包 `assets/app-*.js` 达 900 kB 以上（recharts 占大头）；
 * 分包后首屏只需 AppLayout + 当前页。
 * 登录 / 注册 / 404 保持同步加载 —— 它们是未登录用户与错误路径的第一屏，
 * 再切一刀只会多一次网络往返，得不偿失。
 * 分包页面的加载占位由 `AppLayout` 的 `Suspense` 兜底。
 */
const DashboardPage = lazy(() =>
  import('@/routes/dashboard/dashboard-page').then((module) => ({ default: module.DashboardPage })),
)
const CourseListPage = lazy(() =>
  import('@/routes/courses/course-list-page').then((module) => ({
    default: module.CourseListPage,
  })),
)
const CourseFormPage = lazy(() =>
  import('@/routes/courses/course-form-page').then((module) => ({
    default: module.CourseFormPage,
  })),
)
const CourseDetailPage = lazy(() =>
  import('@/routes/courses/course-detail-page').then((module) => ({
    default: module.CourseDetailPage,
  })),
)
const ParseRedirectPage = lazy(() =>
  import('@/routes/materials/parse-redirect-page').then((module) => ({
    default: module.ParseRedirectPage,
  })),
)
const ChatPage = lazy(() =>
  import('@/routes/chat/chat-page').then((module) => ({ default: module.ChatPage })),
)
const QuizPage = lazy(() =>
  import('@/routes/quiz/quiz-page').then((module) => ({ default: module.QuizPage })),
)
const QuizResultPage = lazy(() =>
  import('@/routes/quiz/quiz-result-page').then((module) => ({ default: module.QuizResultPage })),
)
const StatsPage = lazy(() =>
  import('@/routes/stats/stats-page').then((module) => ({ default: module.StatsPage })),
)
const SettingsPage = lazy(() =>
  import('@/routes/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
)

function requireAuth({ request }: { request: Request }): null {
  if (isAuthenticated()) return null
  const url = new URL(request.url)
  const redirectTo = `${url.pathname}${url.search}`
  throw redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`)
}

function redirectIfAuthenticated(): null {
  if (isAuthenticated()) throw redirect('/')
  return null
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    loader: redirectIfAuthenticated,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <AppLayout />,
    loader: requireAuth,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'courses',
        element: <CourseListPage />,
      },
      {
        path: 'courses/new',
        element: <CourseFormPage />,
      },
      {
        path: 'courses/:id/edit',
        element: <CourseFormPage />,
      },
      {
        path: 'courses/:id',
        element: <CourseDetailPage />,
      },
      {
        path: 'materials/:id/parse',
        element: <ParseRedirectPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'chat/:conversationId',
        element: <ChatPage />,
      },
      {
        path: 'quiz',
        element: <QuizPage />,
      },
      {
        path: 'quiz/:attemptId',
        element: <QuizResultPage />,
      },
      {
        path: 'stats',
        element: <StatsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
