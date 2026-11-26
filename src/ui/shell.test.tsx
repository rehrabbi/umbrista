import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'
import { Nav } from './Nav'
import { SkipLink } from './SkipLink'

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
      <Routes>
        <Route path="*" element={<p>page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Nav', () => {
  it('has the logo as the home link and the page links and call to action', () => {
    renderNav()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Umbrista, home' })).toHaveAttribute('href', '/')
    for (const [name, href] of [
      ['Menu', '/menu'],
      ['Brew', '/brew'],
      ['Story', '/story'],
      ['Visit', '/visit'],
      ['Journal', '/journal'],
      ['Reserve a table', '/reserve'],
    ]) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('marks the current page', () => {
    renderNav('/visit')
    expect(screen.getByRole('link', { name: 'Visit' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Menu' })).not.toHaveAttribute('aria-current')
  })

  it('keeps the section marked on a page inside it', () => {
    renderNav('/journal/first-night')
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('aria-current', 'page')
  })

  it('has a menu button that discloses the links, with the state and the target exposed', async () => {
    renderNav()
    const button = screen.getByRole('button', { name: 'Menu' })
    const list = document.getElementById(button.getAttribute('aria-controls') ?? '')
    expect(list).not.toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(list).toHaveClass('is-open')
  })

  it('opens and closes with the keyboard, and closes on Escape', async () => {
    renderNav()
    const button = screen.getByRole('button', { name: 'Menu' })
    await userEvent.tab()
    await userEvent.tab()
    expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes when a link is followed', async () => {
    renderNav()
    const button = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('link', { name: 'Story' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Footer', () => {
  it('carries the honesty note, the legal and staff links, the source and the credit', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Umbrista is a design project, not a real café.')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(within(footer).getByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/staff')
    expect(within(footer).getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://github.com/rehrabbi/umbrista',
    )
    expect(within(footer).getByText('Designed and built by Jireh Rabbi R. Bernardo')).toBeInTheDocument()
  })
})

describe('SkipLink', () => {
  it('points at the main landmark', () => {
    render(<SkipLink />)
    expect(screen.getByRole('link', { name: 'Skip to the content' })).toHaveAttribute('href', '#main')
  })
})
