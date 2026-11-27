import type { BrewChoice } from '../../shared/brew'

/*
 * The order-ahead cart: a list of lines, changed only through `cartReducer`, kept for the visit in
 * sessionStorage under CART_KEY (named on the Privacy page). It holds no personal data. Prices here
 * are for display; the server prices every order again from the menu.
 */

export interface CartLine {
  /** One line per menu item (its id); a brewed drink gets a line of its own. */
  id: string
  itemId: string | 'custom'
  name: string
  options?: BrewChoice
  /** In hundredths of a crown. */
  unitPrice: number
  qty: number
}

export type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'qty'>; qty?: number }
  | { type: 'remove'; id: string }
  | { type: 'setQty'; id: string; qty: number }
  | { type: 'clear' }

export const CART_KEY = 'umbrista.cart'
export const MIN_QTY = 1
export const MAX_QTY = 20

/** A quantity within 1 to 20, rounded to a whole number. */
function clampQty(qty: number): number {
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(qty)))
}

export function cartReducer(state: readonly CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const adding = Number.isFinite(action.qty) ? action.qty! : 1
      const existing = state.find((line) => line.id === action.line.id)
      if (!existing) return [...state, { ...action.line, qty: clampQty(adding) }]
      return state.map((line) => (line === existing ? { ...line, qty: clampQty(line.qty + adding) } : line))
    }
    case 'remove': {
      if (!state.some((line) => line.id === action.id)) return state as CartLine[]
      return state.filter((line) => line.id !== action.id)
    }
    case 'setQty': {
      if (!Number.isFinite(action.qty) || !state.some((line) => line.id === action.id)) return state as CartLine[]
      return state.map((line) => (line.id === action.id ? { ...line, qty: clampQty(action.qty) } : line))
    }
    case 'clear':
      return []
  }
}

/** How many things are in the cart. */
export function cartCount(state: readonly CartLine[]): number {
  return state.reduce((sum, line) => sum + line.qty, 0)
}

/** The cart's total, in hundredths of a crown. */
export function cartTotal(state: readonly CartLine[]): number {
  return state.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
}

/** The cart line for a menu item. */
export function lineFor(item: { id: string; name: string; price: number }): Omit<CartLine, 'qty'> {
  return { id: item.id, itemId: item.id, name: item.name, unitPrice: item.price }
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200

/** The longest name a visitor may give a brewed drink. */
export const MAX_BREW_NAME = 60

function isBrewChoice(value: unknown): value is BrewChoice {
  if (typeof value !== 'object' || value === null) return false
  const choice = value as Record<string, unknown>
  return (
    isText(choice.beans) &&
    (choice.roast === 'light' || choice.roast === 'medium' || choice.roast === 'dark') &&
    isText(choice.method) &&
    isText(choice.milk) &&
    (choice.name === undefined || (typeof choice.name === 'string' && choice.name.length <= MAX_BREW_NAME))
  )
}

/** A stored line, checked field by field (anything could be in storage), or null. */
function parseLine(value: unknown): CartLine | null {
  if (typeof value !== 'object' || value === null) return null
  const line = value as Record<string, unknown>
  if (!isText(line.id) || !isText(line.itemId) || !isText(line.name)) return null
  if (!Number.isSafeInteger(line.unitPrice) || (line.unitPrice as number) < 0) return null
  if (typeof line.qty !== 'number' || !Number.isFinite(line.qty)) return null
  if (line.options !== undefined && !isBrewChoice(line.options)) return null
  const parsed: CartLine = { id: line.id, itemId: line.itemId, name: line.name, unitPrice: line.unitPrice as number, qty: clampQty(line.qty) }
  if (line.options !== undefined) parsed.options = line.options as BrewChoice
  return parsed
}

/** The cart saved earlier in this visit. Empty when there is none, or it cannot be read. */
export function readCart(): CartLine[] {
  try {
    const stored = window.sessionStorage.getItem(CART_KEY)
    if (stored === null) return []
    const value: unknown = JSON.parse(stored)
    if (!Array.isArray(value)) return []
    // Lines are one per id: two stored under the same id become one, their quantities added.
    const lines: CartLine[] = []
    for (const line of value.map(parseLine)) {
      if (!line) continue
      const same = lines.findIndex((known) => known.id === line.id)
      if (same === -1) lines.push(line)
      else lines[same] = { ...lines[same]!, qty: clampQty(lines[same]!.qty + line.qty) }
    }
    return lines
  } catch {
    // Corrupt JSON, or storage refused (a private window, or storage switched off).
    return []
  }
}

/** Save the cart for the rest of the visit. Without storage the cart lasts only for the page. */
export function writeCart(state: readonly CartLine[]): void {
  try {
    if (state.length === 0) window.sessionStorage.removeItem(CART_KEY)
    else window.sessionStorage.setItem(CART_KEY, JSON.stringify(state))
  } catch {
    // Storage full or refused: the cart still works for this page.
  }
}
