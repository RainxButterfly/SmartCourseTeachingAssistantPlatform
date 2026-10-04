import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 契约漂移防护 —— 「契约优先」纪律的自动化兜底。
 *
 * 比对两侧：
 *  - **事实源**：`docs/api/openapi.yaml` 的 `paths`（由 PAD 导出）
 *  - **实际实现**：`src/` 里所有请求调用的 method + path
 *
 * 断言方向刻意是单向的：**前端调用了契约里不存在的接口即失败**（这是真漂移，联调必然 404）。
 * 反过来「契约里有、前端未调用」只作信息，不判失败 —— 如 `/health`、`/actuator/info`、
 * 小文件兜底的 multipart 上传等，本来就只有后端关心。
 *
 * 注意：**排除 `src/mocks/`** —— mock 是契约的测试替身，它注册的路径正是契约本身，
 * 拿它去比对会变成同义反复。
 */

/** vitest 的 cwd 就是 frontend/（npm script 在该目录执行），据此定位源码与仓库根下的契约文件 */
const FRONTEND_DIR = process.cwd()
const SRC_DIR = join(FRONTEND_DIR, 'src')
const SPEC_FILE = join(FRONTEND_DIR, '..', 'docs', 'api', 'openapi.yaml')

const METHODS: readonly string[] = ['get', 'post', 'put', 'delete', 'patch']

/** 动态段统一成 `{param}`：`/courses/${id}` 与 `/courses/{id}` 归一到同一形态 */
function normalize(path: string): string {
  return path
    .replace(/\$\{[^}]*\}/g, '{param}')
    .replace(/\{[^}]*\}/g, '{param}')
    .replace(/\/+$/, '')
}

/**
 * 从 openapi.yaml 的 `paths` 段提取 `METHOD /path`。
 * 该文件由本仓库维护、缩进固定（path 键 2 空格、method 键 4 空格），故按缩进识别；
 * 解析是否失效由下面的「解析器自检」用例兜底，避免空比对静默通过。
 */
function readSpecEndpoints(): string[] {
  const endpoints: string[] = []
  let currentPath: string | null = null

  for (const line of readFileSync(SPEC_FILE, 'utf8').split(/\r?\n/)) {
    const pathMatch = /^ {2}(\/\S*):\s*$/.exec(line)
    if (pathMatch?.[1] !== undefined) {
      currentPath = pathMatch[1]
      continue
    }

    const methodMatch = /^ {4}([a-z]+):\s*$/.exec(line)
    if (methodMatch?.[1] === undefined || currentPath === null) continue
    if (!METHODS.includes(methodMatch[1])) continue

    endpoints.push(`${methodMatch[1].toUpperCase()} ${normalize(currentPath)}`)
  }

  return endpoints
}

function walkSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      // mocks 是契约的测试替身，不参与比对
      return entry.name === 'mocks' ? [] : walkSourceFiles(join(dir, entry.name))
    }
    return /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []
  })
}

/** 同文件里的 `const NAME = '/literal'`，用于还原 `fetch(\`${env.apiBaseUrl}${CONST}\`)` 这类写法 */
function readStringConsts(source: string): Map<string, string> {
  const consts = new Map<string, string>()
  const pattern = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]*)\2/g

  for (const match of source.matchAll(pattern)) {
    const name = match[1]
    const value = match[3]
    if (name !== undefined && value !== undefined) consts.set(name, value)
  }

  return consts
}

interface CallSite {
  method: string
  path: string
  file: string
}

/**
 * 取出 `index` 所在的对象字面量文本：先向前找最近的 `{`，再按花括号配对找到闭合的 `}`。
 * 模板字面量里的 `${…}` 也是配对的，因此朴素计数在本仓库的内联对象上足够可靠；
 * 解析一旦失效，由「解析器自检」用例兜底，不会静默通过。
 */
function findEnclosingObject(source: string, index: number): string {
  const open = source.lastIndexOf('{', index)
  if (open === -1) return ''

  let depth = 0
  const limit = Math.min(source.length, open + 2000)
  for (let i = open; i < limit; i += 1) {
    const char = source[i]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open, i + 1)
    }
  }

  return source.slice(open)
}

function scanFile(file: string): CallSite[] {
  const source = readFileSync(file, 'utf8')
  const consts = readStringConsts(source)
  const fileLabel = file.slice(SRC_DIR.length + 1)
  const found: CallSite[] = []

  const push = (method: string, rawPath: string): void => {
    // 只认站内接口路径（以 / 开头），忽略绝对地址（如 MinIO 的 https://…）
    if (!rawPath.startsWith('/')) return

    let resolved = rawPath
    for (const [name, value] of consts) {
      resolved = resolved.replaceAll(`\${${name}}`, value)
    }
    found.push({ method: method.toUpperCase(), path: normalize(resolved), file: fileLabel })
  }

  // ① 函数式：http.get('/ai/suggestions')、http.post<null>('/ai/chat/abort')
  const functional = /https?\.(get|post|put|delete|patch)(?:<[^>]*>)?\(\s*(['"`])(\/[^'"`]*)\2/g
  for (const match of source.matchAll(functional)) {
    const verb = match[1]
    const path = match[3]
    if (verb !== undefined && path !== undefined) push(verb, path)
  }

  // ② 对象式：{ method: 'PUT', url: '/materials/${id}' } —— 方法必须取自**同一对象字面量**，
  // 否则会误用上一个请求对象的方法（同文件里多个请求对象相邻时必然出错）
  const objectForm = /(?<![\w$])url\s*:\s*(['"`])(\/[^'"`]*)\1/g
  for (const match of source.matchAll(objectForm)) {
    const path = match[2]
    if (path === undefined || match.index === undefined) continue

    const scope = findEnclosingObject(source, match.index)
    const methodMatch = /method\s*:\s*'([A-Za-z]+)'/.exec(scope)
    if (methodMatch?.[1] !== undefined) {
      push(methodMatch[1], path)
      continue
    }

    // 退路：该对象所属的 http.<verb>( 写法
    const verbMatch = /https?\.(get|post|put|delete|patch)/.exec(
      source.slice(Math.max(0, match.index - 200), match.index),
    )
    if (verbMatch?.[1] !== undefined) push(verbMatch[1], path)
  }

  // ③ fetch 直连：SSE 流式问答 fetch(`${env.apiBaseUrl}${CHAT_STREAM_PATH}`)，method 取 init 里的值
  const fetchForm = /fetch\(\s*[`'"][^`'"]*\$\{env\.apiBaseUrl\}([^`'"]*)[`'"]/g
  for (const match of source.matchAll(fetchForm)) {
    const tail = match[1]
    if (tail === undefined || match.index === undefined) continue

    let resolved = tail
    for (const [name, value] of consts) {
      resolved = resolved.replaceAll(`\${${name}}`, value)
    }
    if (resolved === '') continue

    const methodMatch = /method\s*:\s*'([A-Za-z]+)'/.exec(
      source.slice(match.index, match.index + 400),
    )
    if (methodMatch?.[1] !== undefined) push(methodMatch[1], resolved)
  }

  return found
}

const specEndpoints = new Set(readSpecEndpoints())
const callSites = walkSourceFiles(SRC_DIR).flatMap(scanFile)
const callEndpoints = new Set(callSites.map((site) => `${site.method} ${site.path}`))

describe('契约漂移防护（openapi.yaml ↔ 前端实际请求）', () => {
  it('解析器自检：两侧都能读到预期条目，避免解析失效导致空比对静默通过', () => {
    for (const endpoint of [
      'GET /courses',
      'POST /auth/login',
      'PUT /auth/password',
      'POST /ai/chat/stream',
      'GET /materials/{param}/parse-status',
    ]) {
      expect(specEndpoints.has(endpoint), `openapi.yaml 未解析出 ${endpoint}`).toBe(true)
    }

    for (const endpoint of [
      'GET /courses',
      'POST /ai/chat/stream',
      'POST /ai/chat/abort',
      'PUT /messages/{param}/feedback',
      'POST /materials/presign',
    ]) {
      expect(callEndpoints.has(endpoint), `源码扫描未识别出 ${endpoint}`).toBe(true)
    }
  })

  it('前端不得调用契约里不存在的接口（真漂移会导致联调 404）', () => {
    const drifted = [...callEndpoints].filter((endpoint) => !specEndpoints.has(endpoint)).sort()
    const detail = callSites
      .filter((site) => drifted.includes(`${site.method} ${site.path}`))
      .map((site) => `  ${site.method} ${site.path}  ←  ${site.file}`)
      .join('\n')

    expect(drifted, `以下调用不在 docs/api/openapi.yaml 中：\n${detail}`).toEqual([])
  })
})
