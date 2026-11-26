import { useEffect } from 'react'

export function App() {
  useEffect(() => {
    document.title = 'Umbrista'
  }, [])

  return (
    <main>
      <h1>Umbrista</h1>
    </main>
  )
}
