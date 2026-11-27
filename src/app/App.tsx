import { CartProvider } from '../cart/CartProvider'
import { useSmoothScroll } from '../scroll/useSmoothScroll'
import { TimeOfDay } from '../time/TimeOfDay'
import { Footer } from '../ui/Footer'
import { Nav } from '../ui/Nav'
import { SkipLink } from '../ui/SkipLink'
import { Toaster } from '../ui/Toast'
import './App.css'
import { AppRoutes } from './routes'
import { RouteFocusProvider, useRouteFocus } from './useRouteFocus'

/** The site shell. It needs a router above it (BrowserRouter in main.tsx, MemoryRouter in tests). */
export function App() {
  const routeFocus = useRouteFocus()
  useSmoothScroll()

  return (
    <RouteFocusProvider value={routeFocus}>
      <CartProvider>
        <TimeOfDay />
        <SkipLink />
        <div className="shell">
          <Nav />
          <main id="main" tabIndex={-1} className="shell-main">
            <AppRoutes />
          </main>
          <Footer />
        </div>
        <Toaster />
      </CartProvider>
    </RouteFocusProvider>
  )
}
