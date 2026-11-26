import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFakeIntersectionObserver } from '../test/intersection'
import { SceneHost } from './SceneHost'

// The canvas module throws when it renders, as R3F does when it cannot create a renderer.
vi.mock('./SceneCanvas', () => ({
  default: () => {
    throw new Error('Could not create a WebGL renderer')
  },
}))

const LABEL = 'Calvessa at dusk, one café window lit'

useFakeIntersectionObserver()

beforeEach(() => {
  // React logs the caught error; keep the test output quiet.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SceneHost when the canvas fails', () => {
  it('keeps the still and the rest of the page instead of unmounting everything', async () => {
    render(
      <main>
        <h1>Still here</h1>
        <SceneHost still="street-dusk" label={LABEL}>
          <group />
        </SceneHost>
      </main>,
    )
    // Give the host time to mount the canvas, fail, and fall back.
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(screen.getByRole('heading', { name: 'Still here' })).toBeInTheDocument()
    expect(screen.getByAltText(LABEL)).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
