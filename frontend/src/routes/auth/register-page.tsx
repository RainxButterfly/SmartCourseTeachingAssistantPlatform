import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { describeField, FieldShell } from '@/components/shared/field-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveAuthErrorMessage } from '@/features/auth/api'
import { useRegisterMutation } from '@/features/auth/queries'
import {
  PASSWORD_HINT,
  RegisterBodySchema,
  RegisterFormSchema,
  type RegisterFormValues,
} from '@/schemas/auth'

/** 注册页（PAD §6.2 RegisterPage）：成功后直接登录并进入首页 */
export function RegisterPage() {
  const navigate = useNavigate()
  const fieldId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const mutation = useRegisterMutation()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: { username: '', email: '', password: '', confirm_password: '' },
    mode: 'onBlur',
  })

  // 一改动输入就清掉上一次的服务端错误（校验失败时不会进入提交回调）
  useEffect(() => {
    const subscription = watch(() => setFormError(null))
    return () => subscription.unsubscribe()
  }, [watch])

  const submitting = isSubmitting || mutation.isPending
  const usernameId = `${fieldId}-username`
  const emailId = `${fieldId}-email`
  const passwordId = `${fieldId}-password`
  const confirmId = `${fieldId}-confirm`

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    // 只上报线上需要的字段，确认密码留在前端
    const body = RegisterBodySchema.parse({
      username: values.username,
      email: values.email,
      password: values.password,
    })
    try {
      await mutation.mutateAsync(body)
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(resolveAuthErrorMessage(error))
    }
  })

  return (
    <form
      noValidate
      aria-busy={submitting}
      onSubmit={(event) => void submit(event)}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="space-y-1">
        <h2 className="font-medium">注册</h2>
        <p className="text-muted-foreground text-sm">创建账号后即可上传资料并开始提问。</p>
      </div>

      {formError === null ? null : (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive text-sm"
        >
          {formError}
        </p>
      )}

      <FieldShell id={usernameId} label="用户名" error={errors.username?.message} hint="2-20 字">
        <Input
          id={usernameId}
          autoComplete="nickname"
          placeholder="张三"
          aria-invalid={errors.username !== undefined}
          aria-describedby={describeField(usernameId, errors.username !== undefined)}
          {...register('username')}
        />
      </FieldShell>

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

      <FieldShell
        id={passwordId}
        label="密码"
        error={errors.password?.message}
        hint={PASSWORD_HINT}
      >
        <Input
          id={passwordId}
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位"
          aria-invalid={errors.password !== undefined}
          aria-describedby={describeField(passwordId, errors.password !== undefined)}
          {...register('password')}
        />
      </FieldShell>

      <FieldShell id={confirmId} label="确认密码" error={errors.confirm_password?.message}>
        <Input
          id={confirmId}
          type="password"
          autoComplete="new-password"
          placeholder="再输入一次"
          aria-invalid={errors.confirm_password !== undefined}
          aria-describedby={describeField(confirmId, errors.confirm_password !== undefined)}
          {...register('confirm_password')}
        />
      </FieldShell>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '注册中…' : '注册并登录'}
      </Button>

      <p className="text-center text-muted-foreground text-sm">
        已有账号？
        <Link to="/login" className="ml-1 text-primary underline-offset-4 hover:underline">
          去登录
        </Link>
      </p>
    </form>
  )
}
