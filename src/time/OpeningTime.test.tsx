import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openingWindow } from '../../shared/hours'
import { OpeningTime } from './OpeningTime'

function hhmm(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
}

describe('OpeningTime', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const { opens, closes } = openingWindow('2026-01-15')

  it('says when it opens tonight, in café time, before opening', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
    const { container } = render(<OpeningTime />)
    expect(container).toHaveTextContent(`Opens tonight at ${hhmm(opens)} café time`)
    const time = container.querySelector('time')
    expect(time).toHaveTextContent(hhmm(opens))
    expect(time).toHaveAttribute('datetime', opens.toISOString())
  })

  it('says it is open, until 03:00, while open', () => {
    vi.setSystemTime(new Date(opens.getTime() + 60_000))
    const { container } = render(<OpeningTime />)
    expect(container).toHaveTextContent('Open now, until 03:00 café time')
    expect(container.querySelector('time')).toHaveAttribute('datetime', closes.toISOString())
  })

  it('is still open at 01:30 café time', () => {
    vi.setSystemTime(new Date('2026-01-16T01:30:00Z'))
    render(<OpeningTime />)
    expect(screen.getByText(/Open now/)).toBeInTheDocument()
  })

  it('says opens tonight between 03:00 and the day opening', () => {
    vi.setSystemTime(new Date('2026-01-16T03:00:00Z'))
    const next = openingWindow('2026-01-16').opens
    const { container } = render(<OpeningTime />)
    expect(container).toHaveTextContent(`Opens tonight at ${hhmm(next)} café time`)
  })
})
