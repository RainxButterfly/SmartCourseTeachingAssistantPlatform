import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { handlers } from '@/mocks/handlers'
import { resetAuthStore } from '@/mocks/handlers/auth'
import { LoginPage } from '@/routes/auth/login-page'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 账号安全（PAD §6.2 v0.14 / v0.15）：改密码 + 忘记密码（两步式：发码 → 输码重置）。
 * 重点回归三条契约铁律：
 * - 原密码错误必须是 1007，不能是 1002（否则被 401 拦截器误判为登录失效而登出）；
 * - 忘记密码无论邮箱是否存在都返回同一句文案（防用户枚举）；
 * - 验证码错误/过期/未注册统一 1008 并就地绑到验证码字段，60s 内重发为 1009。
 */

const server = setupServer(...handlers)

const DEMO_PASSWORD = 'Demo@1234'
const DEMO_EMAIL = 'demo@example.com'
const SENT_MESSAGE = '如果该邮箱已注册，验证码已发送，请查收'
const RESET_SUCCESS_MESSAGE = '密码已重置，请用新密码登录'
/** mock 固定验证码（联调约定） */
const MOCK_CODE = '123456'

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function renderChangePassword() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<ChangePasswordForm />} />
          <Route path="/login" element={<h1>登录占位</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderLoginPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<h1>注册占位</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** 打开登录页的「忘记密码」Dialog，并返回 dialog 作用域 */
async function openForgotDialog() {
  const user = userEvent.setup()
  renderLoginPage()
  await user.click(screen.getByRole('button', { name: '忘记密码？' }))
  const dialog = await screen.findByRole('dialog')
  return { user, dialog }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  resetAuthStore()
  useAuthStore.setState({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: { id: 1, username: '张三', avatar: null, email: DEMO_EMAIL },
  })
})

describe('账号安全 · 修改密码', () => {
  it('展示当前登录邮箱（取自本地会话，不额外请求 /auth/me）', () => {
    renderChangePassword()

    expect(screen.getByRole('heading', { name: '账号安全' })).toBeInTheDocument()
    expect(screen.getByText(DEMO_EMAIL)).toBeInTheDocument()
  })

  it('改密码成功：清空会话并跳转登录页', async () => {
    const user = userEvent.setup()
    renderChangePassword()

    await user.type(screen.getByLabelText('原密码'), DEMO_PASSWORD)
    await user.type(screen.getByLabelText('新密码'), 'New@1234')
    await user.type(screen.getByLabelText('确认新密码'), 'New@1234')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(await screen.findByRole('heading', { name: '登录占位' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('原密码错误：就地提示且绝不误登出（1007 而非 1002）', async () => {
    const user = userEvent.setup()
    renderChangePassword()

    await user.type(screen.getByLabelText('原密码'), 'Wrong@1234')
    await user.type(screen.getByLabelText('新密码'), 'New@1234')
    await user.type(screen.getByLabelText('确认新密码'), 'New@1234')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(await screen.findByText('原密码不正确')).toBeInTheDocument()
    // 若错误码误用 1002/401，拦截器会刷新失败后清会话，这两条断言就会挂
    expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    expect(screen.queryByRole('heading', { name: '登录占位' })).not.toBeInTheDocument()
  })

  it('新密码强度不足时就地报错且不发请求', async () => {
    const user = userEvent.setup()
    renderChangePassword()

    await user.type(screen.getByLabelText('原密码'), DEMO_PASSWORD)
    await user.type(screen.getByLabelText('新密码'), 'weakpass')
    await user.type(screen.getByLabelText('确认新密码'), 'weakpass')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(await screen.findByText('至少 8 位，需包含大小写字母与数字')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    expect(screen.queryByRole('heading', { name: '登录占位' })).not.toBeInTheDocument()
  })

  it('两次新密码不一致时在确认框报错', async () => {
    const user = userEvent.setup()
    renderChangePassword()

    await user.type(screen.getByLabelText('原密码'), DEMO_PASSWORD)
    await user.type(screen.getByLabelText('新密码'), 'New@1234')
    await user.type(screen.getByLabelText('确认新密码'), 'New@12345')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '登录占位' })).not.toBeInTheDocument()
  })
})

describe('登录页 · 忘记密码', () => {
  /** 发码成功即进入重置步（同一弹窗内两步式，PAD §6.2 v0.15） */
  async function reachResetStep(email: string) {
    const { user, dialog } = await openForgotDialog()
    await user.type(within(dialog).getByLabelText('邮箱'), email)
    await user.click(within(dialog).getByRole('button', { name: '发送验证码' }))
    await within(dialog).findByRole('button', { name: '重置密码' })
    return { user, dialog }
  }

  it('已注册邮箱：发送后显示统一的防枚举成功文案并进入重置步', async () => {
    const { dialog } = await reachResetStep(DEMO_EMAIL)

    expect(within(dialog).getByRole('status')).toHaveTextContent(SENT_MESSAGE)
    expect(within(dialog).getByLabelText('验证码')).toBeInTheDocument()
  })

  it('未注册邮箱：文案与已注册完全一致，不泄露账号是否存在', async () => {
    const { dialog } = await reachResetStep('nobody@example.com')

    expect(within(dialog).getByRole('status')).toHaveTextContent(SENT_MESSAGE)
  })

  it('邮箱格式非法时就地报错且不发请求', async () => {
    const { user, dialog } = await openForgotDialog()

    await user.type(within(dialog).getByLabelText('邮箱'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: '发送验证码' }))

    expect(await within(dialog).findByText('邮箱格式不正确')).toBeInTheDocument()
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument()
  })

  it('重置成功：就地提示且不自动登录', async () => {
    const { user, dialog } = await reachResetStep(DEMO_EMAIL)

    await user.type(within(dialog).getByLabelText('验证码'), MOCK_CODE)
    await user.type(within(dialog).getByLabelText('新密码'), 'New@1234')
    await user.type(within(dialog).getByLabelText('确认新密码'), 'New@1234')
    await user.click(within(dialog).getByRole('button', { name: '重置密码' }))

    expect(await within(dialog).findByRole('status')).toHaveTextContent(RESET_SUCCESS_MESSAGE)
    // 不自动登录：Dialog 未关闭、登录页仍在背后，本地会话未被写入
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录', hidden: true })).toBeInTheDocument()
    expect(useAuthStore.getState().refreshToken).toBe('mock-refresh-token')
  })

  it('验证码错误：统一 1008 并就地绑到验证码字段', async () => {
    const { user, dialog } = await reachResetStep(DEMO_EMAIL)

    await user.type(within(dialog).getByLabelText('验证码'), '999999')
    await user.type(within(dialog).getByLabelText('新密码'), 'New@1234')
    await user.type(within(dialog).getByLabelText('确认新密码'), 'New@1234')
    await user.click(within(dialog).getByRole('button', { name: '重置密码' }))

    expect(await within(dialog).findByText('验证码不正确或已过期')).toBeInTheDocument()
    // 仍停留在重置步，未进入成功态
    expect(within(dialog).queryByText(RESET_SUCCESS_MESSAGE)).not.toBeInTheDocument()
  })

  it('60s 内重新发送：命中 1009 就地提示', async () => {
    const { user, dialog } = await reachResetStep(DEMO_EMAIL)

    await user.click(within(dialog).getByRole('button', { name: '重新发送' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('请求过于频繁，请稍后再试')
  })
})
