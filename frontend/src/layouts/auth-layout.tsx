import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img
            src="/logo-128.png"
            width={56}
            height={56}
            alt=""
            aria-hidden="true"
            className="size-14 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="font-semibold text-lg">智能课程助教平台</h1>
          <p className="text-muted-foreground text-sm">基于课程资料的 RAG 专属助教</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
