import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom 未实现 matchMedia / ResizeObserver，shadcn 组件与图表依赖它们
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

// Base UI ScrollArea 用 getAnimations 判断滚动条动画，jsdom 未实现
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => []
}

// Base UI Select 等浮层组件在打开时会对齐选中项，jsdom 未实现 scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}

afterEach(() => {
  cleanup()
})
