import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTENT_EVENTS, QUIET_MS, resetSceneGate, sceneGateOpen, whenScenesMayStart } from './gate'

beforeEach(() => {
  resetSceneGate()
  vi.useFakeTimers()
})

afterEach(() => {
  resetSceneGate()
  vi.useRealTimers()
})

describe('the scene gate', () => {
  it('waits: nothing starts at load, nor in the first seconds after it', () => {
    const task = vi.fn()
    whenScenesMayStart(task)
    vi.advanceTimersByTime(QUIET_MS - 100)
    expect(task).not.toHaveBeenCalled()
    expect(sceneGateOpen()).toBe(false)
  })

  it.each(['pointermove', 'touchstart', 'keydown', 'wheel', 'scroll'])('opens on the first %s', (type) => {
    expect(INTENT_EVENTS).toContain(type)
    const task = vi.fn()
    whenScenesMayStart(task)
    window.dispatchEvent(new Event(type))
    expect(task).toHaveBeenCalledTimes(1)
    expect(sceneGateOpen()).toBe(true)
    // Later intent does not start it again.
    window.dispatchEvent(new Event(type))
    expect(task).toHaveBeenCalledTimes(1)
  })

  it(`opens on its own after ${QUIET_MS / 1000} s of quiet once the page has loaded`, () => {
    expect(QUIET_MS).toBeGreaterThanOrEqual(5000)
    const task = vi.fn()
    whenScenesMayStart(task)
    vi.advanceTimersByTime(QUIET_MS + 2500)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('stays open: a scene that arrives later starts at once', () => {
    window.dispatchEvent(new Event('wheel'))
    whenScenesMayStart(() => {})
    window.dispatchEvent(new Event('wheel'))
    const late = vi.fn()
    whenScenesMayStart(late)
    expect(late).toHaveBeenCalledTimes(1)
  })

  it('can be cancelled before it opens', () => {
    const task = vi.fn()
    const cancel = whenScenesMayStart(task)
    cancel()
    window.dispatchEvent(new Event('pointermove'))
    expect(task).not.toHaveBeenCalled()
  })
})
