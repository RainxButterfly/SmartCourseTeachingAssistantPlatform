import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_MODEL_CONFIG, db } from '@/mocks/db'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import { handlers } from '@/mocks/handlers'
import { resetQuizStore } from '@/mocks/handlers/quiz'
import { QuizPage } from '@/routes/quiz/quiz-page'
import { QuizResultPage } from '@/routes/quiz/quiz-result-page'

const server = setupServer(...handlers)

function renderQuizPage(initialEntries: string[] = ['/quiz']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/quiz/:attemptId" element={<QuizResultPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** 组卷：把范围收敛到「操作系统 + 单选 + 简单」，即题库里唯一的那道题 */
async function configureSingleQuestion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('combobox', { name: '课程' }))
  await user.click(await screen.findByRole('option', { name: '操作系统' }))
  await user.click(screen.getByRole('button', { name: '多选' }))
  await user.click(screen.getByRole('button', { name: '填空' }))
  await user.click(screen.getByRole('button', { name: '简答' }))
  await user.click(screen.getByRole('combobox', { name: '难度' }))
  await user.click(await screen.findByRole('option', { name: '简单' }))
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
  db.modelConfig = { ...DEFAULT_MODEL_CONFIG }
  resetQuizStore()
})

describe('QuizPage · 智能出题', () => {
  it('组卷态：渲染范围/题量/题型/难度与薄弱点 chips', async () => {
    renderQuizPage()

    expect(await screen.findByRole('heading', { name: '智能出题' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '课程' })).toHaveTextContent('全部资料')
    expect(screen.getByRole('combobox', { name: '题量' })).toHaveTextContent('10 题')
    expect(screen.getByRole('combobox', { name: '难度' })).toHaveTextContent('中等')

    // 默认勾选单选 + 多选
    expect(screen.getByRole('button', { name: '单选' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '多选' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '填空' })).toHaveAttribute('aria-pressed', 'false')

    // 薄弱点 chips 来自 GET /quiz/weak-points（含掌握度）
    expect(await screen.findByRole('button', { name: /虚拟内存与置换/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /虚拟内存与置换/ })).toHaveTextContent('28%')

    expect(screen.getByText('还没有练习记录，完成一次练习后会出现在这里。')).toBeInTheDocument()
  })

  it('完成一次练习：作答 → 标记不确定 → 交卷 → 结果页展示得分与逐题解析', async () => {
    const user = userEvent.setup()
    renderQuizPage()

    await configureSingleQuestion(user)
    await user.click(screen.getByRole('button', { name: '开始练习' }))

    // 答题态
    expect(await screen.findByText('第 1 / 1 题')).toBeInTheDocument()
    expect(screen.getByText(/用时 \d{2}:\d{2}/)).toBeInTheDocument()
    expect(screen.getByLabelText('答题进度')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '标记不确定' }))
    expect(screen.getByText('已标记不确定')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消标记' })).toBeInTheDocument()

    // 选择正确选项（题库中该题正解为「消除外部碎片」）
    await user.click(screen.getByRole('radio', { name: '消除外部碎片' }))
    expect(screen.getByText('已答 1 题')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '交卷' }))

    // 结果页
    expect(await screen.findByRole('heading', { name: '练习结果' })).toBeInTheDocument()
    expect(screen.getByText(/答对 1 \/ 1 题/)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('解析')).toBeInTheDocument()
    // 资料出处以引用卡片回显，但不提供「详情」（结果页没有引用抽屉）
    expect(screen.getByText('第3章 内存管理.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /查看引用 .* 详情/ })).not.toBeInTheDocument()
  })

  it('存在未作答时交卷先二次确认，可返回继续作答', async () => {
    const user = userEvent.setup()
    renderQuizPage()

    await configureSingleQuestion(user)
    await user.click(screen.getByRole('button', { name: '开始练习' }))

    await screen.findByText('第 1 / 1 题')
    await user.click(screen.getByRole('button', { name: /交卷（还有 1 题未作答）/ }))

    // 未作答必须先确认（标题与按钮同名，故用对话框角色断言）
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/未作答的题将计为错误/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '继续作答' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('第 1 / 1 题')).toBeInTheDocument()
  })

  it('答题后交卷的记录出现在练习记录中，可点击回到结果页', async () => {
    const user = userEvent.setup()
    renderQuizPage()

    await configureSingleQuestion(user)
    await user.click(screen.getByRole('button', { name: '开始练习' }))
    await screen.findByText('第 1 / 1 题')
    await user.click(screen.getByRole('radio', { name: '消除外部碎片' }))
    await user.click(screen.getByRole('button', { name: '交卷' }))

    // 结果页首尾各有一个「再练一次」，取第一个即可
    const backButtons = await screen.findAllByRole('button', { name: '再练一次' })
    const backButton = backButtons[0]
    if (backButton === undefined) throw new Error('未找到「再练一次」按钮')
    await user.click(backButton)

    // 回到组卷态，练习记录已刷新
    const record = await screen.findByRole('link', { name: /操作系统 · 1 题/ })
    expect(record).toHaveTextContent('100 分')

    await user.click(record)
    expect(await screen.findByRole('heading', { name: '练习结果' })).toBeInTheDocument()
  })
})
