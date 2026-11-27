import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { resetOverride } from '../time/night-store'
import { App } from './App'

afterEach(() => {
  resetOverride()
  delete document.documentElement.dataset.time
})

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

  it('shows the opening time under the landing heading', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByText(/café time/)[0]).toBeInTheDocument()
  })

  it('marks the page as night or day, and the switch forces night', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(['night', 'day']).toContain(document.documentElement.dataset.time)
    await userEvent.click(screen.getByRole('button', { name: 'See it at night' }))
    expect(document.documentElement.dataset.time).toBe('night')
  })
})
