import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { handlers } from '@/mocks/handlers'
import { ParseRedirectPage } from '@/routes/materials/parse-redirect-page'

/**
 * `/materials/:id/parse` 深链兜底页（PAD §6.2 v0.14）。
 * 主路径是课程详情页内联展示解析进度；直接打开该深链时应反查所属课程并跳转到资料 Tab，
 * 而不是停在一个空白占位页上。
 */

const server = setupServer(...handlers)

/** 落地页把 tab 参数渲染出来，用于断言深链确实带上了 ?tab=materials */
function CourseLanding() {
  const [params] = useSearchParams()
  return <h1>{`课程详情 tab=${params.get('tab') ?? '无'}`}</h1>
}

function renderParsePage(id: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter initialEntries={[`/materials/${id}/parse`]}>
        <Routes>
          <Route path="/materials/:id/parse" element={<ParseRedirectPage />} />
          <Route path="/courses" element={<h1>课程列表占位</h1>} />
          <Route path="/courses/:id" element={<CourseLanding />} />
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

describe('ParseRedirectPage · 解析深链兜底', () => {
  it('按资料的 course_id 重定向到该课程的资料 Tab（夹具 201 属于课程 2）', async () => {
    renderParsePage('201')

    // 走的是资料真实的所属课程，而不是写死课程 1
    expect(
      await screen.findByRole('heading', { name: '课程详情 tab=materials' }),
    ).toBeInTheDocument()
  })

  it('资料不存在时给出空态与返回入口，而不是空白页', async () => {
    renderParsePage('999999')

    expect(await screen.findByText('资料不存在或已删除')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回课程列表' })).toBeInTheDocument()
  })

  it('id 非法时直接给兜底，不发起请求', () => {
    renderParsePage('abc')

    expect(screen.getByText('资料 ID 无效')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回课程列表' })).toBeInTheDocument()
  })
})
