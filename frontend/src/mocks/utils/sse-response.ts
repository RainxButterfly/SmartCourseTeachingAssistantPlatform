import { HttpResponse } from 'msw'

export interface SseEventPayload {
  event: string
  data: unknown
}

interface SseStreamOptions {
  /** 相邻帧间隔，模拟打字机效果；设为 0 表示一次性推送 */
  chunkIntervalMs?: number
  signal?: AbortSignal
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, ms)
    function handleAbort(): void {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

/**
 * 构造符合 PAD §7.9 的 SSE 响应。
 * 帧格式固定为 `event: <name>\ndata: <json>\n\n`，与真实后端正则解析结果一致。
 */
export function createSseResponse(
  events: SseEventPayload[],
  options: SseStreamOptions = {},
): Response {
  const { chunkIntervalMs = 24, signal } = options
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const item of events) {
          if (signal?.aborted) break
          controller.enqueue(
            encoder.encode(`event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`),
          )
          if (chunkIntervalMs > 0) await delay(chunkIntervalMs, signal)
        }
      } catch {
        // 客户端中断（停止生成）时静默结束
      } finally {
        try {
          controller.close()
        } catch {
          // 已关闭则忽略
        }
      }
    },
  })

  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** 把一段回答切成打字机分片（按标点与长度切，尽量自然） */
export function splitIntoDeltas(text: string, size = 6): string[] {
  const deltas: string[] = []
  for (let index = 0; index < text.length; index += size) {
    deltas.push(text.slice(index, index + size))
  }
  return deltas
}
