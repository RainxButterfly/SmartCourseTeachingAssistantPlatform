import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { describeField, FieldShell } from '@/components/shared/field-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveAuthErrorMessage } from '@/features/auth/api'
import { ForgotPasswordDialog } from '@/features/auth/components/forgot-password-dialog'
import { useLoginMutation } from '@/features/auth/queries'
import { type LoginBody, LoginBodySchema, safeRedirect } from '@/schemas/auth'

/** 登录页（PAD §6.2 LoginPage）：成功后回跳 `?redirect=` 的原地址 */
export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const fieldId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const mutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginBody>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  // 一改动输入就清掉上一次的服务端错误：
  // 校验失败时 handleSubmit 不会进入提交回调，光靠 setFormError(null) 清理不掉旧横幅。
  useEffect(() => {
    const subscription = watch(() => setFormError(null))
    return () => subscription.unsubscribe()
  }, [watch])

  const submitting = isSubmitting || mutation.isPending
  const emailId = `${fieldId}-email`
  const passwordId = `${fieldId}-password`

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await mutation.mutateAsync(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      // 1002 / 1005 就地提示，不弹 toast（PAD §6.2）
      setFormError(resolveAuthErrorMessage(error))
    }
  })

  return (
    <>
      <form
        noValidate
        aria-busy={submitting}
        onSubmit={(event) => void submit(event)}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="space-y-1">
          <h2 className="font-medium">登录</h2>
          <p className="text-muted-foreground text-sm">用邮箱登录，继续你的课程与问答记录。</p>
        </div>

        {formError === null ? null : (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive text-sm"
          >
            {formError}
          </p>
        )}

        <FieldShell id={emailId} label="邮箱" error={errors.email?.message}>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email !== undefined}
            aria-describedby={describeField(emailId, errors.email !== undefined)}
            {...register('email')}
          />
        </FieldShell>

        <FieldShell id={passwordId} label="密码" error={errors.password?.message}>
          <Input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            placeholder="请输入密码"
            aria-invalid={errors.password !== undefined}
            aria-describedby={describeField(passwordId, errors.password !== undefined)}
            {...register('password')}
          />
        </FieldShell>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '登录中…' : '登录'}
        </Button>

        <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setForgotOpen(true)}
          >
            忘记密码？
          </button>
          <p>
            还没有账号？
            <Link to="/register" className="ml-1 text-primary underline-offset-4 hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </form>

      {/* Dialog 放在 form 之外：避免与登录表单形成嵌套 form（PAD §6.2 v0.14 不新增路由） */}
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </>
  )
}
