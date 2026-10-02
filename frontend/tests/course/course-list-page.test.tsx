import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { CourseListPage } from '@/routes/courses/course-list-page'

const server = setupServer(...handlers)

/** 探针：暴露当前 URL query，并提供后退入口用于验证浏览器历史语义 */
function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <p data-testid="location-search">{location.search}</p>
      <button type="button" onClick={() => void navigate(-1)}>
        后退
      </button>
    </>
  )
}

function renderCourseListPage(initialEntries: string[] = ['/courses']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LocationProbe />
        <Routes>
          <Route path="/courses" element={<CourseListPage />} />
          <Route path="/courses/new" element={<p>新建课程页</p>} />
          <Route path="/courses/:id" element={<p>课程详情页</p>} />
          <Route path="/courses/:id/edit" element={<p>编辑课程页</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function searchParam(): string {
  return screen.getByTestId('location-search').textContent ?? ''
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

// 每个用例重置内存库，避免「删除」用例污染后续断言
beforeEach(() => {
  db.courses = courseFixtures.map((item) => ({ ...item }))
  db.materials = materialFixtures.map((item) => ({ ...item }))
  db.conversations = conversationFixtures.map((item) => ({ ...item }))
  db.parseStatusByMaterial = {}
  db.sequences = { course: 1000, material: 1000, conversation: 1000, task: 1000 }
})

describe('CourseListPage', () => {
  it('渲染课程卡片网格，展示编号、名称与资料数', async () => {
    renderCourseListPage()

    expect(await screen.findByText('操作系统')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(6)

    const firstCard = screen.getByTestId('course-card-1')
    expect(within(firstCard).getByText('OS2026')).toBeInTheDocument()
    expect(within(firstCard).getByText('资料 4 份')).toBeInTheDocument()
    expect(within(firstCard).getByText('会话 2 个')).toBeInTheDocument()
    expect(within(firstCard).getByText('李老师 · 2026秋')).toBeInTheDocument()

    expect(screen.getByText('共 6 门课程')).toBeInTheDocument()
  })

  it('搜索框按 300ms 防抖过滤，命中课程编号', async () => {
    const user = userEvent.setup()
    renderCourseListPage()

    await screen.findByText('操作系统')
    await user.type(screen.getByRole('searchbox', { name: '搜索课程' }), 'OS2026')

    await waitFor(() => {
      expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(1)
    })
    expect(screen.getByText('操作系统')).toBeInTheDocument()
  })

  it('筛选无结果时展示可重置的空态，而不是「还没有课程」', async () => {
    const user = userEvent.setup()
    renderCourseListPage()

    await screen.findByText('操作系统')
    await user.type(screen.getByRole('searchbox', { name: '搜索课程' }), '不存在的课程名')

    expect(await screen.findByText('没有匹配的课程')).toBeInTheDocument()
    expect(screen.queryByText('还没有课程')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清空筛选' }))
    await waitFor(() => {
      expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(6)
    })
  })

  it('「我的」筛选只保留当前用户创建的课程', async () => {
    const user = userEvent.setup()
    renderCourseListPage()

    await screen.findByText('操作系统')
    await user.click(
      within(screen.getByRole('group', { name: '课程范围' })).getByRole('button', { name: '我的' }),
    )

    await waitFor(() => {
      expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(3)
    })
    // 计算机网络 与 数据库系统 的 owner 是李四，应被过滤掉
    expect(screen.queryByText('计算机网络')).not.toBeInTheDocument()
  })

  it('删除存在子资源的课程时先弹级联确认，确认后才真正删除', async () => {
    const user = userEvent.setup()
    renderCourseListPage()

    await screen.findByText('操作系统')
    await user.click(
      within(screen.getByTestId('course-card-1')).getByRole('button', { name: '删除' }),
    )

    // 第一次确认（cascade=false）→ 后端返回 1006 → 切到级联确认态
    await user.click(await screen.findByRole('button', { name: '确认删除' }))

    expect(await screen.findByText('确认级联删除')).toBeInTheDocument()
    expect(screen.getByText(/12 份资料/)).toBeInTheDocument()
    expect(screen.getByText(/2 个会话/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '确认并一并删除' }))

    await waitFor(() => {
      expect(screen.queryByTestId('course-card-1')).not.toBeInTheDocument()
    })
    expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(5)
  })

  it('点击「新建课程」跳转到课程表单路由', async () => {
    const user = userEvent.setup()
    renderCourseListPage()

    await screen.findByText('操作系统')
    await user.click(screen.getByRole('button', { name: '新建课程' }))

    expect(await screen.findByText('新建课程页')).toBeInTheDocument()
  })

  describe('URL 状态同步（PAD §6.1 v0.3）', () => {
    it('URL query 是筛选的事实源：带 scope=mine 打开即只显示我的课程', async () => {
      renderCourseListPage(['/courses?scope=mine'])

      await waitFor(() => {
        expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(3)
      })
      expect(screen.queryByText('计算机网络')).not.toBeInTheDocument()
      // 已是默认值的项不应被写回 URL
      expect(searchParam()).toBe('?scope=mine')
    })

    it('离散筛选写入 URL，默认值不落 URL', async () => {
      const user = userEvent.setup()
      renderCourseListPage()

      await screen.findByText('操作系统')

      const scopeGroup = screen.getByRole('group', { name: '课程范围' })
      await user.click(within(scopeGroup).getByRole('button', { name: '我的' }))
      await waitFor(() => {
        expect(searchParam()).toBe('?scope=mine')
      })

      // 切回默认值 → 该键被移除，URL 保持干净
      await user.click(within(scopeGroup).getByRole('button', { name: '全部' }))
      await waitFor(() => {
        expect(searchParam()).toBe('')
      })
    })

    it('学期与排序写入 URL，且学期选项来自 GET /courses/semesters', async () => {
      const user = userEvent.setup()
      renderCourseListPage()

      await screen.findByText('操作系统')
      // 学期字典接口返回 2026秋 / 2025春
      expect(await screen.findByRole('button', { name: '2026秋' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '2026秋' }))
      await waitFor(() => {
        expect(searchParam()).toBe('?semester=2026%E7%A7%8B')
      })
      // 只剩 2026秋 的 4 门课
      expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(4)
    })

    it('关键词经防抖后写入 URL，供分享与刷新保持', async () => {
      const user = userEvent.setup()
      renderCourseListPage()

      await screen.findByText('操作系统')
      await user.type(screen.getByRole('searchbox', { name: '搜索课程' }), 'OS2026')

      await waitFor(() => {
        expect(searchParam()).toBe('?keyword=OS2026')
      })
      await waitFor(() => {
        expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(1)
      })
    })

    it('后退抹掉 URL 关键词后，本地输入态被回灌而不是把旧值写回（防回归）', async () => {
      const user = userEvent.setup()
      renderCourseListPage()

      await screen.findByText('操作系统')

      // push 一条历史：scope=mine
      const scopeGroup = screen.getByRole('group', { name: '课程范围' })
      await user.click(within(scopeGroup).getByRole('button', { name: '我的' }))
      await waitFor(() => {
        expect(searchParam()).toBe('?scope=mine')
      })

      // replace 写入关键词（不新增历史）
      const searchbox = screen.getByRole('searchbox', { name: '搜索课程' })
      await user.type(searchbox, 'OS2026')
      await waitFor(() => {
        expect(searchParam()).toBe('?scope=mine&keyword=OS2026')
      })

      // 后退：URL 回到上一态，输入框应同步清空
      await user.click(screen.getByRole('button', { name: '后退' }))
      await waitFor(() => {
        expect(searchParam()).toBe('')
      })
      expect(searchbox).toHaveValue('')

      // 越过防抖窗口后仍不应被写回 —— 这正是修复前的缺陷
      await new Promise((resolve) => {
        setTimeout(resolve, 400)
      })
      expect(searchParam()).toBe('')
      expect(screen.getAllByTestId(/^course-card-/)).toHaveLength(6)
    })
  })
})
