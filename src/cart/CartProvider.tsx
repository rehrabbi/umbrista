import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { cartReducer, readCart, writeCart, type CartAction, type CartLine } from './cartStore'

export interface CartContextValue {
  lines: readonly CartLine[]
  dispatch: Dispatch<CartAction>
}

const CartContext = createContext<CartContextValue | null>(null)

/**
 * Holds the order-ahead cart for every page (it sits in the shell, above the routes), starting from
 * what this visit saved in sessionStorage and saving every change back.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, readCart)

  useEffect(() => {
    writeCart(lines)
  }, [lines])

  const value = useMemo(() => ({ lines, dispatch }), [lines])
  return <CartContext value={value}>{children}</CartContext>
}

/** The cart and its dispatch. Needs a CartProvider above it. */
export function useCart(): CartContextValue {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart needs a CartProvider above it')
  return cart
}
