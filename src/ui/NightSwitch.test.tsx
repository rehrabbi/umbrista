import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { resetOverride } from '../time/night-store'
import { useNight } from '../time/useNight'
import { NightSwitch } from './NightSwitch'

function Probe() {
  const { override } = useNight()
  return <output>{String(override)}</output>
}

afterEach(resetOverride)

describe('NightSwitch', () => {
  it('is a real button labelled "See it at night", not pressed at first', () => {
    render(<NightSwitch />)
    const button = screen.getByRole('button', { name: 'See it at night' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('forces night when pressed and goes back to the clock when pressed again', async () => {
    const { container } = render(
      <>
        <NightSwitch />
        <Probe />
      </>,
    )
    const button = screen.getByRole('button', { name: 'See it at night' })
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('output')).toHaveTextContent('night')

    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('output')).toHaveTextContent('null')
  })

  it('works from the keyboard', async () => {
    render(<NightSwitch />)
    await userEvent.tab()
    const button = screen.getByRole('button', { name: 'See it at night' })
    expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard(' ')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('shares its state with every other switch', async () => {
    render(
      <>
        <NightSwitch />
        <NightSwitch />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', { name: 'See it at night' })
    await userEvent.click(first as HTMLElement)
    expect(second).toHaveAttribute('aria-pressed', 'true')
  })
})
