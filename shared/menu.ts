/*
 * The menu, as the owner approved it on 2026-11-26: nine drinks and three night snacks. Prices are in
 * hundredths of a crown (shared/money.ts). Pure, with no imports: the server prices orders from it.
 */

export type MenuCategory = 'coffee' | 'night-drinks' | 'small-plates'

export interface MenuItem {
  /** Stable and URL-safe: the cart, the page's anchors and the drink's files are keyed by it. */
  id: string
  name: string
  /** What it is and how it tastes, in the house voice. */
  notes: string
  /** In hundredths of a crown. */
  price: number
  category: MenuCategory
  /**
   * A drink's 3D model, by name: `cup` is the hero cup (public/models/cup.glb), any other name is
   * public/models/drinks/<name>.glb with its light version <name>-lite.glb.
   */
  model?: string
  /** Its photograph, by name in src/media/manifest.ts. Unset for an item with no photograph. */
  still?: string
}

/** The sections of the menu, in order, with their headings. */
export const CATEGORIES: readonly { id: MenuCategory; title: string }[] = [
  { id: 'coffee', title: 'Coffee' },
  { id: 'night-drinks', title: 'Night drinks' },
  { id: 'small-plates', title: 'Night snacks' },
]

export const MENU: readonly MenuItem[] = [
  {
    id: 'last-tram',
    name: 'Last Tram',
    notes: 'A double espresso in the house cup. Short, dark and steady, for the ride home.',
    price: 280,
    category: 'coffee',
    model: 'cup',
    still: 'cup-still',
  },
  {
    id: 'fog-line',
    name: 'Fog Line',
    notes: 'A cortado in a ribbed glass. Espresso and warm milk in equal parts, soft at the edges.',
    price: 340,
    category: 'coffee',
    model: 'fog-line',
    still: 'drink-fog-line',
  },
  {
    id: 'lantern',
    name: 'Lantern',
    notes: 'A flat white in a wide ceramic cup, a rosetta poured on top. Silky, round and slow.',
    price: 420,
    category: 'coffee',
    model: 'lantern',
    still: 'drink-lantern',
  },
  {
    id: 'sodium',
    name: 'Sodium',
    notes: 'A latte with honey and orange zest, in a glass mug. As warm as the lamp it is named for.',
    price: 460,
    category: 'coffee',
    model: 'sodium',
    still: 'drink-sodium',
  },
  {
    id: 'night-ferry',
    name: 'Night Ferry',
    notes: 'Cold brew over a single block of ice, in a tumbler. Long and smooth, and in no hurry.',
    price: 480,
    category: 'coffee',
    model: 'night-ferry',
    still: 'drink-night-ferry',
  },
  {
    id: 'low-tide',
    name: 'Low Tide',
    notes: 'An espresso tonic in a highball. Bitter, bright and cold, with the bubbles still rising.',
    price: 520,
    category: 'coffee',
    model: 'low-tide',
    still: 'drink-low-tide',
  },
  {
    id: 'umbra',
    name: 'Umbra',
    notes: 'A dark mocha in a matte charcoal cup. Deep chocolate and espresso, nearly black.',
    price: 490,
    category: 'coffee',
    model: 'umbra',
    still: 'drink-umbra',
  },
  {
    id: 'wet-cobble',
    name: 'Wet Cobble',
    notes: 'An iced latte in a tall glass, the espresso swirling down through the milk like rain on stone.',
    price: 470,
    category: 'coffee',
    model: 'wet-cobble',
    still: 'drink-wet-cobble',
  },
  {
    id: 'three-oclock',
    name: 'Three O’Clock',
    notes: 'An affogato in a ceramic bowl: espresso poured over vanilla ice cream. The last order before we close.',
    price: 540,
    category: 'coffee',
    model: 'three-oclock',
    still: 'drink-three-oclock',
  },
  {
    id: 'burnt-custard-tart',
    name: 'Burnt custard tart',
    notes: 'Its top burnt dark under the grill. Crisp pastry, and a middle that still trembles.',
    price: 320,
    category: 'small-plates',
    still: 'snack-burnt-custard-tart',
  },
  {
    id: 'olive-oil-orange-cake',
    name: 'Olive oil & orange cake',
    notes: 'A slice of olive oil cake with orange all through it. Moist, and a little bitter at the edges.',
    price: 360,
    category: 'small-plates',
    still: 'snack-olive-oil-orange-cake',
  },
  {
    id: 'dark-chocolate-sea-salt',
    name: 'Dark chocolate with sea salt',
    notes: 'A few squares of dark chocolate under flakes of sea salt. Small, and enough.',
    price: 240,
    category: 'small-plates',
    still: 'snack-dark-chocolate-sea-salt',
  },
]

/** The drinks with a 3D model, in menu order: the bar and the counter. */
export const DRINKS: readonly MenuItem[] = MENU.filter((item) => item.model !== undefined)

/** An item by its id, or undefined. */
export function menuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id)
}
