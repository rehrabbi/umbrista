/*
 * Brew-your-own: the visitor's choice of beans, roast, method and milk, and the name they give the
 * drink. Pure, with no imports: the cart carries it to the order, and the server prices it.
 */

export interface BrewChoice {
  beans: string
  roast: 'light' | 'medium' | 'dark'
  method: string
  milk: string
  name?: string
}
