import { describe, expect, it } from 'vitest'
import { setMatchMedia, setWebGL } from './setup'

describe('test setup helpers', () => {
  it('reports no media query as matching by default', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false)
  })

  it('lets a test turn one media query on', () => {
    setMatchMedia('(prefers-reduced-motion: reduce)', true)
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
    expect(window.matchMedia('(pointer: coarse)').matches).toBe(false)
  })

  it('starts each test with WebGL available and lets a test remove it', () => {
    const canvas = document.createElement('canvas')
    expect(canvas.getContext('webgl2')).not.toBeNull()
    setWebGL(false)
    expect(canvas.getContext('webgl2')).toBeNull()
    expect(canvas.getContext('webgl')).toBeNull()
  })
})
