import axios from 'axios'

import { env } from '@/lib/env'
import { ApiError, http, resolveErrorMessage } from '@/lib/http'
import {
  type AuthResponse,
  AuthResponseSchema,
  type AuthTokens,
  AuthTokensSchema,
  type ChangePasswordBody,
  ChangePasswordBodySchema,
  type ForgotPasswordBody,
  ForgotPasswordBodySchema,
  type LoginBody,
  LoginBodySchema,
  RefreshBodySchema,
  type RegisterBody,
  RegisterBodySchema,
  type ResetPasswordBody,
  ResetPasswordBodySchema,
  type User,
  UserSchema,
} from '@/schemas/auth'
import { ERROR_CODES } from '@/schemas/common'

/** 鉴权接口层（PAD §7.1） */

/** 把鉴权错误码映射成面向用户的文案（PAD §6.2 LoginPage：就地提示，不弹 toast） */
export function resolveAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === ERROR_CODES.UNAUTHORIZED) return '邮箱或密码错误'
    if (error.code === ERROR_CODES.CONFLICT) return '该邮箱已注册，请直接登录'
    if (error.code === ERROR_CODES.INVALID_OLD_PASSWORD) return '原密码不正确'
    if (error.code === ERROR_CODES.INVALID_VERIFICATION_CODE) return '验证码不正确或已过期'
    if (error.code === ERROR_CODES.TOO_MANY_REQUESTS) return '请求过于频繁，请稍后再试'
  }
  return resolveErrorMessage(error)
}

/**
 * 原密码不正确（1007）。
 * 单独暴露给改密码表单：该错误必须就地绑到 old_password 字段，
 * 且**绝不能**用 1002 表达（会被 401 拦截器当作登录失效去刷新并重放）。
 */
export function isInvalidOldPassword(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.INVALID_OLD_PASSWORD
}

/**
 * 验证码不正确或已过期（1008，含邮箱未注册）。
 * 重置密码表单须就地绑到「验证码」字段，且不区分具体原因（防枚举）。
 */
export function isInvalidVerificationCode(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.INVALID_VERIFICATION_CODE
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/auth/login',
    data: LoginBodySchema.parse(body),
  })
  return AuthResponseSchema.parse(raw)
}

/** 注册成功即登录：响应与登录一致，前端无需再调一次登录 */
export async function register(body: RegisterBody): Promise<AuthResponse> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/auth/register',
    data: RegisterBodySchema.parse(body),
  })
  return AuthResponseSchema.parse(raw)
}

/**
 * 刷新 token（refresh 轮换）。
 * 刻意走**裸 axios**：`/auth/refresh` 自身若返回 401，绝不能再次触发 http 层的
 * 401 → 刷新 → 重放链路，否则会无限递归。
 */
export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  const response = await axios.request({
    baseURL: env.apiBaseUrl,
    method: 'POST',
    url: '/auth/refresh',
    data: RefreshBodySchema.parse({ refresh_token: refreshToken }),
  })
  const envelope = response.data as { code?: number; data?: unknown } | undefined
  if (envelope?.code !== 0) {
    throw new Error('刷新登录状态失败')
  }
  return AuthTokensSchema.parse(envelope.data)
}

export async function logout(refreshToken: string): Promise<void> {
  await http.request<null>({
    method: 'POST',
    url: '/auth/logout',
    data: { refresh_token: refreshToken },
  })
}

export async function fetchMe(): Promise<User> {
  const raw = await http.request<unknown>({ method: 'GET', url: '/auth/me' })
  return UserSchema.parse(raw)
}

/** PUT /auth/password —— 成功后后端吊销该用户全部 refresh token，前端需清会话重新登录 */
export async function changePassword(body: ChangePasswordBody): Promise<void> {
  await http.request<null>({
    method: 'PUT',
    url: '/auth/password',
    data: ChangePasswordBodySchema.parse(body),
  })
}

/** POST /auth/forgot-password —— 无论邮箱是否存在都返回成功（防用户枚举） */
export async function forgotPassword(body: ForgotPasswordBody): Promise<void> {
  await http.request<null>({
    method: 'POST',
    url: '/auth/forgot-password',
    data: ForgotPasswordBodySchema.parse(body),
  })
}

/**
 * POST /auth/reset-password —— 凭 6 位验证码重置密码。
 * 成功后后端吊销该用户全部 refresh token，**不自动登录**，前端提示改用新密码登录。
 */
export async function resetPassword(body: ResetPasswordBody): Promise<void> {
  await http.request<null>({
    method: 'POST',
    url: '/auth/reset-password',
    data: ResetPasswordBodySchema.parse(body),
  })
}
