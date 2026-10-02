import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ChatPanel } from '@/features/chat/components/chat-panel'
import { DEFAULT_MODEL_CONFIG, db } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { useChatStore } from '@/stores/chat-store'

const server = setupServer(...handlers)

function renderChatPanel(courseId = 1) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatPanel courseId={courseId} />
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
  useChatStore.setState({
    courseId: null,
    conversationId: null,
    status: 'idle',
    interrupted: false,
  })
})

describe('ChatPanel · 课程问答', () => {
  it('空态展示推荐问题，点击后流式生成回答、渲染引用卡片，并可开新对话', async () => {
    const user = userEvent.setup()
    renderChatPanel(1)

    // 空态 + 推荐问题 chips
    expect(await screen.findByText('向这门课的资料提问')).toBeInTheDocument()
    expect(screen.getByText('限定本课程资料')).toBeInTheDocument()
    const chip = await screen.findByRole('button', { name: '这门课的重点是什么？' })

    await user.click(chip)

    // 用户消息立即落到右侧气泡
    expect(await screen.findByText('这门课的重点是什么？')).toBeInTheDocument()

    // 助手回答逐帧追加（mock 每 24ms 一帧）
    expect(await screen.findByText(/依据当前课程资料/)).toBeInTheDocument()

    // 引用卡片：课程 1 前两份 READY 资料 + 页码 chip（两张卡片分两帧下发）
    expect(await screen.findByText('第3章 内存管理.pdf')).toBeInTheDocument()
    expect(screen.getByText('第 12 页')).toBeInTheDocument()
    expect(await screen.findByText('第4章 虚拟内存.pdf')).toBeInTheDocument()
    expect(screen.getByText('第 19 页')).toBeInTheDocument()

    // 流结束后：回答补全、停止按钮退场、出现复制与「新对话」
    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: '停止生成' })).not.toBeInTheDocument()
      },
      { timeout: 5000 },
    )
    expect(screen.getByText(/若需要针对某一章展开/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /复制回答/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /新对话/ }))

    expect(await screen.findByText('向这门课的资料提问')).toBeInTheDocument()
    expect(screen.queryByText(/依据当前课程资料/)).not.toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBeNull()
  })

  it('停止生成：中断 SSE、保留已生成内容并给出中断提示', async () => {
    const user = userEvent.setup()
    renderChatPanel(1)

    const chip = await screen.findByRole('button', { name: '这门课的重点是什么？' })
    // 用 fireEvent 同步触发，抢占流式进行中的时间窗
    fireEvent.click(chip)

    const stopButton = await screen.findByRole('button', { name: '停止生成' })
    await user.click(stopButton)

    expect(await screen.findByText(/回答已中断/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '停止生成' })).not.toBeInTheDocument()
    })
    // 已生成的正文没有被清空（用户消息仍在）
    expect(screen.getByText('这门课的重点是什么？')).toBeInTheDocument()
  })

  it('AI 服务不可用时友好降级，输入框复位可继续提问', async () => {
    const user = userEvent.setup()
    renderChatPanel(1)

    const input = await screen.findByLabelText('输入问题')
    await user.type(input, '__unavailable__')
    await user.click(screen.getByRole('button', { name: '发送' }))

    expect(await screen.findByText('AI 服务暂不可用，请稍后重试')).toBeInTheDocument()
    expect(screen.getByText('__unavailable__')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('大模型未配置时降级为 3004，并在气泡内给出「去设置」入口', async () => {
    db.modelConfig = { ...DEFAULT_MODEL_CONFIG, api_key: '' }
    const user = userEvent.setup()
    renderChatPanel(1)

    const chip = await screen.findByRole('button', { name: '这门课的重点是什么？' })
    await user.click(chip)

    expect(await screen.findByText('尚未配置大模型，请先在设置中完成配置')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '去设置' })).toHaveAttribute('href', '/settings')
  })

  it('回答完成后可点赞 / 点踩，再次点击同一项即取消', async () => {
    const user = userEvent.setup()
    renderChatPanel(1)

    await user.click(await screen.findByRole('button', { name: '这门课的重点是什么？' }))
    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: '停止生成' })).not.toBeInTheDocument()
      },
      { timeout: 5000 },
    )

    const upButton = screen.getByRole('button', { name: '有帮助' })
    const downButton = screen.getByRole('button', { name: '没帮助' })
    expect(upButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(upButton)
    await waitFor(() => expect(upButton).toHaveAttribute('aria-pressed', 'true'))
    expect(Object.values(db.feedbackByMessage)).toEqual(['UP'])

    // 幂等替换为点踩
    await user.click(downButton)
    await waitFor(() => expect(downButton).toHaveAttribute('aria-pressed', 'true'))
    expect(upButton).toHaveAttribute('aria-pressed', 'false')
    expect(Object.values(db.feedbackByMessage)).toEqual(['DOWN'])

    // 再次点击同一项 → 取消反馈
    await user.click(downButton)
    await waitFor(() => expect(downButton).toHaveAttribute('aria-pressed', 'false'))
    expect(Object.values(db.feedbackByMessage)).toEqual([])
  })

  it('输入框 Enter 发送、Shift+Enter 换行，且走课程检索范围', async () => {
    const user = userEvent.setup()
    renderChatPanel(1)

    const input = await screen.findByLabelText('输入问题')
    await user.type(input, '分页{Shift>}{Enter}{/Shift}机制')
    expect(input).toHaveValue('分页\n机制')

    await user.type(input, '{Enter}')

    // 命中「分页」话术，证明问题已按 Enter 发出
    expect(await screen.findByText(/地址翻译链路/)).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(useChatStore.getState().courseId).toBe(1)
    expect(useChatStore.getState().conversationId).not.toBeNull()
  })
})
