import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the shell: skip link, navigation, a main landmark and the footer', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Skip to the content' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.title).toContain('Umbrista')
  })
})
