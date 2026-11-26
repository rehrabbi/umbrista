import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetOverride, setOverride } from './night-store'
import { TimeOfDay } from './TimeOfDay'

describe('TimeOfDay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    resetOverride()
    delete document.documentElement.dataset.time
  })

  it('sets data-time on the root element from the clock and the override', () => {
    render(<TimeOfDay />)
    expect(document.documentElement.dataset.time).toBe('day')
    act(() => setOverride('night'))
    expect(document.documentElement.dataset.time).toBe('night')
    act(() => setOverride(null))
    expect(document.documentElement.dataset.time).toBe('day')
  })

  it('moves to night when the clock passes dusk', () => {
    render(<TimeOfDay />)
    act(() => {
      vi.setSystemTime(new Date('2026-03-20T23:00:00Z'))
      vi.advanceTimersByTime(60_000)
    })
    expect(document.documentElement.dataset.time).toBe('night')
  })
})
