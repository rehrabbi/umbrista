import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSceneGate } from '../scene/gate'
import { CHAPTERS } from '../scene/journey/chapters'
import { journeyProgress } from '../scene/journey/progress'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
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

vi.mock('../scene/cup/HeroCup', () => ({
  default: ({ still }: { still?: boolean }) => <div data-testid="hero-cup" data-still={String(Boolean(still))} />,
}))

// The choreography's chunk fails to load (a dropped connection, a stale deploy).
vi.mock('./landing/journeyScroll', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

const SLOW = { timeout: 5000 }

useFakeIntersectionObserver()

afterEach(() => {
  journeyProgress.set(0)
  resetSceneGate()
})

describe('Landing, when the scroll choreography cannot load', () => {
  it('shows its chapters as stills, as reduced motion does: the street unpinned with its lamps on, the cup still', async () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() => expect(container.querySelector('section[data-chapter="dusk"]')).toHaveAttribute('data-motion', 'still'), SLOW)
    act(() => {
      window.dispatchEvent(new Event('pointermove'))
      for (const host of container.querySelectorAll('[data-scene-host]')) setIntersecting(host, true)
    })
    expect((await screen.findByTestId('journey', {}, SLOW)).dataset.progress).toBe(String(CHAPTERS.length))
    expect((await screen.findByTestId('hero-cup', {}, SLOW)).dataset.still).toBe('true')
  }, 15_000)
})
