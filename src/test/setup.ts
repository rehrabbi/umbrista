import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

type MediaMatches = Record<string, boolean>

let mediaMatches: MediaMatches = {}
const mediaListeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: mediaMatches[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type !== 'change') return
        mediaListeners.set(query, (mediaListeners.get(query) ?? new Set()).add(listener))
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') mediaListeners.get(query)?.delete(listener)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

/** Make `window.matchMedia(query).matches` return `matches` for one exact query string. */
export function setMatchMedia(query: string, matches: boolean): void {
  mediaMatches = { ...mediaMatches, [query]: matches }
  installMatchMedia()
}

/** Like `setMatchMedia`, and also tells the listeners that subscribed to the query's `change` event. */
export function changeMatchMedia(query: string, matches: boolean): void {
  setMatchMedia(query, matches)
  for (const listener of mediaListeners.get(query) ?? []) {
    const event = { type: 'change', matches, media: query } as unknown as MediaQueryListEvent
    if (typeof listener === 'function') listener(event)
    else listener.handleEvent(event)
  }
}

// jsdom has no ResizeObserver; Lenis and the 3D canvas need one to exist.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver ??= ResizeObserverStub

let webglAvailable = true

/** Make a canvas report WebGL as available (a minimal context object) or missing (null). */
export function setWebGL(available: boolean): void {
  webglAvailable = available
}

HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, contextId: string) {
  if (contextId === 'webgl2' || contextId === 'webgl') {
    return webglAvailable ? ({ canvas: this } as unknown as WebGLRenderingContext) : null
  }
  return null
} as HTMLCanvasElement['getContext']

beforeEach(() => {
  mediaMatches = {}
  mediaListeners.clear()
  installMatchMedia()
  setWebGL(true)
})

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})
