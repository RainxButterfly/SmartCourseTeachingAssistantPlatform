import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppLayout } from '@/layouts/app-layout'
import { useAuthStore } from '@/stores/auth-store'

/**
 * AppLayout · 主导航。
 * 关注点：`md` 以下侧边栏改为抽屉后，桌面侧栏与抽屉共用同一份导航内容，
 * 且点击导航项要自动关闭抽屉（否则窄屏点完菜单抽屉还盖在内容上）。
 */

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<h1>概览占位</h1>} />
          <Route path="courses" element={<h1>课程占位</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: { id: 1, username: '张三', avatar: null, email: 'demo@example.com' },
  })
})

describe('AppLayout · 主导航', () => {
  it('渲染桌面侧栏：6 个导航项、顶部问候语与作者署名', () => {
    renderLayout()

    // 子路由正常渲染
    expect(screen.getByRole('heading', { name: '概览占位' })).toBeInTheDocument()
    expect(screen.getByText('你好，张三')).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: '主导航' })
    for (const label of ['概览', '课程', '对话', '练习', '统计', '设置']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: /作者 星河一叶Roxy/ })).toBeInTheDocument()
    // 抽屉未打开：只有一个主导航
    expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1)
  })

  it('菜单按钮打开导航抽屉，点击导航项后抽屉自动关闭', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: '打开主导航' }))
    const drawer = await screen.findByRole('dialog')

    // 抽屉里是同一份导航内容
    const drawerNav = within(drawer).getByRole('navigation', { name: '主导航' })
    expect(within(drawerNav).getByRole('link', { name: '设置' })).toBeInTheDocument()

    // 抽屉是模态语义：打开时其余内容被标记 aria-hidden，故可访问的主导航只剩抽屉这一个
    expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1)

    await user.click(within(drawerNav).getByRole('link', { name: '课程' }))
    expect(await screen.findByRole('heading', { name: '课程占位' })).toBeInTheDocument()

    // 点完菜单必须自动收起，否则窄屏下抽屉会盖住刚跳到的页面
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
