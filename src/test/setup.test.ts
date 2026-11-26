import { describe, expect, it } from 'vitest'
import { setMatchMedia, setWebGL } from './setup'

const query = '(prefers-reduced-motion: reduce)'

// The tests in this block run in order: the first changes state, the second proves the
// beforeEach in setup.ts put the defaults back.
describe('test setup helpers reset between tests', () => {
  it('lets a test turn a media query on and remove WebGL', () => {
    setMatchMedia(query, true)
    setWebGL(false)

    expect(window.matchMedia(query).matches).toBe(true)
    expect(window.matchMedia('(pointer: coarse)').matches).toBe(false)
    expect(document.createElement('canvas').getContext('webgl2')).toBeNull()
    expect(document.createElement('canvas').getContext('webgl')).toBeNull()
  })

  it('starts the next test with media queries off and WebGL available', () => {
    expect(window.matchMedia(query).matches).toBe(false)
    expect(document.createElement('canvas').getContext('webgl2')).not.toBeNull()
    expect(document.createElement('canvas').getContext('webgl')).not.toBeNull()
  })
})
