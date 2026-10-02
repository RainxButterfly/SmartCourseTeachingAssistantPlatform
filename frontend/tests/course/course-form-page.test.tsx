import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { CourseFormPage } from '@/routes/courses/course-form-page'

const server = setupServer(...handlers)

function CourseDetailProbe() {
  const { id } = useParams()
  return <p>课程详情页 {id}</p>
}

function renderCourseFormPage(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/courses/new" element={<CourseFormPage />} />
          <Route path="/courses/:id/edit" element={<CourseFormPage />} />
          <Route path="/courses/:id" element={<CourseDetailProbe />} />
          <Route path="/courses" element={<p>课程列表页</p>} />
        </Routes>
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
  db.conversations = conversationFixtures.map((item) => ({ ...item }))
  db.parseStatusByMaterial = {}
  db.sequences = { course: 1000, material: 1000, conversation: 1000, task: 1000 }
})

describe('CourseFormPage · 新建', () => {
  it('空表单提交时按 Zod 规则逐字段报错，且不发起请求', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/new'])

    await user.click(screen.getByRole('button', { name: '创建课程' }))

    expect(await screen.findByText('课程名称需 2-50 字')).toBeInTheDocument()
    expect(screen.getByText('课程编号为 2-32 位字母、数字、下划线或中划线')).toBeInTheDocument()
    // 仍停留在表单页
    expect(screen.queryByText(/课程详情页/)).not.toBeInTheDocument()
  })

  it('填写合法数据后提交，创建成功并跳转课程详情', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/new'])

    await user.type(screen.getByLabelText('课程名称'), '算法设计与分析')
    await user.type(screen.getByLabelText('课程编号'), 'ADA2026')
    await user.type(screen.getByLabelText('任课教师'), '陈老师')
    await user.click(screen.getByRole('button', { name: '创建课程' }))

    expect(await screen.findByText(/课程详情页/)).toBeInTheDocument()

    const created = db.courses.find((item) => item.code === 'ADA2026')
    expect(created?.name).toBe('算法设计与分析')
    expect(created?.teacher).toBe('陈老师')
  })

  it('课程编号重复时把服务端 1005 映射到 code 字段，而不是弹通用错误', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/new'])

    await user.type(screen.getByLabelText('课程名称'), '重复编号课程')
    await user.type(screen.getByLabelText('课程编号'), 'OS2026')
    await user.click(screen.getByRole('button', { name: '创建课程' }))

    expect(await screen.findByText('该课程编号已被占用，请换一个')).toBeInTheDocument()
    expect(screen.queryByText(/课程详情页/)).not.toBeInTheDocument()
  })

  it('课程编号失焦即预检，被占用时给出带课程名的精准提示（v0.4）', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/new'])

    await user.type(screen.getByLabelText('课程编号'), 'OS2026')
    // 焦点移开触发 blur
    await user.tab()

    expect(await screen.findByText('该课程编号已被《操作系统》占用')).toBeInTheDocument()

    // 改成未被占用的编号并再次失焦 → 提示消失
    const codeInput = screen.getByLabelText('课程编号')
    await user.clear(codeInput)
    await user.type(codeInput, 'NEW2026')
    await user.tab()

    await waitFor(() => {
      expect(screen.queryByText(/已被《/)).not.toBeInTheDocument()
    })
  })

  it('编辑态未改动编号时不触发预检请求', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/1/edit'])

    const codeInput = await screen.findByLabelText('课程编号')
    expect(codeInput).toHaveValue('OS2026')

    await user.click(codeInput)
    await user.tab()

    await waitFor(() => {
      expect(screen.queryByText(/已被《/)).not.toBeInTheDocument()
    })
  })
})

describe('CourseFormPage · 编辑', () => {
  it('回填既有课程数据（含唯一性字段课程编号）', async () => {
    renderCourseFormPage(['/courses/2/edit'])

    await waitFor(() => {
      expect(screen.getByLabelText('课程编号')).toHaveValue('DSA2026')
    })
    expect(screen.getByLabelText('课程名称')).toHaveValue('数据结构与算法')
    expect(screen.getByLabelText('任课教师')).toHaveValue('王老师')
    // 默认可见性为 PRIVATE，且表单按钮文案切到编辑态
    expect(screen.getByRole('button', { name: '保存修改' })).toBeInTheDocument()
  })

  it('保存修改后走 PUT 并在服务端生效，随后跳转详情', async () => {
    const user = userEvent.setup()
    renderCourseFormPage(['/courses/2/edit'])

    const nameInput = await screen.findByLabelText('课程名称')
    await user.clear(nameInput)
    await user.type(nameInput, '数据结构与算法（2026 修订）')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(await screen.findByText('课程详情页 2')).toBeInTheDocument()
    expect(db.courses.find((item) => item.id === 2)?.name).toBe('数据结构与算法（2026 修订）')
  })

  it('课程 ID 非法时给出明确空态，而不是一直转圈', async () => {
    renderCourseFormPage(['/courses/abc/edit'])

    expect(await screen.findByText('课程不存在')).toBeInTheDocument()
    expect(screen.getByText('URL 中的课程 ID 无效。')).toBeInTheDocument()
  })
})
