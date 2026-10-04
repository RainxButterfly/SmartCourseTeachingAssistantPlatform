import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { fail, ok } from '@/mocks/utils/response'
import {
  type AuthTokens,
  ChangePasswordBodySchema,
  ForgotPasswordBodySchema,
  LoginBodySchema,
  LogoutBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
  type User,
} from '@/schemas/auth'
import { ERROR_CODES } from '@/schemas/common'

const API = env.apiBaseUrl

/** mock 固定验证码：联调时前端可直接输入，发码时 console.info 打出（PAD §6.2 v0.15） */
const MOCK_VERIFICATION_CODE = '123456'
const VERIFICATION_TTL_MS = 300_000
const RESEND_INTERVAL_MS = 60_000
const DAILY_SEND_LIMIT = 10

interface MockAccount {
  user: User
  password: string
}

/** mock 演示账号（PAD §7.1 已注明，仅 mock 生效） */
const DEMO_ACCOUNT: MockAccount = {
  user: { id: 1, username: '张三', avatar: null, email: 'demo@example.com' },
  password: 'Demo@1234',
}

/** 切到「未登录」验证守卫时，ensure-session 注入的就是这个 refresh token */
const AUTO_LOGIN_REFRESH_TOKEN = 'mock-refresh-token'

const authStore = {
  accounts: [] as MockAccount[],
  /** 有效的 refresh token（refresh 轮换：用掉即失效） */
  refreshTokens: new Set<string>(),
  /** refresh token → 用户 id，供「改密码吊销该用户全部 refresh token」使用 */
  refreshTokenOwners: new Map<string, number>(),
  /** access token → 用户 id，供 /auth/me 识别当前用户 */
  tokenOwners: new Map<string, number>(),
  /** 邮箱 → 当前有效验证码（TTL 300s，一次性作废） */
  resetCodes: new Map<string, { code: string; expiresAt: number }>(),
  /** 邮箱 → 最近一次发码时间，用于 60s 重发节流 */
  lastResetSentAt: new Map<string, number>(),
  /** 邮箱 → 当日发码次数（单日 > 10 次返回 1009） */
  resetSendCount: new Map<string, { day: string; count: number }>(),
  userSeq: 1,
  tokenSeq: 0,
}

export function resetAuthStore(): void {
  authStore.accounts = [{ ...DEMO_ACCOUNT, user: { ...DEMO_ACCOUNT.user } }]
  authStore.refreshTokens = new Set([AUTO_LOGIN_REFRESH_TOKEN])
  authStore.refreshTokenOwners = new Map()
  authStore.tokenOwners = new Map()
  authStore.resetCodes = new Map()
  authStore.lastResetSentAt = new Map()
  authStore.resetSendCount = new Map()
  authStore.userSeq = 1
  authStore.tokenSeq = 0
}

resetAuthStore()

function issueTokens(userId: number): AuthTokens {
  authStore.tokenSeq += 1
  const accessToken = `mock-access-${authStore.tokenSeq}`
  const refreshToken = `mock-refresh-${authStore.tokenSeq}`

  authStore.refreshTokens.add(refreshToken)
  authStore.refreshTokenOwners.set(refreshToken, userId)
  authStore.tokenOwners.set(accessToken, userId)

  return { access_token: accessToken, refresh_token: refreshToken, expires_in: 7200 }
}

function findAccountByEmail(email: string): MockAccount | undefined {
  return authStore.accounts.find((account) => account.user.email === email)
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** POST /auth/register —— 注册成功即登录 */
const registerAccount: HttpResponseResolver = async ({ request }) => {
  const parsed = RegisterBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { email, username, password } = parsed.data
  if (findAccountByEmail(email) !== undefined) {
    return fail(ERROR_CODES.CONFLICT, '该邮箱已注册')
  }

  authStore.userSeq += 1
  const user: User = { id: authStore.userSeq + 1, username, avatar: null, email }
  authStore.accounts.push({ user, password })

  return ok({ ...issueTokens(user.id), user })
}

/** POST /auth/login —— 邮箱或密码错误一律 1002，不区分具体原因 */
const loginAccount: HttpResponseResolver = async ({ request }) => {
  const parsed = LoginBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const account = findAccountByEmail(parsed.data.email)
  if (account === undefined || account.password !== parsed.data.password) {
    return fail(ERROR_CODES.UNAUTHORIZED, '邮箱或密码错误')
  }

  return ok({ ...issueTokens(account.user.id), user: account.user })
}

/** POST /auth/refresh —— 轮换：旧 refresh token 立即失效 */
const refreshTokens: HttpResponseResolver = async ({ request }) => {
  const parsed = RefreshBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, '请求参数无效')
  }

  const { refresh_token: refreshToken } = parsed.data
  if (!authStore.refreshTokens.has(refreshToken)) {
    return fail(ERROR_CODES.UNAUTHORIZED, '登录状态已失效，请重新登录')
  }

  const ownerId = authStore.accounts[0]?.user.id ?? 1
  authStore.refreshTokens.delete(refreshToken)

  return ok(issueTokens(ownerId))
}

/** POST /auth/logout —— 吊销 refresh token */
const logoutAccount: HttpResponseResolver = async ({ request }) => {
  const parsed = LogoutBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, '请求参数无效')
  }

  authStore.refreshTokens.delete(parsed.data.refresh_token)
  return ok(null)
}

/** 从 Authorization 头反查当前用户（自动登录注入的固定 token 兜底到演示账号） */
function resolveCurrentUser(request: Request): User | null {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (token === 'mock-access-token') return DEMO_ACCOUNT.user

  const ownerId = authStore.tokenOwners.get(token)
  if (ownerId === undefined) return null
  return authStore.accounts.find((item) => item.user.id === ownerId)?.user ?? null
}

/** 吊销某用户的全部 refresh token（改密码后强制重新登录，PAD §7.1 v0.14） */
function revokeAllRefreshTokensOf(userId: number): void {
  for (const [token, owner] of authStore.refreshTokenOwners) {
    if (owner !== userId) continue
    authStore.refreshTokens.delete(token)
    authStore.refreshTokenOwners.delete(token)
  }
}

/** GET /auth/me —— 按 access token 反查当前用户 */
const getMe: HttpResponseResolver = ({ request }) => {
  const user = resolveCurrentUser(request)
  if (user === null) return fail(ERROR_CODES.UNAUTHORIZED)
  return ok(user)
}

/**
 * PUT /auth/password —— 改密码。
 * 原密码错误必须是 `1007`（HTTP 400），**不能是 `1002`**：
 * 否则前端的 401 拦截器会当作登录失效去刷新并重放，把用户误登出（PAD §7.1 v0.14）。
 */
const changePassword: HttpResponseResolver = async ({ request }) => {
  const parsed = ChangePasswordBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const current = resolveCurrentUser(request)
  if (current === null) return fail(ERROR_CODES.UNAUTHORIZED)

  const account = authStore.accounts.find((item) => item.user.id === current.id)
  if (account === undefined) return fail(ERROR_CODES.UNAUTHORIZED)

  if (account.password !== parsed.data.old_password) {
    return fail(ERROR_CODES.INVALID_OLD_PASSWORD, '原密码不正确')
  }

  account.password = parsed.data.new_password
  revokeAllRefreshTokensOf(account.user.id)
  return ok(null)
}

/**
 * POST /auth/forgot-password —— 生成 6 位验证码并「发信」，无论邮箱是否存在都返回成功（防用户枚举）。
 * 60s 内重复请求或单日超过 10 次 → 1009（HTTP 429）。
 */
const requestPasswordReset: HttpResponseResolver = async ({ request }) => {
  const parsed = ForgotPasswordBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { email } = parsed.data
  const now = Date.now()

  const lastSentAt = authStore.lastResetSentAt.get(email)
  if (lastSentAt !== undefined && now - lastSentAt < RESEND_INTERVAL_MS) {
    return fail(ERROR_CODES.TOO_MANY_REQUESTS, '请求过于频繁，请稍后再试')
  }

  const day = new Date(now).toISOString().slice(0, 10)
  const counter = authStore.resetSendCount.get(email)
  const sentToday = counter?.day === day ? counter.count : 0
  if (sentToday >= DAILY_SEND_LIMIT) {
    return fail(ERROR_CODES.TOO_MANY_REQUESTS, '请求过于频繁，请稍后再试')
  }

  authStore.lastResetSentAt.set(email, now)
  authStore.resetSendCount.set(email, { day, count: sentToday + 1 })

  // 未注册邮箱不发信但同样返回成功，避免通过响应差异枚举账号
  if (findAccountByEmail(email) !== undefined) {
    authStore.resetCodes.set(email, {
      code: MOCK_VERIFICATION_CODE,
      expiresAt: now + VERIFICATION_TTL_MS,
    })
    console.info(`[mock] 密码重置验证码已发送至 ${email}：${MOCK_VERIFICATION_CODE}`)
  }

  return ok(null)
}

/**
 * POST /auth/reset-password —— 校验验证码后改密码并吊销该用户全部 refresh token。
 * 验证码错误 / 过期 / 邮箱未注册**统一返回 1008**，不区分原因（防枚举）。
 */
const resetPassword: HttpResponseResolver = async ({ request }) => {
  const parsed = ResetPasswordBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { email, code, new_password: newPassword } = parsed.data
  const account = findAccountByEmail(email)
  const record = authStore.resetCodes.get(email)

  if (
    account === undefined ||
    record === undefined ||
    record.code !== code ||
    record.expiresAt <= Date.now()
  ) {
    return fail(ERROR_CODES.INVALID_VERIFICATION_CODE, '验证码不正确或已过期')
  }

  account.password = newPassword
  authStore.resetCodes.delete(email) // 验证码一次性作废
  revokeAllRefreshTokensOf(account.user.id)
  return ok(null)
}

export const authHandlers = [
  http.post(`${API}/auth/register`, registerAccount),
  http.post(`${API}/auth/login`, loginAccount),
  http.post(`${API}/auth/refresh`, refreshTokens),
  http.post(`${API}/auth/logout`, logoutAccount),
  http.get(`${API}/auth/me`, getMe),
  http.put(`${API}/auth/password`, changePassword),
  http.post(`${API}/auth/forgot-password`, requestPasswordReset),
  http.post(`${API}/auth/reset-password`, resetPassword),
]
