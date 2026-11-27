import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DRINKS } from '../../shared/menu'
import { resetSceneGate } from '../scene/gate'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { MenuCounter } from './MenuCounter'

vi.mock('@react-three/fiber', async () => (await import('../test/r3f')).fiberStandIn)

const requests = vi.hoisted(() => [] as [string, string][])
vi.mock('./useDrinkModel', async () => {
  const { Group } = await import('three')
  return {
    useDrinkModel: (model: string, detail: string) => {
      requests.push([model, detail])
      return new Group()
    },
    preloadDrinkModel: () => {},
  }
})
vi.mock('../scene/nightRoom', () => ({ nightRoom: () => null }))

const REDUCED = '(prefers-reduced-motion: reduce)'
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
  requests.length = 0
})

afterEach(() => {
  resetSceneGate()
})

/** The visitor moves the pointer, and the counter is near the screen: the 3D may start. */
function intent(container: HTMLElement) {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
    for (const host of container.querySelectorAll('[data-scene-host]')) setIntersecting(host, true)
  })
}

async function settle(ms = 400) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

describe('MenuCounter', () => {
  it('is a listbox of every drink, in menu order, each named with its price', () => {
    render(<MenuCounter onPick={() => {}} />)
    const list = screen.getByRole('listbox', { name: 'Drinks on the counter' })
    const options = within(list).getAllByRole('option')
    expect(options).toHaveLength(DRINKS.length)
    expect(options).toHaveLength(9)
    expect(options[0]).toHaveAccessibleName('Last Tram 2.80')
    expect(options[8]).toHaveAccessibleName('Three O’Clock 5.40')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('moves the choice with the arrow keys, Home and End', () => {
    render(<MenuCounter onPick={() => {}} />)
    const list = screen.getByRole('listbox')
    const selected = () => within(list).getByRole('option', { selected: true })
    list.focus()

    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(selected()).toHaveAccessibleName('Fog Line 3.40')
    expect(list).toHaveAttribute('aria-activedescendant', selected().id)
    fireEvent.keyDown(list, { key: 'ArrowDown' })
    expect(selected()).toHaveAccessibleName('Lantern 4.20')
    fireEvent.keyDown(list, { key: 'ArrowLeft' })
    fireEvent.keyDown(list, { key: 'ArrowUp' })
    expect(selected()).toHaveAccessibleName('Last Tram 2.80')
    // No wrapping at the ends.
    fireEvent.keyDown(list, { key: 'ArrowLeft' })
    expect(selected()).toHaveAccessibleName('Last Tram 2.80')
    fireEvent.keyDown(list, { key: 'End' })
    expect(selected()).toHaveAccessibleName('Three O’Clock 5.40')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(selected()).toHaveAccessibleName('Three O’Clock 5.40')
    fireEvent.keyDown(list, { key: 'Home' })
    expect(selected()).toHaveAccessibleName('Last Tram 2.80')
    expect(within(list).getAllByRole('option', { selected: true })).toHaveLength(1)
  })

  it('jumps to the chosen drink on Enter', () => {
    const onPick = vi.fn()
    render(<MenuCounter onPick={onPick} />)
    const list = screen.getByRole('listbox')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(onPick).not.toHaveBeenCalled()
    fireEvent.keyDown(list, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledExactlyOnceWith('lantern')
  })

  it('jumps to a drink when it is tapped', () => {
    const onPick = vi.fn()
    render(<MenuCounter onPick={onPick} />)
    fireEvent.click(screen.getByRole('option', { name: 'Umbra 4.90' }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith('umbra')
    expect(screen.getByRole('option', { name: 'Umbra 4.90' })).toHaveAttribute('aria-selected', 'true')
  })

  it('does not jump when the counter was dragged along rather than tapped', () => {
    const onPick = vi.fn()
    render(<MenuCounter onPick={onPick} />)
    const list = screen.getByRole('listbox')
    const option = screen.getByRole('option', { name: 'Umbra 4.90' })
    fireEvent.pointerDown(list, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300, isPrimary: true })
    fireEvent.pointerMove(list, { pointerId: 1, pointerType: 'mouse', clientX: 220, isPrimary: true })
    fireEvent.pointerUp(list, { pointerId: 1, pointerType: 'mouse', clientX: 220, isPrimary: true })
    fireEvent.click(option)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('draws the counter with the light models once the visitor shows intent', async () => {
    const { container } = render(<MenuCounter onPick={() => {}} />)
    await settle(300)
    expect(container.querySelector('canvas')).toBeNull()
    intent(container)
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(DRINKS.length), SLOW)
    expect(new Set(requests.map(([, detail]) => detail))).toEqual(new Set(['lite']))
    expect(new Set(requests.map(([model]) => model))).toEqual(new Set(DRINKS.map((drink) => drink.model)))
  }, 15_000)

  it('under reduced motion shows every drink as its still, with no canvas', async () => {
    setMatchMedia(REDUCED, true)
    const { container } = render(<MenuCounter onPick={() => {}} />)
    intent(container)
    await settle()
    expect(container.querySelector('[data-scene-host]')).toBeNull()
    for (const option of screen.getAllByRole('option')) expect(option.querySelector('img')).not.toBeNull()
    expect(requests).toHaveLength(0)
  })

  it('without WebGL shows every drink as its still, and draws nothing', async () => {
    setWebGL(false)
    const { container } = render(<MenuCounter onPick={() => {}} />)
    intent(container)
    await settle(900)
    expect(container.querySelector('canvas')).toBeNull()
    for (const option of screen.getAllByRole('option')) expect(option.querySelector('img')).not.toBeNull()
    expect(requests).toHaveLength(0)
  })
})
