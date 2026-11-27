import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DRINKS, MENU } from '../../shared/menu'
import { formatPrice } from '../../shared/money'
import { CartProvider } from '../cart/CartProvider'
import { barProgress, resetDrinkTurns, setBarLive } from '../menu/barProgress'
import { resetSceneGate } from '../scene/gate'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { clearToasts } from '../ui/toast-store'
import Menu from './Menu'

vi.mock('@react-three/fiber', async () => (await import('../test/r3f')).fiberStandIn)

// Counts every model the scenes ask for, by name and detail.
const requests = vi.hoisted(() => [] as [string, string][])
vi.mock('../menu/useDrinkModel', async () => {
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
// The canvases mount after intent, an idle delay, a frame probe and two lazy imports.
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
  resetDrinkTurns()
  requests.length = 0
  sessionStorage.clear()
  clearToasts()
})

afterEach(() => {
  setBarLive(false)
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

  it('shows the night snacks as finished cards, with no photograph', () => {
    renderMenu()
    const snacks = screen.getByRole('region', { name: 'Night snacks' })
    expect(within(snacks).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Burnt custard tart',
      'Olive oil & orange cake',
      'Dark chocolate with sea salt',
    ])
    expect(snacks.querySelector('img')).toBeNull()
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
