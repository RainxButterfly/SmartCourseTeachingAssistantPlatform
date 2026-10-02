import { CircleCheck, PlugZap, Save, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useModelConfigQuery,
  useSaveModelConfigMutation,
  useTestModelConnectionMutation,
} from '@/features/settings/queries'
import { resolveErrorMessage } from '@/lib/http'
import { cn } from '@/lib/utils'
import {
  MODEL_PROVIDERS,
  type ModelConfigRequest,
  ModelConfigRequestSchema,
  type ModelProvider,
  type ModelTestResult,
} from '@/schemas/settings'

/** 厂商预设：选中后带入默认 API 地址与模型名，仍可手改（PAD §6.2 SettingsPage） */
const PROVIDER_PRESETS: Record<ModelProvider, { label: string; base_url: string; model: string }> =
  {
    DEEPSEEK: {
      label: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    },
    OPENAI: {
      label: 'OpenAI',
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    QWEN: {
      label: '通义千问',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
    },
    CUSTOM: { label: '自定义（OpenAI 兼容）', base_url: '', model: '' },
  }

interface ModelConfigFormValues {
  provider: ModelProvider
  base_url: string
  model: string
  api_key: string
}

/** 字段名 → 校验错误文案（由契约 schema 的 issues 映射而来） */
type FieldErrors = Record<string, string>

const EMPTY_VALUES: ModelConfigFormValues = {
  provider: 'DEEPSEEK',
  base_url: '',
  model: '',
  api_key: '',
}

interface FieldProps {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/** 大模型配置表单（BYOK）：API Key 只写不读，留空即保留已保存的密钥 */
export function ModelConfigForm() {
  const configQuery = useModelConfigQuery()
  const saveMutation = useSaveModelConfigMutation()
  const testMutation = useTestModelConnectionMutation()

  const [values, setValues] = useState<ModelConfigFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null)

  const config = configQuery.data

  // 配置到达后回填；api_key 永远留空，只在用户主动输入时才提交
  useEffect(() => {
    if (config === undefined) return
    setValues({
      provider: config.provider,
      base_url: config.base_url,
      model: config.model,
      api_key: '',
    })
  }, [config])

  const patchValues = (patch: Partial<ModelConfigFormValues>): void => {
    setValues((prev) => ({ ...prev, ...patch }))
    setTestResult(null)
  }

  const handleProviderChange = (provider: ModelProvider): void => {
    const preset = PROVIDER_PRESETS[provider]
    patchValues(
      provider === 'CUSTOM'
        ? { provider }
        : { provider, base_url: preset.base_url, model: preset.model },
    )
  }

  /** 提交前用契约 schema 收口，错误按字段就地展示 */
  const validate = (): ModelConfigRequest | null => {
    const parsed = ModelConfigRequestSchema.safeParse(values)
    if (parsed.success) {
      setErrors({})
      return parsed.data
    }

    const next: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && next[field] === undefined) next[field] = issue.message
    }
    setErrors(next)
    return null
  }

  const handleTest = (): void => {
    const body = validate()
    if (body === null) return
    testMutation.mutate(body, { onSuccess: (result) => setTestResult(result) })
  }

  const handleSave = (): void => {
    const body = validate()
    if (body === null) return
    saveMutation.mutate(body)
  }

  if (configQuery.isPending) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-4" aria-hidden="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (configQuery.isError || config === undefined) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-medium text-destructive">大模型配置加载失败</p>
        <p className="mt-1 text-muted-foreground text-sm">
          {resolveErrorMessage(configQuery.error)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void configQuery.refetch()}
        >
          重试
        </Button>
      </div>
    )
  }

  const isBusy = saveMutation.isPending || testMutation.isPending

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <header className="space-y-1">
        <h2 className="font-medium">大模型配置</h2>
        <p className="text-muted-foreground text-sm">
          填写你自己的大模型，平台会用它完成知识库问答与出题。配置保存在后端配置文件中，
          不会随镜像分发。
        </p>
      </header>

      <Field id="model-provider" label="厂商预设">
        <Select
          value={values.provider}
          onValueChange={(value) => handleProviderChange(value as ModelProvider)}
        >
          <SelectTrigger id="model-provider" className="w-full">
            {/* 直接渲染本地化标签：Base UI 的 Value 会回退成原始枚举值 */}
            <span data-slot="select-value" className="min-w-0 truncate text-left">
              {PROVIDER_PRESETS[values.provider].label}
            </span>
          </SelectTrigger>
          <SelectContent>
            {MODEL_PROVIDERS.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {PROVIDER_PRESETS[provider].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="model-base-url"
        label="API 地址"
        error={errors.base_url}
        hint="OpenAI 兼容端点，通常以 /v1 结尾"
      >
        <Input
          id="model-base-url"
          value={values.base_url}
          placeholder="https://api.deepseek.com/v1"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.base_url !== undefined}
          onChange={(event) => patchValues({ base_url: event.target.value })}
        />
      </Field>

      <Field id="model-name" label="模型名" error={errors.model} hint="如 deepseek-chat、qwen-plus">
        <Input
          id="model-name"
          value={values.model}
          placeholder="deepseek-chat"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.model !== undefined}
          onChange={(event) => patchValues({ model: event.target.value })}
        />
      </Field>

      <Field
        id="model-api-key"
        label="API Key"
        error={errors.api_key}
        hint={
          config.has_api_key
            ? `已配置 ${config.api_key_masked}，留空表示不修改`
            : '仅保存在后端配置文件，接口不会回显明文'
        }
      >
        <Input
          id="model-api-key"
          type="password"
          value={values.api_key}
          autoComplete="new-password"
          placeholder={config.has_api_key ? '留空表示不修改' : '请输入你的 API Key'}
          aria-invalid={errors.api_key !== undefined}
          onChange={(event) => patchValues({ api_key: event.target.value })}
        />
      </Field>

      {testResult === null ? null : (
        <p
          role="status"
          className={cn(
            'flex items-start gap-1.5 rounded-lg border p-2.5 text-xs',
            testResult.ok
              ? 'border-border text-muted-foreground'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {testResult.ok ? (
            <CircleCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>
            {testResult.message}
            {testResult.ok ? ` · 耗时 ${testResult.latency_ms} ms` : ''}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={isBusy} onClick={handleTest}>
          <PlugZap aria-hidden="true" />
          {testMutation.isPending ? '测试中…' : '测试连接'}
        </Button>
        <Button type="button" disabled={isBusy} onClick={handleSave}>
          <Save aria-hidden="true" />
          {saveMutation.isPending ? '保存中…' : '保存配置'}
        </Button>
        <p className="text-muted-foreground text-xs">保存后立即生效，无需重启服务。</p>
      </div>
    </section>
  )
}
