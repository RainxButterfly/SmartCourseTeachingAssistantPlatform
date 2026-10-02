import { Send, Square } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatComposerProps {
  isStreaming: boolean
  disabled?: boolean
  onSend: (question: string) => void
  onStop: () => void
}

/** 输入框（PAD §6.2）：多行自适应、Enter 发送 / Shift+Enter 换行、流式中提供「停止生成」 */
export function ChatComposer({ isStreaming, disabled = false, onSend, onStop }: ChatComposerProps) {
  const [value, setValue] = useState('')
  // 中文输入法组合期间的回车属于「选词确认」，不能触发发送
  const composingRef = useRef(false)

  const submit = (): void => {
    const question = value.trim()
    if (question === '' || isStreaming || disabled) return
    setValue('')
    onSend(question)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (composingRef.current || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  return (
    <form
      className="flex items-end gap-2 rounded-xl border border-border p-2"
      onSubmit={handleSubmit}
    >
      <Textarea
        value={value}
        rows={1}
        aria-label="输入问题"
        placeholder="向本课程资料提问，Enter 发送 / Shift+Enter 换行"
        className="min-h-9 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={() => {
          composingRef.current = false
        }}
        onKeyDown={handleKeyDown}
      />

      {isStreaming ? (
        <Button type="button" variant="outline" onClick={onStop}>
          <Square aria-hidden="true" />
          停止生成
        </Button>
      ) : (
        <Button type="submit" disabled={disabled || value.trim() === ''}>
          <Send aria-hidden="true" />
          发送
        </Button>
      )}
    </form>
  )
}
