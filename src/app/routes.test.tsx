import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const ROUTES: ReadonlyArray<readonly [path: string, h1: string, title: string]> = [
  ['/', 'We open when the light goes.', 'Umbrista · A coffee bar that opens at dusk'],
  ['/menu', 'Menu', 'Menu · Umbrista'],
  ['/brew', 'Brew your own', 'Brew your own · Umbrista'],
  ['/story', 'Story', 'Story · Umbrista'],
  ['/visit', 'Visit', 'Visit · Umbrista'],
  ['/journal', 'Journal', 'Journal · Umbrista'],
  ['/journal/first-night', 'Journal', 'Journal · Umbrista'],
  ['/reserve', 'Reserve a table', 'Reserve a table · Umbrista'],
  ['/order', 'Order ahead', 'Order ahead · Umbrista'],
  ['/join', 'Join the list', 'Join the list · Umbrista'],
  ['/privacy', 'Privacy', 'Privacy · Umbrista'],
  ['/staff', 'Staff', 'Staff · Umbrista'],
]

describe('routes', () => {
  it.each(ROUTES)('%s has exactly one h1, the honesty note and the right title', async (path, h1, title) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: h1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Umbrista is a design project, not a real café.')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(title))
  })

  it('shows the not-found page, with a link home, for an unknown path', async () => {
    renderAt('/nowhere/at/all')
    expect(await screen.findByRole('heading', { level: 1, name: 'Nothing down here but the dark.' })).toBeInTheDocument()
    expect(screen.getByText('Wrong turn after midnight. It happens. The lamps are back this way.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the bar' })).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Umbrista is a design project, not a real café.')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Not found · Umbrista'))
  })

  it('has a main landmark that is the skip link target', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1 })
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('tabindex', '-1')
  })
})

describe('route focus', () => {
  it('does not move focus on the first render', async () => {
    renderAt('/menu')
    await screen.findByRole('heading', { level: 1, name: 'Menu' })
    expect(document.body).toHaveFocus()
  })

  it('moves focus to the new page heading after following a nav link', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: 'We open when the light goes.' })
    expect(document.body).toHaveFocus()

    await userEvent.click(screen.getByRole('link', { name: 'Story' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Story' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(document.title).toBe('Story · Umbrista')
  })

  it('also moves focus from a lazy page back to the landing page', async () => {
    renderAt('/story')
    await screen.findByRole('heading', { level: 1, name: 'Story' })
    await userEvent.click(screen.getByRole('link', { name: 'Umbrista, home' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'We open when the light goes.' })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})
