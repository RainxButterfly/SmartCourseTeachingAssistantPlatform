import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { describeField, FieldShell } from '@/components/shared/field-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isInvalidOldPassword } from '@/features/auth/api'
import { useChangePasswordMutation } from '@/features/auth/queries'
import { resolveErrorMessage } from '@/lib/http'
import {
  type ChangePasswordBody,
  ChangePasswordFormSchema,
  type ChangePasswordFormValues,
  PASSWORD_HINT,
} from '@/schemas/auth'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 设置页「账号安全」卡片（PAD §6.2 v0.14）：修改密码 + 只读展示当前邮箱。
 * 成功后后端吊销该用户全部 refresh token，因此这里清会话并跳登录页。
 */
export function ChangePasswordForm() {
  const navigate = useNavigate()
  const email = useAuthStore((state) => state.user?.email ?? '')
  const mutation = useChangePasswordMutation()
  const fieldId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
    mode: 'onBlur',
  })

  // 一改动输入就清掉上一次的错误横幅（校验失败时不会进入提交回调）
  useEffect(() => {
    const subscription = watch(() => setFormError(null))
    return () => subscription.unsubscribe()
  }, [watch])

  const submitting = isSubmitting || mutation.isPending
  const oldId = `${fieldId}-old`
  const newId = `${fieldId}-new`
  const confirmId = `${fieldId}-confirm`

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    // 只上报线上需要的字段，确认新密码留在前端（与注册页同策略）
    const body: ChangePasswordBody = {
      old_password: values.old_password,
      new_password: values.new_password,
    }
    try {
      await mutation.mutateAsync(body)
      toast.success('密码已更新，请用新密码重新登录')
      navigate('/login', { replace: true })
    } catch (error) {
      // 1007 就地绑到原密码字段，其余错误放表单顶部（PAD §6.2 v0.14）
      if (isInvalidOldPassword(error)) {
        setError('old_password', { type: 'server', message: '原密码不正确' })
        return
      }
      setFormError(resolveErrorMessage(error))
    }
  })

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <header className="space-y-1">
        <h2 className="font-medium">账号安全</h2>
        <p className="text-muted-foreground text-sm">
          当前登录邮箱：<span className="text-foreground">{email === '' ? '—' : email}</span>
        </p>
      </header>

      <form
        noValidate
        aria-busy={submitting}
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        {formError === null ? null : (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive text-sm"
          >
            {formError}
          </p>
        )}

        <FieldShell id={oldId} label="原密码" error={errors.old_password?.message}>
          <Input
            id={oldId}
            type="password"
            autoComplete="current-password"
            placeholder="请输入当前密码"
            aria-invalid={errors.old_password !== undefined}
            aria-describedby={describeField(oldId, errors.old_password !== undefined)}
            {...register('old_password')}
          />
        </FieldShell>

        <FieldShell
          id={newId}
          label="新密码"
          error={errors.new_password?.message}
          hint={PASSWORD_HINT}
        >
          <Input
            id={newId}
            type="password"
            autoComplete="new-password"
            placeholder="至少 8 位"
            aria-invalid={errors.new_password !== undefined}
            aria-describedby={describeField(newId, errors.new_password !== undefined)}
            {...register('new_password')}
          />
        </FieldShell>

        <FieldShell id={confirmId} label="确认新密码" error={errors.confirm_password?.message}>
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

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? '提交中…' : '更新密码'}
          </Button>
        </div>
      </form>
    </section>
  )
}
