import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { describeField, FieldShell } from '@/components/shared/field-shell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useForgotPasswordMutation } from '@/features/auth/queries'
import { resolveErrorMessage } from '@/lib/http'
import { type ForgotPasswordBody, ForgotPasswordBodySchema } from '@/schemas/auth'

/**
 * 统一的防枚举成功文案：无论邮箱是否已注册都显示同一句，
 * 避免通过文案差异探测账号是否存在（PAD §6.2 v0.14）。
 */
const SENT_MESSAGE = '如果该邮箱已注册，重置链接已发送，请查收'

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 忘记密码 Dialog（PAD §6.2 v0.14）。
 * 刻意**不新增路由**（§6.1 路由表保持不变），入口挂在登录页底部。
 */
export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const fieldId = useId()
  const mutation = useForgotPasswordMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordBody>({
    resolver: zodResolver(ForgotPasswordBodySchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  // 关闭即复位，避免下次打开残留上一次的成功态或错误
  useEffect(() => {
    if (open) return
    reset({ email: '' })
    setFormError(null)
    setSent(false)
  }, [open, reset])

  const submitting = isSubmitting || mutation.isPending
  const emailId = `${fieldId}-email`

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await mutation.mutateAsync(values)
      setSent(true)
    } catch (error) {
      setFormError(resolveErrorMessage(error))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          aria-busy={submitting}
          onSubmit={(event) => void submit(event)}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>忘记密码</DialogTitle>
            <DialogDescription>输入注册邮箱，我们会发送一封重置密码的邮件。</DialogDescription>
          </DialogHeader>

          {sent ? (
            <p role="status" className="rounded-lg border border-border bg-muted/40 p-2.5 text-sm">
              {SENT_MESSAGE}
            </p>
          ) : (
            <>
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
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            {sent ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? '发送中…' : '发送重置链接'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
