import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BREW, brewLook, type BrewChoice } from '../../../shared/brew'
import { setMatchMedia } from '../../test/setup'
import BrewCup, { EASE_SECONDS } from './BrewCup'
import { brewSurface } from './brewSurface'
import type { CupSource, HeroCupProps } from './HeroCup'

vi.mock('@react-three/fiber', async () => (await import('../../test/r3f')).fiberStandIn)

// The cup itself draws with WebGL; here it keeps what it was given.
const given = vi.hoisted(() => ({ props: null as HeroCupProps | null }))
vi.mock('./HeroCup', () => ({
  default: (props: HeroCupProps) => {
    given.props = props
    return null
  },
}))

const REDUCED = '(prefers-reduced-motion: reduce)'
const DARK_LATTE: BrewChoice = { beans: 'harbour', roast: 'dark', method: 'long-black', milk: 'whole' }

function source(): CupSource {
  const current = given.props?.source
  if (!current) throw new Error('BrewCup gave the cup no source')
  return current
}

const target = (choice: BrewChoice) => brewSurface(brewLook(choice))

beforeEach(() => {
  given.props = null
})

describe('BrewCup', () => {
  it('shows the cup at rest, its coffee the drink chosen', () => {
    render(<BrewCup choice={DEFAULT_BREW} />)
    expect(given.props?.still).toBe(true)
    const shown = source()(5)
    expect(shown.look).toEqual(target(DEFAULT_BREW).look)
    expect(shown.tint).toEqual(target(DEFAULT_BREW).tint)
    expect(shown.changing).toBe(false)
  })

  it('eases to a new choice over the ease, starting from what it showed', () => {
    const { rerender } = render(<BrewCup choice={DEFAULT_BREW} />)
    source()(5)
    rerender(<BrewCup choice={DARK_LATTE} />)
    const from = target(DEFAULT_BREW)
    const to = target(DARK_LATTE)

    const start = source()(10)
    expect(start.look.level).toBeCloseTo(from.look.level)
    expect(start.changing).toBe(true)

    const middle = source()(10 + EASE_SECONDS / 2)
    expect(middle.look.level).toBeGreaterThan(from.look.level)
    expect(middle.look.level).toBeLessThan(to.look.level)
    expect(middle.tint[0]).toBeLessThan(from.tint[0])
    expect(middle.changing).toBe(true)

    const end = source()(10 + EASE_SECONDS)
    expect(end.look).toEqual(to.look)
    expect(end.changing).toBe(false)
  })

  it('eases over 0.6 seconds, a scene change in the house motion', () => {
    expect(EASE_SECONDS).toBeCloseTo(0.6)
  })

  it('turns back smoothly from part way through an ease', () => {
    const { rerender } = render(<BrewCup choice={DEFAULT_BREW} />)
    source()(0)
    rerender(<BrewCup choice={DARK_LATTE} />)
    source()(1)
    const partWay = source()(1 + EASE_SECONDS / 2)
    rerender(<BrewCup choice={DEFAULT_BREW} />)
    expect(source()(1 + EASE_SECONDS / 2).look.level).toBeCloseTo(partWay.look.level)
  })

  it('does not ease again for a new name: the cup has not changed', () => {
    const { rerender } = render(<BrewCup choice={DEFAULT_BREW} />)
    source()(0)
    rerender(<BrewCup choice={{ ...DEFAULT_BREW, name: 'The long way home' }} />)
    expect(source()(0.01).changing).toBe(false)
  })

  it('changes at once under reduced motion', () => {
    setMatchMedia(REDUCED, true)
    const { rerender } = render(<BrewCup choice={DEFAULT_BREW} />)
    source()(0)
    rerender(<BrewCup choice={DARK_LATTE} />)
    const now = source()(1)
    expect(now.look).toEqual(target(DARK_LATTE).look)
    expect(now.changing).toBe(false)
  })
})
