import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground"
          >
            助
          </span>
          <h1 className="font-semibold text-lg">智能课程助教平台</h1>
          <p className="text-muted-foreground text-sm">基于课程资料的 RAG 专属助教</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
