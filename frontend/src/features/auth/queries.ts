import { useMutation } from '@tanstack/react-query'

import { changePassword, forgotPassword, login, register, resetPassword } from '@/features/auth/api'
import type {
  AuthResponse,
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
} from '@/schemas/auth'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 登录/注册成功即写入会话。
 * 刻意不做 onError toast：登录页要把 1002/1005 映射到表单顶部就地提示。
 */
export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: (body: LoginBody) => login(body),
    onSuccess: (data: AuthResponse) => {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
    },
  })
}

export function useRegisterMutation() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: (body: RegisterBody) => register(body),
    onSuccess: (data: AuthResponse) => {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
    },
  })
}

/**
 * 改密码（PAD §6.2 v0.14）：成功后后端吊销该用户**全部** refresh token，
 * 因此这里必须清空本地会话，由调用方跳登录页。
 * 刻意不做 onError toast：原密码错误（1007）要就地绑到 old_password 字段。
 */
export function useChangePasswordMutation() {
  const clearSession = useAuthStore((state) => state.clearSession)

  return useMutation({
    mutationFn: (body: ChangePasswordBody) => changePassword(body),
    onSuccess: () => {
      clearSession()
    },
  })
}

/** 忘记密码：响应恒为成功（防用户枚举），页面只展示统一文案 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (body: ForgotPasswordBody) => forgotPassword(body),
  })
}

/**
 * 重置密码（PAD §6.2 v0.15）：成功后后端吊销该用户全部 refresh token，
 * **不自动登录**，由 Dialog 就地提示改用新密码登录。
 * 刻意不做 onError toast：1008 要就地绑到「验证码」字段。
 */
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (body: ResetPasswordBody) => resetPassword(body),
  })
}
