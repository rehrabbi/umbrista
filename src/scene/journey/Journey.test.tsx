import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Journey } from './Journey'
import { lampAt } from './chapters'

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

describe('Journey', () => {
  it('draws chapter 1 on the street at dusk, with the lamps off at the start', () => {
    render(<Journey progress={0} />)
    expect(drawn.props.at(-1)).toMatchObject({ backdrop: 'street-dusk', lamp: 0 })
  })

  it('turns the lamps on as chapter 1 is scrolled through', () => {
    const { rerender } = render(<Journey progress={0.3} />)
    expect(drawn.props.at(-1)!.lamp).toBeCloseTo(lampAt(0.3))
    rerender(<Journey progress={1} />)
    expect(drawn.props.at(-1)!.lamp).toBe(1)
  })

  it('keeps the lamps on past chapter 1', () => {
    render(<Journey progress={2.5} />)
    expect(drawn.props.at(-1)!.lamp).toBe(1)
  })
})
