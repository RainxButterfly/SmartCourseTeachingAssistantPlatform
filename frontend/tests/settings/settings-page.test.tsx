import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/mocks/db'
import { handlers } from '@/mocks/handlers'
import { SettingsPage } from '@/routes/settings/settings-page'

const server = setupServer(...handlers)

const SAVED_API_KEY = 'sk-mock-0000000000000000f3a1'
const SAVED_MASK = 'sk-****f3a1'

function renderSettingsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
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
  db.modelConfig = {
    provider: 'DEEPSEEK',
    base_url: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    api_key: SAVED_API_KEY,
    updated_at: '2026-10-02T09:00:00',
  }
})

describe('SettingsPage · 大模型配置（BYOK）', () => {
  it('回填已保存配置；API Key 输入框留空且只展示掩码，不出现明文', async () => {
    renderSettingsPage()

    expect(await screen.findByDisplayValue('https://api.deepseek.com/v1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('deepseek-chat')).toBeInTheDocument()
    // 下拉展示本地化标签，而不是回退成原始枚举值 DEEPSEEK
    expect(screen.getByRole('combobox')).toHaveTextContent('DeepSeek')

    // 密钥框永远留空（只写不读），提示信息里只有掩码
    expect(screen.getByLabelText('API Key')).toHaveValue('')
    expect(screen.getByText(`已配置 ${SAVED_MASK}，留空表示不修改`)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(SAVED_API_KEY)
  })

  it('测试连接：成功后行内展示模型名与耗时', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByDisplayValue('deepseek-chat')
    await user.click(screen.getByRole('button', { name: '测试连接' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('连接成功，模型 deepseek-chat 可用')
    expect(status).toHaveTextContent('耗时 186 ms')
  })

  it('保存：只改模型名时不会清空已保存的 API Key', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    const modelInput = await screen.findByDisplayValue('deepseek-chat')
    await user.clear(modelInput)
    await user.type(modelInput, 'deepseek-reasoner')
    await user.click(screen.getByRole('button', { name: '保存配置' }))

    await waitFor(() => {
      expect(db.modelConfig.model).toBe('deepseek-reasoner')
    })
    expect(db.modelConfig.api_key).toBe(SAVED_API_KEY)
  })

  it('API 地址非法时就地报错，且不发起保存请求', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    const urlInput = await screen.findByDisplayValue('https://api.deepseek.com/v1')
    await user.clear(urlInput)
    await user.type(urlInput, '不是地址')
    await user.click(screen.getByRole('button', { name: '保存配置' }))

    expect(await screen.findByText('API 地址需为合法 URL')).toBeInTheDocument()
    expect(db.modelConfig.base_url).toBe('https://api.deepseek.com/v1')
  })

  it('切换厂商预设时带入默认 API 地址与模型名', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByDisplayValue('deepseek-chat')
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '通义千问' }))

    expect(screen.getByDisplayValue('qwen-plus')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('https://dashscope.aliyuncs.com/compatible-mode/v1'),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('通义千问')
  })
})
