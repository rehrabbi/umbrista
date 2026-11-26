import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

type MediaMatches = Record<string, boolean>

let mediaMatches: MediaMatches = {}

function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: mediaMatches[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
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
  installMatchMedia()
  setWebGL(true)
})
