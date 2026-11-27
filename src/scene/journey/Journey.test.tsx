import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Journey } from './Journey'
import { chapterIndex, lampAt } from './chapters'

const drawn = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }))

// The background needs a WebGL canvas; here it only records what the journey asks it to draw.
vi.mock('../background/LivingBackground', () => ({
  LivingBackground: (props: Record<string, unknown>) => {
    drawn.props.push(props)
    return null
  },
}))

beforeEach(() => {
  drawn.props.length = 0
})

const DUSK = chapterIndex('dusk')

describe('Journey', () => {
  it('draws the street at dusk, with the lamps off before the visitor reaches it', () => {
    render(<Journey progress={0.5} />)
    expect(drawn.props.at(-1)).toMatchObject({ backdrop: 'street-dusk', lamp: 0 })
  })

  it('turns the lamps on as the street chapter is scrolled through', () => {
    const { rerender } = render(<Journey progress={DUSK + 0.4} />)
    expect(drawn.props.at(-1)!.lamp).toBeCloseTo(lampAt(0.4))
    rerender(<Journey progress={DUSK + 0.9} />)
    expect(drawn.props.at(-1)!.lamp).toBe(1)
  })

  it('keeps the lamps on past the street chapter', () => {
    render(<Journey progress={DUSK + 1.5} />)
    expect(drawn.props.at(-1)!.lamp).toBe(1)
  })
})
