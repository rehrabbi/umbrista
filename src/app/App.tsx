import { useEffect } from 'react'
import { Logo } from '../brand/Logo'

export function App() {
  useEffect(() => {
    document.title = 'Umbrista'
  }, [])

  return (
    <main>
      <h1>
        <Logo variant="lockup" />
      </h1>
    </main>
  )
}
