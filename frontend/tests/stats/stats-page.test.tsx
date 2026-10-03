import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { handlers } from '@/mocks/handlers'
import { StatsPage } from '@/routes/stats/stats-page'

const server = setupServer(...handlers)

function renderStatsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <StatsPage />
    </QueryClientProvider>,
  )

  return { queryClient, ...utils }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

describe('StatsPage · 学习统计', () => {
  it('渲染概览指标，ratio 类字段转成百分比', async () => {
    renderStatsPage()

    expect(await screen.findByRole('heading', { name: '学习统计' })).toBeInTheDocument()

    const overview = await screen.findByRole('region', { name: '总览指标' })
    expect(within(overview).getByText('今日学习')).toBeInTheDocument()
    expect(within(overview).getByText('45 分钟')).toBeInTheDocument()
    expect(within(overview).getByText('12')).toBeInTheDocument()
    expect(within(overview).getByText('128')).toBeInTheDocument()
    // qa_accuracy 0.82 / quiz_accuracy 0.76 / weak_point_count 7
    expect(within(overview).getByText('82%')).toBeInTheDocument()
    expect(within(overview).getByText('76%')).toBeInTheDocument()
    expect(within(overview).getByText('7')).toBeInTheDocument()
  })

  it('四张趋势图按契约渲染标题，并按 unit 格式化数值', async () => {
    renderStatsPage()

    expect(await screen.findByRole('region', { name: '学习时长趋势' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '答题正确率' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '资料数增长' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '问答命中率' })).toBeInTheDocument()

    // minute → 「x 分钟」：四张图按各自的 unit 渲染最新刻度
    expect((await screen.findAllByText(/最新（10-03）：45 分钟/)).length).toBeGreaterThan(0)

    // 饼图自绘图例：两个分类并带占比（ratio → 百分比）
    const pie = screen.getByRole('region', { name: '问答命中率' })
    expect(await within(pie).findByText('命中资料')).toBeInTheDocument()
    expect(within(pie).getByText('未命中资料')).toBeInTheDocument()
    expect(within(pie).getByText('82%')).toBeInTheDocument()
    expect(within(pie).getByText('18%')).toBeInTheDocument()
  })

  it('切换时间范围会把 month 传给趋势接口，并保留已渲染的最新刻度', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderStatsPage()

    await screen.findByRole('region', { name: '学习时长趋势' })

    // 默认近 7 天
    expect(screen.getByRole('button', { name: '近 7 天' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '近 30 天' }))
    expect(screen.getByRole('button', { name: '近 30 天' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      const keys = queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey.join('|'))
      expect(keys.some((key) => key === 'stats|trend|study_time|month')).toBe(true)
      expect(keys.some((key) => key === 'stats|trend|material_growth|month')).toBe(true)
    })

    // 问答命中率为饼图，不随范围变化
    await waitFor(() => {
      const keys = queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey.join('|'))
      expect(keys.some((key) => key.startsWith('stats|trend|qa_hit_rate'))).toBe(true)
      expect(keys.filter((key) => key.startsWith('stats|trend|qa_hit_rate'))).toHaveLength(1)
    })

    // 换范围后数据仍能渲染
    expect(screen.getAllByText(/最新（10-03）/).length).toBeGreaterThan(0)
  })

  it('薄弱点排行按掌握度升序展示，活动流展示后端拼好的文案', async () => {
    renderStatsPage()

    const rank = await screen.findByRole('region', { name: '薄弱知识点排行' })
    const rankItems = await within(rank).findAllByRole('listitem')
    expect(rankItems[0]).toHaveTextContent('虚拟内存与置换')
    // 夹具中最低掌握度为 28%
    expect(within(rank).getByLabelText('虚拟内存与置换 掌握度')).toHaveAttribute(
      'aria-valuenow',
      '28',
    )

    const feed = await screen.findByRole('region', { name: '最近活动' })
    const feedItems = await within(feed).findAllByRole('listitem')
    expect(feedItems).toHaveLength(6)
    expect(feedItems[0]).toHaveTextContent('完成「操作系统」练习，答对 8 / 10 题（80 分）')
  })
})
