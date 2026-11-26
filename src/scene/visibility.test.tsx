import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { changeMatchMedia, setMatchMedia } from '../test/setup'
import { useSceneActive } from './visibility'

const REDUCED = '(prefers-reduced-motion: reduce)'

function Probe() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useSceneActive(ref)
  return (
    <div ref={ref} data-testid="probe">
      {active ? 'active' : 'inactive'}
    </div>
  )
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

useFakeIntersectionObserver()

describe('useSceneActive', () => {
  it('is inactive until the element is on screen, then active', () => {
    const { getByTestId } = render(<Probe />)
    expect(getByTestId('probe')).toHaveTextContent('inactive')
    act(() => setIntersecting(getByTestId('probe'), true))
    expect(getByTestId('probe')).toHaveTextContent('active')
    act(() => setIntersecting(getByTestId('probe'), false))
    expect(getByTestId('probe')).toHaveTextContent('inactive')
  })

  it('is inactive while the tab is hidden', () => {
    const { getByTestId } = render(<Probe />)
    act(() => setIntersecting(getByTestId('probe'), true))
    act(() => setHidden(true))
    expect(getByTestId('probe')).toHaveTextContent('inactive')
    act(() => setHidden(false))
    expect(getByTestId('probe')).toHaveTextContent('active')
  })

  it('is always inactive under reduced motion, and reacts when the preference changes', () => {
    setMatchMedia(REDUCED, true)
    const { getByTestId } = render(<Probe />)
    act(() => setIntersecting(getByTestId('probe'), true))
    expect(getByTestId('probe')).toHaveTextContent('inactive')
    act(() => changeMatchMedia(REDUCED, false))
    expect(getByTestId('probe')).toHaveTextContent('active')
  })
})
