import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { ModelConfigForm } from '@/features/settings/components/model-config-form'

/**
 * 设置页（PAD §6.2 SettingsPage，v0.14）。
 * 两张相互独立的卡片：① 大模型配置（BYOK）；② 账号安全（改密码）。
 */
export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">设置</h1>
        <p className="text-muted-foreground text-sm">
          配置平台运行所需的全局参数。密钥只写入后端配置文件，前端不回显明文。
        </p>
      </header>

      <ModelConfigForm />

      <ChangePasswordForm />
    </div>
  )
}
