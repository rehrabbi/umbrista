import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { journeyProgress } from '../scene/journey/progress'
import { useFakeIntersectionObserver } from '../test/intersection'
import { Landing } from './Landing'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f">
      <canvas />
      {children}
    </div>
  ),
}))

vi.mock('../scene/journey/Journey', () => ({
  Journey: ({ progress }: { progress: number }) => <div data-testid="journey" data-progress={progress} />,
}))

// The choreography's chunk fails to load (a dropped connection, a stale deploy).
vi.mock('./landing/openingScroll', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

afterEach(() => {
  journeyProgress.set(0)
})

describe('Landing, when the scroll choreography cannot load', () => {
  it('finishes the chapter as reduced motion does: the title whole, the lamps on, the photograph undimmed', async () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() => expect(container.querySelector('[data-kinetic]')).toHaveAttribute('data-state', 'shown'), SLOW)
    expect((await screen.findByTestId('journey', {}, SLOW)).dataset.progress).toBe('1')
    expect(container.querySelector<HTMLElement>('.landing-scene')!.style.getPropertyValue('--lamp')).toBe('1')
  })
})
