import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DRINKS, MENU } from '../../shared/menu'
import { formatPrice } from '../../shared/money'
import { CartProvider } from '../cart/CartProvider'
import type { Group } from 'three'
import { SETTLE_MS } from '../menu/BarScene'
import { TURN_STEP, barProgress, clearDrawnDrinks, counterView, drinkPose, resetDrinkTurns, updateCounterView } from '../menu/barProgress'
import { runFrame, rootState } from '../test/r3f'
import { resetSceneGate } from '../scene/gate'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { clearToasts } from '../ui/toast-store'
import Menu from './Menu'

vi.mock('@react-three/fiber', async () => (await import('../test/r3f')).fiberStandIn)

// Counts every model the scenes ask for, by name and detail; each is one Group, kept to inspect.
const requests = vi.hoisted(() => [] as [string, string][])
const models = vi.hoisted(() => new Map<string, unknown>())
vi.mock('../menu/useDrinkModel', async () => {
  const { Group } = await import('three')
  const { useEffect } = await import('react')
  return {
    useDrinkModel: (model: string, detail: string) => {
      // A request is a scene taking the model up (a mount), not each render of it.
      useEffect(() => {
        requests.push([model, detail])
      }, [model, detail])
      const key = `${model}:${detail}`
      if (!models.has(key)) models.set(key, new Group())
      return models.get(key)
    },
    preloadDrinkModel: () => {},
  }
})
vi.mock('../scene/nightRoom', () => ({ nightRoom: () => null }))

const REDUCED = '(prefers-reduced-motion: reduce)'
// The canvases mount after intent, an idle delay, a frame probe and two lazy imports.
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
  resetDrinkTurns()
  requests.length = 0
  models.clear()
  sessionStorage.clear()
  clearToasts()
})

afterEach(() => {
  clearDrawnDrinks()
  barProgress.set(-1)
  resetSceneGate()
})

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/menu']}>
      <CartProvider>
        <Menu />
      </CartProvider>
    </MemoryRouter>,
  )
}

/** The visitor moves the pointer, and every scene is near the screen: the 3D may start. */
function intent(container: HTMLElement) {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
    for (const host of container.querySelectorAll('[data-scene-host]')) setIntersecting(host, true)
  })
}

async function settle(ms = 400) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

const fullModels = () => new Set(requests.filter(([, detail]) => detail === 'full').map(([model]) => model))
const model = (name: string, detail = 'full') => models.get(`${name}:${detail}`) as Group | undefined

/** Run frames until a drink's turn has eased all the way. */
function settleTurn() {
  act(() => {
    for (let frame = 0; frame < 40; frame++) runFrame(0.1)
  })
}

/** Mount the menu with its two canvases live, the bar settled on the drink at `progress`. */
async function renderLive(progress: number) {
  const view = renderMenu()
  intent(view.container)
  await waitFor(() => expect(screen.getAllByTestId('r3f')).toHaveLength(2), SLOW)
  // Count from here: before this, the bar stood where jsdom's empty layout put it.
  requests.length = 0
  act(() => barProgress.set(progress))
  await settle(SETTLE_MS + 100)
  // Two frames: the drinks draw, and say so.
  act(() => {
    runFrame()
    runFrame()
  })
  return view
}

describe('Menu', () => {
  it('has one h1 and the key to the prices', () => {
    renderMenu()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByText('Prices in crowns, the money of Calvessa. Nothing here is for sale.')).toBeInTheDocument()
  })

  it('renders every item as text with its price and an "Add" button naming the item', () => {
    renderMenu()
    for (const item of MENU) {
      const heading = screen.getByRole('heading', { level: 3, name: item.name })
      const section = heading.closest('section, article')!
      expect(within(section as HTMLElement).getByText(item.notes)).toBeInTheDocument()
      expect(within(section as HTMLElement).getByText(formatPrice(item.price))).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Add to order: ${item.name}` })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button', { name: /^Add to order/ })).toHaveLength(MENU.length)
  })

  it('shows each night snack with its photograph, named, once the visitor shows intent', () => {
    const { container } = renderMenu()
    const snacks = screen.getByRole('region', { name: 'Night snacks' })
    const names = ['Burnt custard tart', 'Olive oil & orange cake', 'Dark chocolate with sea salt']
    expect(within(snacks).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(names)
    // Nothing below the first screen is asked for before intent; the photographs' boxes are held open.
    expect(snacks.querySelector('img')).toBeNull()
    expect(snacks.querySelectorAll('.snack-photo')).toHaveLength(3)
    intent(container)
    for (const name of names) {
      const photo = within(snacks).getByRole('img', { name })
      expect(photo.getAttribute('src')).toMatch(/^\/media\/snack-[a-z-]+-1280\.webp$/)
      expect(photo).toHaveAttribute('width')
      expect(photo).toHaveAttribute('height')
      expect(photo).toHaveAttribute('loading', 'lazy')
    }
  })

  it('jumps from the counter to a drink’s section, and moves focus to its name', () => {
    const scrolled: Element[] = []
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this)
    }
    try {
      renderMenu()
      const counter = screen.getByRole('listbox', { name: 'Drinks on the counter' })
      fireEvent.keyDown(counter, { key: 'End' })
      fireEvent.keyDown(counter, { key: 'Enter' })
      expect(scrolled.at(-1)).toHaveAttribute('id', 'drink-three-oclock')
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3, name: 'Three O’Clock' }))
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })

  it('adds to the order and shows what the order holds', () => {
    renderMenu()
    expect(screen.getAllByText('Nothing in your order yet.').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Add to order: Lantern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add to order: Lantern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add to order: Burnt custard tart' }))
    expect(screen.getAllByText(/Your order: 3 items, 11.60 crowns\./).length).toBeGreaterThan(0)
    for (const link of screen.getAllByRole('link', { name: 'See your order' })) expect(link).toHaveAttribute('href', '/order')
  })

  it('loads the full models of the drink on screen and its neighbours only', async () => {
    const { container } = renderMenu()
    intent(container)
    await waitFor(() => expect(screen.getAllByTestId('r3f')).toHaveLength(2), SLOW)
    await waitFor(() => expect(fullModels().size).toBeGreaterThan(0), SLOW)

    for (const [progress, expected] of [
      [4.5, ['sodium', 'night-ferry', 'low-tide']],
      [0.2, ['cup', 'fog-line']],
      [8.5, ['wet-cobble', 'three-oclock']],
    ] as const) {
      requests.length = 0
      act(() => barProgress.set(progress))
      await waitFor(() => expect(fullModels()).toEqual(new Set(expected)), SLOW)
    }
    // The counter draws every drink, from the light models.
    expect(DRINKS.every((drink) => drink.model)).toBe(true)
  }, 20_000)

  it('loads only where a flick down the bar lands, not every drink it passes', async () => {
    await renderLive(0.5)
    expect(fullModels()).toEqual(new Set(['cup', 'fog-line']))
    requests.length = 0
    // One drink after another, each for less than the settling time, as a quick flick passes them.
    for (let progress = 1.5; progress <= 8.5; progress += 1) {
      act(() => barProgress.set(progress))
      await settle(SETTLE_MS / 3)
    }
    // Nothing it passed was asked for.
    expect(fullModels()).toEqual(new Set())
    await settle(SETTLE_MS + 150)
    expect(fullModels()).toEqual(new Set(['wet-cobble', 'three-oclock']))
  }, 20_000)

  it('turns the drink on screen with its "Turn right" button, in the scene’s frame loop', async () => {
    const { container } = await renderLive(1.5)
    const holder = model('fog-line')!.parent!
    settleTurn()
    const pose = { y: 0, angle: 0, visible: false }
    expect(holder.rotation.y).toBeCloseTo(drinkPose(1.5, 1, 0, pose).angle, 3)
    expect(holder.visible).toBe(true)

    // Only the drawn drink is live: its section, not its neighbours' beyond the scene.
    expect(container.querySelector('#drink-fog-line')).toHaveAttribute('data-live')
    expect(container.querySelector('#drink-umbra')).not.toHaveAttribute('data-live')

    fireEvent.click(within(container.querySelector<HTMLElement>('#drink-fog-line')!).getByRole('button', { name: 'Turn right' }))
    settleTurn()
    expect(holder.rotation.y).toBeCloseTo(drinkPose(1.5, 1, TURN_STEP, pose).angle, 3)
  }, 20_000)

  it('stands each drink on the counter under its place, starting on the first drink', async () => {
    // Left over from a counter before this one: a new counter starts on the first drink again.
    updateCounterView({ active: 5 })
    await renderLive(0.5)
    act(() => {
      updateCounterView({ first: 100, pitch: 150, scroll: 30, width: 800 })
      runFrame()
    })
    const { height } = rootState.size
    DRINKS.forEach((drink, index) => {
      const place = model(drink.model!, 'lite')!.parent!.parent!
      expect(place.position.x).toBeCloseTo(100 + index * 150 - 30 - 400)
      expect(place.position.y).toBeCloseTo(-height / 2 + 0.3 * height)
      expect(place.scale.x).toBeCloseTo(Math.min(150 * 0.74, height * 0.6))
    })
    expect(counterView.active).toBe(0)
  }, 20_000)

  it('under reduced motion shows every drink as its still, draws nothing and scrubs nothing', async () => {
    setMatchMedia(REDUCED, true)
    const { container } = renderMenu()
    intent(container)
    await settle()
    expect(container.querySelector('[data-scene-host]')).toBeNull()
    for (const drink of DRINKS) expect(container.querySelector(`#drink-${drink.id} img`)).not.toBeNull()
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    await settle(50)
    expect(barProgress.get()).toBe(-1)
    expect(requests).toHaveLength(0)
  })

  it('without WebGL shows every drink as its still and draws nothing', async () => {
    setWebGL(false)
    const { container } = renderMenu()
    intent(container)
    await settle(900)
    expect(container.querySelector('canvas')).toBeNull()
    for (const drink of DRINKS) expect(container.querySelector(`#drink-${drink.id} img`)).not.toBeNull()
    expect(requests).toHaveLength(0)
  })
})
