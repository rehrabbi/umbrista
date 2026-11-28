import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BEANS, METHODS, MILKS, ROASTS, brewPrice, type BrewChoice } from '../../shared/brew'
import { formatPrice, formatTotal } from '../../shared/money'
import { CartProvider } from '../cart/CartProvider'
import { CART_KEY, type CartLine } from '../cart/cartStore'
import { resetSceneGate } from '../scene/gate'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { setWebGL } from '../test/setup'
import { clearToasts, getToasts } from '../ui/toast-store'
import Brew from './Brew'

// R3F's Canvas cannot run in jsdom: this stand-in draws a plain canvas and passes its children through.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f">
      <canvas />
      {children}
    </div>
  ),
}))

// The cup draws with WebGL; here it shows the drink it was given.
vi.mock('../scene/cup/BrewCup', () => ({
  default: ({ choice }: { choice: BrewChoice }) => <div data-testid="brew-cup" data-choice={JSON.stringify(choice)} />,
}))

// The canvas mounts after intent, an idle delay, a frame probe and a lazy import; allow for a busy machine.
const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
  sessionStorage.clear()
  clearToasts()
})

afterEach(() => {
  resetSceneGate()
})

function renderBrew() {
  return render(
    <MemoryRouter initialEntries={['/brew']}>
      <CartProvider>
        <Brew />
      </CartProvider>
    </MemoryRouter>,
  )
}

/** The visitor moves the pointer, and the cup is near the screen: the 3D may start. */
function intent(container: HTMLElement) {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
    for (const host of container.querySelectorAll('[data-scene-host]')) setIntersecting(host, true)
  })
}

async function settle(ms = 400) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

function choose(group: string, option: string) {
  const fieldset = screen.getByRole('group', { name: group })
  fireEvent.click(within(fieldset).getByRole('radio', { name: option }))
}

function liveRegions(container: HTMLElement) {
  return [...container.querySelectorAll('[aria-live]')]
}

/** Lets a mutation observer's callback run: it is called once for everything one task changed. */
const delivered = () => new Promise((resolve) => setTimeout(resolve, 0))

function storedCart(): CartLine[] {
  return JSON.parse(sessionStorage.getItem(CART_KEY) ?? '[]') as CartLine[]
}

describe('Brew your own', () => {
  it('has one h1', () => {
    renderBrew()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Brew your own')
  })

  it('is a normal form: a fieldset with a legend and a radio group for each choice', () => {
    renderBrew()
    const form = screen.getByRole('form', { name: 'Brew your own drink' })
    const groups: [string, readonly { label: string }[]][] = [
      ['Beans', BEANS],
      ['Roast', ROASTS],
      ['Method', METHODS],
      ['Milk', MILKS],
    ]
    for (const [name, options] of groups) {
      const fieldset = within(form).getByRole('group', { name })
      expect(fieldset.tagName).toBe('FIELDSET')
      expect(fieldset.querySelector('legend')).toHaveTextContent(name)
      const radios = within(fieldset).getAllByRole('radio')
      expect(radios.map((radio) => radio.getAttribute('name'))).toEqual(options.map(() => radios[0]!.getAttribute('name')))
      expect(radios).toHaveLength(options.length)
      for (const option of options) expect(within(fieldset).getByRole('radio', { name: option.label })).toBeInTheDocument()
      // One choice is always made.
      expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1)
    }
  })

  it('describes each option in words, tied to its radio, with what it adds to the price', () => {
    renderBrew()
    const sidamo = BEANS.find((bean) => bean.id === 'sidamo')!
    expect(screen.getByRole('radio', { name: 'Sidamo' })).toHaveAccessibleDescription(`${sidamo.note} +0.60`)
    const harbour = BEANS.find((bean) => bean.id === 'harbour')!
    expect(screen.getByRole('radio', { name: 'Harbour' })).toHaveAccessibleDescription(harbour.note)
  })

  it('shows each option’s surcharge as text, and nothing for the cheapest option of a choice', () => {
    renderBrew()
    const groups: [string, readonly { label: string; price: number }[]][] = [
      ['Beans', BEANS],
      ['Roast', ROASTS],
      ['Method', METHODS],
      ['Milk', MILKS],
    ]
    for (const [name, options] of groups) {
      const fieldset = screen.getByRole('group', { name })
      const base = Math.min(...options.map((option) => option.price))
      for (const option of options) {
        const row = within(fieldset).getByRole('radio', { name: option.label }).closest('.brew-option') as HTMLElement
        const surcharge = option.price - base
        if (surcharge > 0) expect(row).toHaveTextContent(`+${formatPrice(surcharge)}`)
        else expect(row.textContent).not.toMatch(/\+\d/)
      }
    }
    expect(within(screen.getByRole('group', { name: 'Method' })).getByText('+0.40')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Milk' })).getByText('+1.00')).toBeInTheDocument()
  })

  it('starts from the house espresso, priced as text', () => {
    const { container } = renderBrew()
    expect(screen.getByRole('radio', { name: 'Harbour' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Espresso' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'No milk' })).toBeChecked()
    const [live] = liveRegions(container)
    expect(live).toHaveTextContent('Harbour espresso')
    // The total is a line of its own, beside "Add to order", and inside the live region.
    const price = within(live as HTMLElement).getByText(formatTotal(280))
    expect(price.tagName).toBe('P')
    expect(price.textContent).toBe('2.80 crowns')
  })

  it('offers an optional name of up to 60 characters', () => {
    renderBrew()
    const name = screen.getByRole('textbox', { name: /name/i })
    expect(name).not.toBeRequired()
    expect(name).toHaveAttribute('maxLength', '60')
  })

  it('describes the cup and its price in one polite, atomic live region, changed once per change of choice', async () => {
    const { container } = renderBrew()
    const regions = liveRegions(container)
    expect(regions).toHaveLength(1)
    const live = regions[0]!
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')

    // A mutation observer is called once for everything changed in one task: one batch is one
    // update of the region, which a screen reader says once (atomic: the whole region).
    const batches: string[] = []
    const observer = new MutationObserver(() => batches.push(live.textContent ?? ''))
    observer.observe(live, { subtree: true, childList: true, characterData: true })
    const before = live.textContent

    choose('Roast', 'Dark')
    await delivered()
    expect(batches).toHaveLength(1)
    expect(batches[0]).not.toBe(before)
    expect(live).toHaveTextContent('dark roast')

    choose('Milk', 'Oat milk')
    await delivered()
    expect(batches).toHaveLength(2)
    expect(live).toHaveTextContent('oat milk')
    expect(live).toHaveTextContent(formatTotal(brewPrice({ beans: 'harbour', roast: 'dark', method: 'espresso', milk: 'oat' })))

    // The same choice again, or a name, changes nothing in the cup: nothing is said.
    choose('Milk', 'Oat milk')
    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'The long way home' } })
    await delivered()
    expect(batches).toHaveLength(2)
    observer.disconnect()
  })

  it('sets the cup straight on the page: no backdrop, and its edges masked away softly', () => {
    const css = readFileSync('src/pages/Brew.css', 'utf8')
    const rule = (selector: string) => {
      const start = css.indexOf(`\n${selector} {`)
      expect(start).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf('}', start))
    }
    expect(rule('.brew-scene.scene-host')).toMatch(/background:\s*transparent/)
    const scene = rule('.brew-scene')
    expect(scene).toMatch(/(?<!-webkit-)mask-image:\s*radial-gradient\([^;]*transparent 100%\);/)
    expect(scene).toMatch(/-webkit-mask-image:\s*radial-gradient\([^;]*transparent 100%\);/)
  })

  it('works without the 3D: the choices, the description and the order', async () => {
    setWebGL(false)
    const { container } = renderBrew()
    intent(container)
    await settle()
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByTestId('brew-cup')).toBeNull()

    choose('Method', 'Long black')
    expect(liveRegions(container)[0]).toHaveTextContent('Harbour long black')
    fireEvent.click(screen.getByRole('button', { name: /add to order/i }))
    expect(storedCart()).toHaveLength(1)
  })

  it('drives the 3D cup with the visitor’s choices, once they show intent', async () => {
    const { container } = renderBrew()
    await settle()
    expect(container.querySelector('canvas')).toBeNull()
    intent(container)
    const cup = await screen.findByTestId('brew-cup', {}, SLOW)
    expect(JSON.parse(cup.dataset.choice!)).toMatchObject({ beans: 'harbour', roast: 'medium', method: 'espresso', milk: 'none' })
    choose('Beans', 'Decaf')
    choose('Milk', 'Whole milk')
    await waitFor(() => expect(JSON.parse(screen.getByTestId('brew-cup').dataset.choice!)).toMatchObject({ beans: 'decaf', milk: 'whole' }))
  }, 15_000)

  it('adds a custom line with the choice to the order, and says so', () => {
    renderBrew()
    choose('Beans', 'Sidamo')
    choose('Roast', 'Light')
    choose('Method', 'Lungo')
    choose('Milk', 'A spot of foam')
    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: '  The long way home ' } })
    fireEvent.click(screen.getByRole('button', { name: /add to order/i }))

    const choice = { beans: 'sidamo', roast: 'light', method: 'lungo', milk: 'spot' } as const
    const [line] = storedCart()
    expect(line).toMatchObject({
      itemId: 'custom',
      name: 'The long way home',
      options: { ...choice, name: 'The long way home' },
      unitPrice: brewPrice(choice),
      qty: 1,
    })
    expect(getToasts().map((toast) => toast.message)).toContain('The long way home is in your order.')
    expect(screen.getByRole('link', { name: /see your order/i })).toHaveAttribute('href', '/order')
  })

  it('names an unnamed drink from its choices, and counts the same drink twice as two', () => {
    renderBrew()
    choose('Milk', 'Whole milk')
    const add = screen.getByRole('button', { name: /add to order/i })
    fireEvent.click(add)
    fireEvent.click(add)
    const lines = storedCart()
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ itemId: 'custom', name: 'Harbour espresso with whole milk', qty: 2 })
    expect(lines[0]!.options).not.toHaveProperty('name')

    // Another drink is another line.
    choose('Roast', 'Dark')
    fireEvent.click(add)
    expect(storedCart()).toHaveLength(2)
  })
})
