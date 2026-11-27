import { beforeEach, describe, expect, it } from 'vitest'
import type { BrewChoice } from '../../shared/brew'
import { CART_KEY, MAX_QTY, cartCount, cartReducer, cartTotal, lineFor, readCart, writeCart, type CartLine } from './cartStore'

const FOG_LINE = { id: 'fog-line', itemId: 'fog-line', name: 'Fog Line', unitPrice: 340 }
const UMBRA = { id: 'umbra', itemId: 'umbra', name: 'Umbra', unitPrice: 490 }

function cartOf(...lines: CartLine[]): CartLine[] {
  return lines
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('cartReducer', () => {
  it('adds a line with a quantity of one', () => {
    expect(cartReducer([], { type: 'add', line: FOG_LINE })).toEqual([{ ...FOG_LINE, qty: 1 }])
  })

  it('adding the same item twice raises its quantity instead of adding a second line', () => {
    const once = cartReducer([], { type: 'add', line: FOG_LINE })
    const twice = cartReducer(once, { type: 'add', line: FOG_LINE })
    expect(twice).toEqual([{ ...FOG_LINE, qty: 2 }])
  })

  it('keeps different items as separate lines, in the order they were added', () => {
    const state = cartReducer(cartReducer([], { type: 'add', line: FOG_LINE }), { type: 'add', line: UMBRA })
    expect(state.map((line) => line.id)).toEqual(['fog-line', 'umbra'])
  })

  it('clamps quantities between 1 and 20', () => {
    const state = cartOf({ ...FOG_LINE, qty: 3 })
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: 0 })[0]!.qty).toBe(1)
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: -4 })[0]!.qty).toBe(1)
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: 25 })[0]!.qty).toBe(MAX_QTY)
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: 7 })[0]!.qty).toBe(7)
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: 2.6 })[0]!.qty).toBe(3)
    expect(MAX_QTY).toBe(20)
  })

  it('never adds past 20 of one item', () => {
    const full = cartOf({ ...FOG_LINE, qty: 20 })
    expect(cartReducer(full, { type: 'add', line: FOG_LINE })[0]!.qty).toBe(20)
    expect(cartReducer([], { type: 'add', line: FOG_LINE, qty: 40 })[0]!.qty).toBe(20)
  })

  it('ignores a quantity that is not a number', () => {
    const state = cartOf({ ...FOG_LINE, qty: 3 })
    expect(cartReducer(state, { type: 'setQty', id: 'fog-line', qty: Number.NaN })).toBe(state)
  })

  it('removes a line, and clears them all', () => {
    const state = cartOf({ ...FOG_LINE, qty: 1 }, { ...UMBRA, qty: 2 })
    expect(cartReducer(state, { type: 'remove', id: 'fog-line' })).toEqual([{ ...UMBRA, qty: 2 }])
    expect(cartReducer(state, { type: 'clear' })).toEqual([])
  })

  it('leaves the cart as it was for a line it does not hold', () => {
    const state = cartOf({ ...FOG_LINE, qty: 1 })
    expect(cartReducer(state, { type: 'remove', id: 'nothing' })).toBe(state)
    expect(cartReducer(state, { type: 'setQty', id: 'nothing', qty: 2 })).toBe(state)
  })

  it('carries a brewed drink with its choices', () => {
    const options: BrewChoice = { beans: 'calvessa-blend', roast: 'dark', method: 'espresso', milk: 'none', name: 'Small hours' }
    const state = cartReducer([], { type: 'add', line: { id: 'custom-1', itemId: 'custom', name: 'Small hours', options, unitPrice: 450 } })
    expect(state[0]).toMatchObject({ itemId: 'custom', options, qty: 1 })
  })
})

describe('totals', () => {
  it('counts the items and adds up the price in hundredths', () => {
    const state = cartOf({ ...FOG_LINE, qty: 2 }, { ...UMBRA, qty: 1 })
    expect(cartCount(state)).toBe(3)
    expect(cartTotal(state)).toBe(1170)
  })
})

describe('lineFor', () => {
  it('makes a menu item into a cart line keyed by the item', () => {
    expect(lineFor({ id: 'umbra', name: 'Umbra', price: 490 })).toEqual(UMBRA)
  })
})

describe('session storage', () => {
  it('keeps the cart under umbrista.cart and reads it back', () => {
    const state = cartOf({ ...FOG_LINE, qty: 2 })
    writeCart(state)
    expect(CART_KEY).toBe('umbrista.cart')
    expect(JSON.parse(sessionStorage.getItem('umbrista.cart')!)).toEqual(state)
    expect(readCart()).toEqual(state)
  })

  it('starts empty when nothing is stored', () => {
    expect(readCart()).toEqual([])
  })

  it('starts an empty cart, without throwing, when the stored value is corrupt', () => {
    for (const corrupt of ['{not json', 'null', '42', '"fog-line"', '{"id":"fog-line"}']) {
      sessionStorage.setItem(CART_KEY, corrupt)
      expect(() => readCart()).not.toThrow()
      expect(readCart()).toEqual([])
    }
  })

  it('drops stored lines that are not well formed, and clamps stored quantities', () => {
    sessionStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { ...FOG_LINE, qty: 99 },
        { id: 'umbra', name: 'Umbra', unitPrice: 'free', qty: 1 },
        { ...UMBRA, qty: 1, unitPrice: -5 },
        null,
      ]),
    )
    expect(readCart()).toEqual([{ ...FOG_LINE, qty: 20 }])
  })

  it('starts empty, without throwing, when session storage is refused', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    try {
      expect(readCart()).toEqual([])
      expect(() => writeCart([{ ...FOG_LINE, qty: 1 }])).not.toThrow()
    } finally {
      Object.defineProperty(window, 'sessionStorage', original)
    }
  })
})
