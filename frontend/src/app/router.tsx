import { createBrowserRouter, redirect } from 'react-router'

import { ComingSoon } from '@/components/shared/coming-soon'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { ChatPage } from '@/routes/chat/chat-page'
import { CourseDetailPage } from '@/routes/courses/course-detail-page'
import { CourseFormPage } from '@/routes/courses/course-form-page'
import { CourseListPage } from '@/routes/courses/course-list-page'
import { NotFoundPage } from '@/routes/not-found-page'
import { QuizPage } from '@/routes/quiz/quiz-page'
import { QuizResultPage } from '@/routes/quiz/quiz-result-page'
import { SettingsPage } from '@/routes/settings/settings-page'
import { isAuthenticated } from '@/stores/auth-store'

/**
 * 路由表 —— 严格对齐 PAD §6.1，不新增任何路由。
 * 守卫：AuthLayout 下已登录则跳首页；AppLayout 下未登录则保留原目标跳 /login。
 */

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
        element: <ComingSoon title="登录" description="表单校验与 JWT 会话接入中" />,
      },
      {
        path: '/register',
        element: <ComingSoon title="注册" description="邮箱注册与密码强度校验接入中" />,
      },
    ],
  },
  {
    element: <AppLayout />,
    loader: requireAuth,
    children: [
      {
        index: true,
        element: <ComingSoon title="学习概览" description="指标卡、最近课程与活动流" />,
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
        element: <ComingSoon title="解析进度" description="深链兜底页，主路径在课程详情内联展示" />,
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
        element: <ComingSoon title="学习统计" description="趋势图、薄弱点排行与活动流" />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
