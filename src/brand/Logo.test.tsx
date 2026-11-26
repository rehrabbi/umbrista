import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it.each(['mark', 'wordmark', 'lockup'] as const)('the %s is an image named Umbrista by default', (variant) => {
    render(<Logo variant={variant} />)
    const image = screen.getByRole('img', { name: 'Umbrista' })
    expect(image.tagName.toLowerCase()).toBe('svg')
  })

  it('takes a custom accessible name from title', () => {
    render(<Logo variant="mark" title="Umbrista, home" />)
    expect(screen.getByRole('img', { name: 'Umbrista, home' })).toBeInTheDocument()
  })

  it('the mark inside a labelled link is decorative: hidden, with no title', () => {
    const { container } = render(
      <a href="/" aria-label="Umbrista, home">
        <Logo variant="mark" decorative />
      </a>,
    )
    expect(screen.getByRole('link', { name: 'Umbrista, home' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('title')).toBeNull()
  })

  it('draws the wordmark as outlined paths, not text', () => {
    const { container } = render(<Logo variant="wordmark" />)
    expect(container.querySelector('text')).toBeNull()
    expect((container.querySelector('path')?.getAttribute('d') ?? '').length).toBeGreaterThan(200)
  })

  it('the lockup holds both the mark and the wordmark', () => {
    const { container } = render(<Logo variant="lockup" />)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(4)
    expect(container.querySelector('ellipse')).not.toBeNull()
  })
})
