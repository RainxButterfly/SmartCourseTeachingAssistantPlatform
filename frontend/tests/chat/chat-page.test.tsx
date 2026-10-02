import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_MODEL_CONFIG, db } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { ChatPage } from '@/routes/chat/chat-page'

const server = setupServer(...handlers)

function renderChatPage(initialEntries: string[] = ['/chat']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
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
  db.messages = []
  db.parseStatusByMaterial = {}
  db.feedbackByMessage = {}
  db.modelConfig = { ...DEFAULT_MODEL_CONFIG }
  db.sequences = { course: 1000, material: 1000, conversation: 1000, task: 1000 }
})

describe('ChatPage · 三栏问答', () => {
  it('打开既有会话：加载历史消息，标题与检索范围按会话回显', async () => {
    renderChatPage(['/chat/1'])

    // 中栏标题取会话标题；左栏同名项是链接，故用 heading 精确定位
    expect(await screen.findByRole('heading', { name: '内存管理相关问题' })).toBeInTheDocument()
    expect(screen.getByText('检索范围：操作系统')).toBeInTheDocument()

    // 夹具会话的两条消息都渲染出来，助手回答带引用卡片
    expect(await screen.findByText('这门课的重点是什么？')).toBeInTheDocument()
    expect(screen.getByText(/依据当前课程资料/)).toBeInTheDocument()
    expect(screen.getByText('第3章 内存管理.pdf')).toBeInTheDocument()
  })

  it('新对话：推荐问题提问后流式生成回答，会话自动出现在左栏', async () => {
    const user = userEvent.setup()
    renderChatPage(['/chat'])

    expect(await screen.findByText('开始一段新对话')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: '帮我梳理这门课的整体知识框架' }))

    // 用户气泡 + 助手流式回答
    expect(await screen.findByText('帮我梳理这门课的整体知识框架')).toBeInTheDocument()
    expect(await screen.findByText(/依据当前课程资料/)).toBeInTheDocument()

    // 会话已落库
    await waitFor(
      () => {
        expect(db.conversations.some((item) => item.title === '帮我梳理这门课的整体知识框架')).toBe(
          true,
        )
      },
      { timeout: 5000 },
    )

    // 并回刷到左栏（标题由首问派生；回刷走 invalidateQueries，放宽等待）
    expect(
      await screen.findByRole('link', { name: /帮我梳理这门课的整体知识框架/ }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('点击引用「详情」：右栏展示原文摘录、页码与相关度', async () => {
    const user = userEvent.setup()
    renderChatPage(['/chat/1'])

    await screen.findByText('第3章 内存管理.pdf')
    await user.click(screen.getByRole('button', { name: '查看引用 1 详情' }))

    const panel = screen.getByRole('complementary', { name: '引用详情' })
    expect(within(panel).getByText('原文摘录')).toBeInTheDocument()
    expect(within(panel).getByText(/分页机制将进程的逻辑地址空间/)).toBeInTheDocument()
    expect(within(panel).getByText('第 12 页')).toBeInTheDocument()
    expect(within(panel).getByText('相关度 0.83')).toBeInTheDocument()
  })

  it('搜索会话标题：命中项保留，未命中项隐藏', async () => {
    const user = userEvent.setup()
    renderChatPage(['/chat'])

    expect(await screen.findByText('内存管理相关问题')).toBeInTheDocument()
    expect(screen.getByText('红黑树插入旋转讲解')).toBeInTheDocument()

    await user.type(screen.getByLabelText('搜索会话'), '红黑树')

    await waitFor(() => {
      expect(screen.queryByText('内存管理相关问题')).not.toBeInTheDocument()
    })
    expect(screen.getByText('红黑树插入旋转讲解')).toBeInTheDocument()
  })

  it('重命名会话后左栏标题更新并落库', async () => {
    const user = userEvent.setup()
    renderChatPage(['/chat'])

    await screen.findByText('分页与分段的区别')
    await user.click(screen.getByRole('button', { name: '重命名 分页与分段的区别' }))

    const input = await screen.findByLabelText('会话标题')
    await user.clear(input)
    await user.type(input, '分页 vs 分段')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('分页 vs 分段')).toBeInTheDocument()
    expect(db.conversations.find((item) => item.id === '2')?.title).toBe('分页 vs 分段')
  })
})
