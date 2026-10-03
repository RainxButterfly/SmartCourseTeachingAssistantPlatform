import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { handlers } from '@/mocks/handlers'
import { resetAuthStore } from '@/mocks/handlers/auth'
import { LoginPage } from '@/routes/auth/login-page'
import { RegisterPage } from '@/routes/auth/register-page'
import { useAuthStore } from '@/stores/auth-store'

const server = setupServer(...handlers)

function renderAuthPage(path: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<h1>概览占位</h1>} />
          <Route path="/courses" element={<h1>课程列表占位</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** 未登录态：accessToken 为 null 才符合守卫的判定 */
function resetSession() {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  resetAuthStore()
  resetSession()
})

describe('LoginPage · 登录', () => {
  it('登录成功：写入会话并回跳 ?redirect= 指定的原地址', async () => {
    const user = userEvent.setup()
    renderAuthPage('/login?redirect=%2Fcourses')

    await user.type(screen.getByLabelText('邮箱'), 'demo@example.com')
    await user.type(screen.getByLabelText('密码'), 'Demo@1234')
    await user.click(screen.getByRole('button', { name: '登录' }))

    // 回跳到守卫记录的原地址，而不是首页
    expect(await screen.findByRole('heading', { name: '课程列表占位' })).toBeInTheDocument()

    const state = useAuthStore.getState()
    expect(state.user?.email).toBe('demo@example.com')
    expect(state.accessToken).not.toBeNull()
    expect(state.refreshToken).not.toBeNull()
  })

  it('密码错误：表单顶部就地提示，不写会话也不跳转', async () => {
    const user = userEvent.setup()
    renderAuthPage('/login')

    await user.type(screen.getByLabelText('邮箱'), 'demo@example.com')
    await user.type(screen.getByLabelText('密码'), 'Wrong@1234')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码错误')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument()
  })

  it('邮箱格式非法时就地报错且不写会话', async () => {
    const user = userEvent.setup()
    renderAuthPage('/login')

    await user.type(screen.getByLabelText('邮箱'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('邮箱格式不正确')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('改动输入会清掉上一次的服务端错误横幅（防残留）', async () => {
    const user = userEvent.setup()
    renderAuthPage('/login')

    await user.type(screen.getByLabelText('邮箱'), 'demo@example.com')
    await user.type(screen.getByLabelText('密码'), 'Wrong@1234')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码错误')

    // 再改动邮箱：旧横幅应立刻消失，不残留在新一次校验旁边
    await user.type(screen.getByLabelText('邮箱'), 'x')
    expect(screen.queryByText('邮箱或密码错误')).not.toBeInTheDocument()
  })

  it('redirect 为非站内地址时回落首页，避免开放重定向', async () => {
    const user = userEvent.setup()
    renderAuthPage('/login?redirect=https%3A%2F%2Fevil.example.com')

    await user.type(screen.getByLabelText('邮箱'), 'demo@example.com')
    await user.type(screen.getByLabelText('密码'), 'Demo@1234')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '概览占位' })).toBeInTheDocument()
  })
})

describe('RegisterPage · 注册', () => {
  it('注册成功即登录并进入首页', async () => {
    const user = userEvent.setup()
    renderAuthPage('/register')

    await user.type(screen.getByLabelText('用户名'), '新同学')
    await user.type(screen.getByLabelText('邮箱'), `new-${Date.now()}@example.com`)
    await user.type(screen.getByLabelText('密码'), 'Abc@1234')
    await user.type(screen.getByLabelText('确认密码'), 'Abc@1234')
    await user.click(screen.getByRole('button', { name: '注册并登录' }))

    expect(await screen.findByRole('heading', { name: '概览占位' })).toBeInTheDocument()
    expect(useAuthStore.getState().user?.username).toBe('新同学')
  })

  it('密码强度不足时按规则报错，不发请求', async () => {
    const user = userEvent.setup()
    renderAuthPage('/register')

    await user.type(screen.getByLabelText('用户名'), '新同学')
    await user.type(screen.getByLabelText('邮箱'), 'weak@example.com')
    await user.type(screen.getByLabelText('密码'), 'weakpass')
    await user.type(screen.getByLabelText('确认密码'), 'weakpass')
    await user.click(screen.getByRole('button', { name: '注册并登录' }))

    expect(await screen.findByText('至少 8 位，需包含大小写字母与数字')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('两次密码不一致时在确认框报错', async () => {
    const user = userEvent.setup()
    renderAuthPage('/register')

    await user.type(screen.getByLabelText('用户名'), '新同学')
    await user.type(screen.getByLabelText('邮箱'), 'mismatch@example.com')
    await user.type(screen.getByLabelText('密码'), 'Abc@1234')
    await user.type(screen.getByLabelText('确认密码'), 'Abc@12345')
    await user.click(screen.getByRole('button', { name: '注册并登录' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
  })

  it('邮箱已注册时提示直接登录（1005）', async () => {
    const user = userEvent.setup()
    renderAuthPage('/register')

    await user.type(screen.getByLabelText('用户名'), '张三')
    await user.type(screen.getByLabelText('邮箱'), 'demo@example.com')
    await user.type(screen.getByLabelText('密码'), 'Abc@1234')
    await user.type(screen.getByLabelText('确认密码'), 'Abc@1234')
    await user.click(screen.getByRole('button', { name: '注册并登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('该邮箱已注册，请直接登录')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
