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
import { isInvalidVerificationCode, resolveAuthErrorMessage } from '@/features/auth/api'
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/features/auth/queries'
import {
  type ForgotPasswordBody,
  ForgotPasswordBodySchema,
  PASSWORD_HINT,
  type ResetPasswordBody,
  ResetPasswordFormSchema,
  type ResetPasswordFormValues,
} from '@/schemas/auth'

/**
 * 统一的防枚举成功文案：无论邮箱是否已注册都显示同一句，
 * 避免通过文案差异探测账号是否存在（PAD §6.2 v0.15）。
 */
const SENT_MESSAGE = '如果该邮箱已注册，验证码已发送，请查收'
/** 重置成功后不自动登录，仅就地提示（PAD §6.2 v0.15） */
const RESET_SUCCESS_MESSAGE = '密码已重置，请用新密码登录'

type Step = 'send' | 'reset' | 'done'

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive text-sm"
    >
      {message}
    </p>
  )
}

/**
 * 忘记密码 Dialog（PAD §6.2 v0.15）：两步式 —— 先发 6 位验证码，再在同一弹窗内输码重置。
 * 刻意**不新增路由**（§6.1 路由表保持不变），入口挂在登录页底部。
 */
export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const fieldId = useId()
  const sendMutation = useForgotPasswordMutation()
  const resetMutation = useResetPasswordMutation()

  const [step, setStep] = useState<Step>('send')
  const [targetEmail, setTargetEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register: registerSend,
    handleSubmit: handleSendSubmit,
    reset: resetSendForm,
    watch: watchSend,
    formState: { errors: sendErrors, isSubmitting: isSending },
  } = useForm<ForgotPasswordBody>({
    resolver: zodResolver(ForgotPasswordBodySchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetResetForm,
    watch: watchReset,
    setError: setResetError,
    formState: { errors: resetErrors, isSubmitting: isResetting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: { email: '', code: '', new_password: '', confirm_password: '' },
    mode: 'onBlur',
  })

  // 关闭即复位，避免下次打开残留上一次的步骤或成功态
  useEffect(() => {
    if (open) return
    setStep('send')
    setTargetEmail('')
    setFormError(null)
    resetSendForm({ email: '' })
    resetResetForm({ email: '', code: '', new_password: '', confirm_password: '' })
  }, [open, resetSendForm, resetResetForm])

  // 一改动输入就清掉上一次的错误横幅（校验失败时不会进入提交回调）
  useEffect(() => {
    const subscription = watchSend(() => setFormError(null))
    return () => subscription.unsubscribe()
  }, [watchSend])

  useEffect(() => {
    const subscription = watchReset(() => setFormError(null))
    return () => subscription.unsubscribe()
  }, [watchReset])

  const sending = isSending || sendMutation.isPending
  const resetting = isResetting || resetMutation.isPending
  const emailId = `${fieldId}-email`
  const codeId = `${fieldId}-code`
  const newId = `${fieldId}-new`
  const confirmId = `${fieldId}-confirm`

  const submitSend = handleSendSubmit(async (values) => {
    setFormError(null)
    try {
      await sendMutation.mutateAsync(values)
      setTargetEmail(values.email)
      resetResetForm({ email: values.email, code: '', new_password: '', confirm_password: '' })
      setStep('reset')
    } catch (error) {
      setFormError(resolveAuthErrorMessage(error))
    }
  })

  /** 重新发送：60s 内重复请求命中 1009，就地提示（PAD §6.2 v0.15） */
  const resend = async () => {
    setFormError(null)
    try {
      await sendMutation.mutateAsync({ email: targetEmail })
    } catch (error) {
      setFormError(resolveAuthErrorMessage(error))
    }
  }

  const submitReset = handleResetSubmit(async (values) => {
    setFormError(null)
    // 只上报线上需要的字段，确认新密码留在前端（与改密码/注册页同策略）
    const body: ResetPasswordBody = {
      email: values.email,
      code: values.code,
      new_password: values.new_password,
    }
    try {
      await resetMutation.mutateAsync(body)
      setStep('done')
    } catch (error) {
      // 1008 统一代表验证码错误/过期/邮箱未注册，就地绑到「验证码」字段（PAD §6.2 v0.15）
      if (isInvalidVerificationCode(error)) {
        setResetError('code', { type: 'server', message: '验证码不正确或已过期' })
        return
      }
      setFormError(resolveAuthErrorMessage(error))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === 'send' ? (
          <form
            noValidate
            aria-busy={sending}
            onSubmit={(event) => void submitSend(event)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>忘记密码</DialogTitle>
              <DialogDescription>
                输入注册邮箱，我们会发送 6 位验证码用于重置密码。
              </DialogDescription>
            </DialogHeader>

            {formError === null ? null : <ErrorBanner message={formError} />}

            <FieldShell id={emailId} label="邮箱" error={sendErrors.email?.message}>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={sendErrors.email !== undefined}
                aria-describedby={describeField(emailId, sendErrors.email !== undefined)}
                {...registerSend('email')}
              />
            </FieldShell>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? '发送中…' : '发送验证码'}
              </Button>
            </DialogFooter>
          </form>
        ) : step === 'reset' ? (
          <form
            noValidate
            aria-busy={resetting}
            onSubmit={(event) => void submitReset(event)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
              <DialogDescription>输入收到的 6 位验证码并设置新密码。</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-2.5 text-sm">
              <p role="status">{SENT_MESSAGE}</p>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
                disabled={sending}
                onClick={() => void resend()}
              >
                {sending ? '发送中…' : '重新发送'}
              </button>
            </div>

            {formError === null ? null : <ErrorBanner message={formError} />}

            <FieldShell
              id={codeId}
              label="验证码"
              error={resetErrors.code?.message}
              hint="6 位数字"
            >
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-invalid={resetErrors.code !== undefined}
                aria-describedby={describeField(codeId, resetErrors.code !== undefined)}
                {...registerReset('code')}
              />
            </FieldShell>

            <FieldShell
              id={newId}
              label="新密码"
              error={resetErrors.new_password?.message}
              hint={PASSWORD_HINT}
            >
              <Input
                id={newId}
                type="password"
                autoComplete="new-password"
                placeholder="至少 8 位"
                aria-invalid={resetErrors.new_password !== undefined}
                aria-describedby={describeField(newId, resetErrors.new_password !== undefined)}
                {...registerReset('new_password')}
              />
            </FieldShell>

            <FieldShell
              id={confirmId}
              label="确认新密码"
              error={resetErrors.confirm_password?.message}
            >
              <Input
                id={confirmId}
                type="password"
                autoComplete="new-password"
                placeholder="再输入一次"
                aria-invalid={resetErrors.confirm_password !== undefined}
                aria-describedby={describeField(
                  confirmId,
                  resetErrors.confirm_password !== undefined,
                )}
                {...registerReset('confirm_password')}
              />
            </FieldShell>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? '重置中…' : '重置密码'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
            </DialogHeader>

            <p role="status" className="rounded-lg border border-border bg-muted/40 p-2.5 text-sm">
              {RESET_SUCCESS_MESSAGE}
            </p>

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
