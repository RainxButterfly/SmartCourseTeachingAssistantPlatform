import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/mocks/db'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { CourseDetailPage } from '@/routes/courses/course-detail-page'
import { DashboardPage } from '@/routes/dashboard/dashboard-page'
import { useAuthStore } from '@/stores/auth-store'

const server = setupServer(...handlers)

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function renderDashboard() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  db.courses = courseFixtures.map((item) => ({ ...item }))
  db.materials = materialFixtures.map((item) => ({ ...item }))
  useAuthStore.setState({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    user: { id: 1, username: '星叶', avatar: null, email: 'demo@example.com' },
  })
})

describe('DashboardPage · 学习概览', () => {
  it('问候语带上当前用户，并渲染三个快捷入口', () => {
    renderDashboard()

    expect(screen.getByText(/^(夜深了|早上好|下午好|晚上好)，星叶$/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '上传资料' })).toHaveAttribute('href', '/courses')
    expect(screen.getByRole('link', { name: '新建对话' })).toHaveAttribute('href', '/chat')
    expect(screen.getByRole('link', { name: '开始练习' })).toHaveAttribute('href', '/quiz')
  })

  it('复用统计页的概览指标卡与最近活动流', async () => {
    renderDashboard()

    const overview = await screen.findByRole('region', { name: '总览指标' })
    expect(await within(overview).findByText('45 分钟')).toBeInTheDocument()
    expect(within(overview).getByText('82%')).toBeInTheDocument()

    const feed = await screen.findByRole('region', { name: '最近活动' })
    // 概览页只取 6 条
    expect(await within(feed).findAllByRole('listitem')).toHaveLength(6)
  })

  it('最近课程横滑卡渲染课程，「继续学习」直达该课程问答 Tab', async () => {
    renderDashboard()

    const recent = await screen.findByRole('region', { name: '最近课程' })
    const cards = await within(recent).findAllByRole('listitem')
    // 夹具共 6 门课，size=6 全部返回
    expect(cards).toHaveLength(6)

    expect(within(recent).getByRole('link', { name: '继续学习 操作系统' })).toHaveAttribute(
      'href',
      '/courses/1?tab=chat',
    )
    expect(within(recent).getByRole('link', { name: '全部课程' })).toHaveAttribute(
      'href',
      '/courses',
    )
  })
})

describe('课程详情 Tab 深链（概览页「继续学习」的目标）', () => {
  it('?tab=chat 直接落到问答 Tab，而不是资料 Tab', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/courses/1?tab=chat']}>
          <Routes>
            <Route path="/courses/:id" element={<CourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('向这门课的资料提问')).toBeInTheDocument()
    // 资料 Tab 的分页区不应出现
    expect(screen.queryByLabelText('资料分页')).not.toBeInTheDocument()
  })

  it('非法 tab 参数回落到资料 Tab', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/courses/1?tab=bogus']}>
          <Routes>
            <Route path="/courses/:id" element={<CourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // 资料 Tab 的表格出现（夹具课程 1 有 12 份资料 → 有分页区）
    expect(await screen.findByLabelText('资料分页')).toBeInTheDocument()
  })
})
