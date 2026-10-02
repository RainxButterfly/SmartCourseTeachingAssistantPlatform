import { UploadCloud } from 'lucide-react'
import { type DragEvent, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ALLOWED_MATERIAL_FORMATS, env } from '@/lib/env'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

/**
 * 拖拽 / 多选 / 粘贴三种入口的上传区。
 * 键盘可达性由「选择文件」按钮保证；拖拽与粘贴属于指针/系统级手势，作为额外便利入口。
 * 粘贴监听挂在 document 上而不是依赖容器聚焦，避免为了接收 paste 把静态容器做成可聚焦元素。
 */
export function UploadDropzone({ onFilesSelected, disabled = false }: UploadDropzoneProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const callbackRef = useRef(onFilesSelected)
  useEffect(() => {
    callbackRef.current = onFilesSelected
  })

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent): void => {
      if (disabled || event.clipboardData === null || event.clipboardData.files.length === 0) return
      event.preventDefault()
      callbackRef.current(Array.from(event.clipboardData.files))
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [disabled])

  const emit = (fileList: FileList | null): void => {
    if (fileList === null || fileList.length === 0) return
    onFilesSelected(Array.from(fileList))
  }

  const handleDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    emit(event.dataTransfer.files)
  }

  return (
    <section
      aria-labelledby={titleId}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-xl border border-dashed p-6 text-center transition-colors',
        isDragging ? 'border-primary bg-accent' : 'border-border',
        disabled && 'opacity-60',
      )}
    >
      <UploadCloud aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
      <p id={titleId} className="mt-2 font-medium text-sm">
        拖拽文件到此处，或
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          选择文件
        </Button>
        <span className="text-muted-foreground text-xs">支持多选</span>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        支持 {ALLOWED_MATERIAL_FORMATS.join(' / ')}，单文件不超过 {env.maxUploadMb}
        MB；也可直接粘贴文件
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.docx,.md"
        aria-label="选择资料文件"
        className="sr-only"
        onChange={(event) => {
          emit(event.target.files)
          // 允许重复选择同一文件
          event.target.value = ''
        }}
      />
    </section>
  )
}
