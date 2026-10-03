import { z } from 'zod'

/* --------------------- 鉴权（PAD §7.1 / §9.1 v0.13） --------------------- */

/** 密码强度：≥8 位且同时含小写字母、大写字母与数字（与后端校验一致） */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
export const PASSWORD_HINT = '至少 8 位，需包含大小写字母与数字'

/** UserVO —— 登录/注册响应里的 user 与 GET /auth/me 共用 */
export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  avatar: z.string().nullable(),
  email: z.string().email(),
})
export type User = z.infer<typeof UserSchema>

export const AuthTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().min(0),
})
export type AuthTokens = z.infer<typeof AuthTokensSchema>

/** POST /auth/login 与 POST /auth/register 的响应（注册即登录，复用同一结构） */
export const AuthResponseSchema = AuthTokensSchema.extend({ user: UserSchema })
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const LoginBodySchema = z.object({
  email: z.string().trim().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})
export type LoginBody = z.infer<typeof LoginBodySchema>

/** 上线报文（不含确认密码） */
export const RegisterBodySchema = z.object({
  username: z.string().trim().min(2, '用户名 2-20 字').max(20, '用户名 2-20 字'),
  email: z.string().trim().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_HINT),
})
export type RegisterBody = z.infer<typeof RegisterBodySchema>

/** 表单值：多一个确认密码，并在其上做一致性校验 */
export const RegisterFormSchema = RegisterBodySchema.extend({
  confirm_password: z.string().min(1, '请再次输入密码'),
}).refine((values) => values.password === values.confirm_password, {
  path: ['confirm_password'],
  message: '两次输入的密码不一致',
})
export type RegisterFormValues = z.infer<typeof RegisterFormSchema>

/** POST /auth/refresh 请求（响应为 AuthTokens，refresh 轮换） */
export const RefreshBodySchema = z.object({ refresh_token: z.string().min(1) })

/** POST /auth/logout 请求 */
export const LogoutBodySchema = z.object({ refresh_token: z.string().min(1) })

/* ------------------- 账号安全（PAD §7.1 / §9.1 v0.14） ------------------- */

/** PUT /auth/password 上线报文（不含确认新密码） */
export const ChangePasswordBodySchema = z.object({
  old_password: z.string().min(1, '请输入原密码'),
  new_password: z.string().regex(PASSWORD_PATTERN, PASSWORD_HINT),
})
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>

/** 表单值：多一个确认新密码，并在其上做一致性校验 */
export const ChangePasswordFormSchema = ChangePasswordBodySchema.extend({
  confirm_password: z.string().min(1, '请再次输入新密码'),
}).refine((values) => values.new_password === values.confirm_password, {
  path: ['confirm_password'],
  message: '两次输入的密码不一致',
})
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordFormSchema>

/** POST /auth/forgot-password 请求（响应恒为 data=null，防用户枚举） */
export const ForgotPasswordBodySchema = z.object({
  email: z.string().trim().min(1, '请输入邮箱').email('邮箱格式不正确'),
})
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>

/** `?redirect=` 只接受站内路径，避免开放重定向 */
export function safeRedirect(value: string | null | undefined): string {
  if (value === null || value === undefined) return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
