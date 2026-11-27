import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KineticTitle } from './KineticTitle'

describe('KineticTitle', () => {
  it('exposes the whole phrase as its accessible name', () => {
    render(
      <h2>
        <KineticTitle text="Open after dark" />
      </h2>,
    )
    expect(screen.getByRole('heading', { name: 'Open after dark' })).toBeInTheDocument()
  })

  it('splits the letters for animation and hides them from assistive technology', () => {
    const { container } = render(<KineticTitle text="Open after dark" />)
    const letters = [...container.querySelectorAll('[data-letter]')]
    expect(letters.map((letter) => letter.textContent).join('')).toBe('Openafterdark')
    for (const letter of letters) expect(letter.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('keeps each word together, so a line never breaks inside one', () => {
    const { container } = render(<KineticTitle text="We open when the light goes." />)
    const words = [...container.querySelectorAll('[data-word]')].map((word) => word.textContent)
    expect(words).toEqual(['We', 'open', 'when', 'the', 'light', 'goes.'])
  })

  it('shows the letters at rest unless it is told to wait for its cue', () => {
    const { container, rerender } = render(<KineticTitle text="Dusk" />)
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'shown')
    rerender(<KineticTitle text="Dusk" waiting />)
    expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'waiting')
  })
})
