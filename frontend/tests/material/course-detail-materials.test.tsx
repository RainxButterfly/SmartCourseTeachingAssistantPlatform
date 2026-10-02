import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { CourseDetailPage } from '@/routes/courses/course-detail-page'

const server = setupServer(...handlers)

/** db 中含全部课程的夹具，断言资料数量时需按课程过滤 */
function materialsOfCourse1(): typeof db.materials {
  return db.materials.filter((item) => item.course_id === 1)
}

/** 暴露当前 URL 的 search，用于断言分页是否同步到 URL */
function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location-search">{location.search}</span>
}

function renderCourseDetail(initialEntries: string[] = ['/courses/1']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LocationProbe />
        <Routes>
          <Route path="/courses/:id" element={<CourseDetailPage />} />
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

describe('CourseDetailPage · 资料 Tab', () => {
  it('渲染课程头部指标与资料表格，状态徽标区分完成/进行中/失败', async () => {
    renderCourseDetail()

    expect(await screen.findByRole('heading', { name: '操作系统' })).toBeInTheDocument()
    expect(screen.getByText('OS2026')).toBeInTheDocument()
    expect(screen.getByText('李老师 · 2026秋')).toBeInTheDocument()

    // 资料表格：课程 1 共 12 份夹具，每页 10 条 → 第 1 页
    expect(await screen.findByText('第3章 内存管理.pdf')).toBeInTheDocument()
    expect(screen.getByText('共 12 份资料 · 第 1 / 2 页')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^material-row-/)).toHaveLength(10)
    expect(screen.getByText('第4章 虚拟内存.pdf')).toBeInTheDocument()
    expect(screen.getByText('进程调度讲义.pptx')).toBeInTheDocument()
    expect(screen.getByText('实验指导书.docx')).toBeInTheDocument()

    // 104 为 FAILED，应展示失败原因；第 1 页 READY 共 8 条（101/102/105-110）
    expect(screen.getByText('失败')).toBeInTheDocument()
    expect(screen.getByText('文档内含加密内容，无法提取文本，请重新导出后重试')).toBeInTheDocument()
    expect(screen.getAllByText('已完成')).toHaveLength(8)

    // 中间态行内展示解析进度
    expect(screen.getByLabelText('进程调度讲义.pptx 解析进度')).toBeInTheDocument()
  })

  it('资料列表分页：翻页后 URL 同步 page=2，且只渲染第 2 页资料', async () => {
    const user = userEvent.setup()
    renderCourseDetail()

    expect(await screen.findByText('共 12 份资料 · 第 1 / 2 页')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toBeEmptyDOMElement()

    await user.click(screen.getByRole('button', { name: '下一页' }))

    await waitFor(() => {
      expect(screen.getByText('共 12 份资料 · 第 2 / 2 页')).toBeInTheDocument()
    })
    expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2')
    expect(screen.getAllByTestId(/^material-row-/)).toHaveLength(2)
    expect(screen.getByText('期末复习提纲.docx')).toBeInTheDocument()
    expect(screen.getByText('课程大纲.pdf')).toBeInTheDocument()
    expect(screen.queryByText('第3章 内存管理.pdf')).not.toBeInTheDocument()
  })

  it('上传闭环：presign → 直传 MinIO → complete，新资料以中间态出现在列表中', async () => {
    const user = userEvent.setup()
    renderCourseDetail()

    await screen.findByText('第3章 内存管理.pdf')

    const file = new File(['%PDF-1.4 mock'], '第7章 死锁与进程同步.pdf', {
      type: 'application/pdf',
    })
    await user.upload(screen.getByLabelText('选择资料文件'), file)

    // 上传队列
    expect(await screen.findByText('上传队列')).toBeInTheDocument()

    // complete 已把状态从 UPLOADING 推进走，且列表刷新出新行
    const created = db.materials.find((item) => item.name === '第7章 死锁与进程同步.pdf')
    expect(created).toBeDefined()
    expect(created?.status).not.toBe('UPLOADING')

    await waitFor(() => {
      expect(screen.getByText(/共 13 份资料/)).toBeInTheDocument()
    })

    // 新行位于表格内，且状态列展示解析阶段（而不是直接完成）
    const row = screen
      .getAllByText('第7章 死锁与进程同步.pdf')
      .map((element) => element.closest('tr'))
      .find((element) => element !== null)
    if (row === null || row === undefined) throw new Error('未找到新资料所在行')
    expect(within(row).getByText(/待解析|解析中|向量化中|已完成/)).toBeInTheDocument()
  })

  it('上传前校验拦截不支持的格式与超限文件，并给出原因', async () => {
    renderCourseDetail()

    await screen.findByText('第3章 内存管理.pdf')

    // 注：user.upload 会按 input 的 accept 过滤，故这里直接派发 change 绕过筛选，验证兜底校验
    const wrongFormat = new File(['MZ'], '恶意脚本.exe', { type: 'application/octet-stream' })
    fireEvent.change(screen.getByLabelText('选择资料文件'), {
      target: { files: [wrongFormat] },
    })

    expect(await screen.findByText('以下文件未通过上传前校验')).toBeInTheDocument()
    expect(screen.getByText(/恶意脚本\.exe：不支持的文件格式/)).toBeInTheDocument()
    // 未发起 presign：课程 1 名下仍只有 12 份（db 含全部课程的夹具，故按课程过滤）
    expect(materialsOfCourse1()).toHaveLength(12)

    // 超过 50MB 的合法格式同样被前端拦下（避免白发一次 presign）
    // 注：user.upload 会重建 File 对象并丢掉自定义 size，故同样走 fireEvent
    const oversized = new File(['%PDF-1.4'], '超大讲义.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversized, 'size', { value: 60 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('选择资料文件'), {
      target: { files: [oversized] },
    })

    expect(await screen.findByText(/超大讲义\.pdf：超过 50MB 大小限制/)).toBeInTheDocument()
    expect(materialsOfCourse1()).toHaveLength(12)
  })

  it('删除资料：二次确认后行消失', async () => {
    const user = userEvent.setup()
    renderCourseDetail()

    await screen.findByText('第3章 内存管理.pdf')
    await user.click(screen.getByRole('button', { name: '删除 第3章 内存管理.pdf' }))

    expect(await screen.findByText('删除资料')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      expect(screen.getByText(/共 11 份资料/)).toBeInTheDocument()
    })
    expect(screen.queryByText('第3章 内存管理.pdf')).not.toBeInTheDocument()
  })

  it('重命名资料：行内编辑保存后名称更新', async () => {
    const user = userEvent.setup()
    renderCourseDetail()

    await screen.findByText('第3章 内存管理.pdf')
    await user.click(screen.getByRole('button', { name: '重命名 第3章 内存管理.pdf' }))

    const nameInput = screen.getByLabelText('资料名称')
    await user.clear(nameInput)
    await user.type(nameInput, '第3章 内存管理（修订）.pdf')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('第3章 内存管理（修订）.pdf')).toBeInTheDocument()
    })
    expect(db.materials.find((item) => item.id === 101)?.name).toBe('第3章 内存管理（修订）.pdf')
  })

  it('课程 ID 非法时给出空态，而不是一直加载', async () => {
    renderCourseDetail(['/courses/abc'])

    expect(await screen.findByText('课程不存在')).toBeInTheDocument()
    expect(screen.getByText('URL 中的课程 ID 无效。')).toBeInTheDocument()
  })
})
