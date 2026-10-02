import { ModelConfigForm } from '@/features/settings/components/model-config-form'

/**
 * 设置页（PAD §6.2 SettingsPage）。
 * 当前仅承载大模型配置（BYOK），后续其它全局设置在此扩展。
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
    </div>
  )
}
