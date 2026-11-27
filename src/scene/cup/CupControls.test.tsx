import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CupControls, CupDragSurface, DRAG_INTENT_PX } from './CupControls'

describe('CupControls', () => {
  it('has a button for each move, each sending its input', async () => {
    const onInput = vi.fn()
    render(<CupControls onInput={onInput} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tilt left' }))
    expect(onInput).toHaveBeenLastCalledWith({ tilt: [-1, 0] })
    await user.click(screen.getByRole('button', { name: 'Tilt right' }))
    expect(onInput).toHaveBeenLastCalledWith({ tilt: [1, 0] })
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(onInput).toHaveBeenLastCalledWith({ spin: 1 })
    await user.click(screen.getByRole('button', { name: 'Splash' }))
    expect(onInput).toHaveBeenLastCalledWith({ splash: 1 })
    expect(onInput).toHaveBeenCalledTimes(4)
  })

  it('answers the arrow keys while focus is on the controls, and keeps them from scrolling the page', async () => {
    const onInput = vi.fn()
    render(<CupControls onInput={onInput} />)
    const user = userEvent.setup()
    screen.getByRole('button', { name: 'Spin' }).focus()

    await user.keyboard('{ArrowLeft}')
    expect(onInput).toHaveBeenLastCalledWith({ tilt: [-1, 0] })
    await user.keyboard('{ArrowRight}')
    expect(onInput).toHaveBeenLastCalledWith({ tilt: [1, 0] })
    await user.keyboard('{ArrowUp}')
    expect(onInput).toHaveBeenLastCalledWith({ spin: 1 })
    await user.keyboard('{ArrowDown}')
    expect(onInput).toHaveBeenLastCalledWith({ splash: 1 })

    const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    screen.getByRole('button', { name: 'Spin' }).dispatchEvent(arrow)
    expect(arrow.defaultPrevented).toBe(true)
  })

  it('leaves other keys alone', async () => {
    const onInput = vi.fn()
    render(<CupControls onInput={onInput} />)
    screen.getByRole('button', { name: 'Spin' }).focus()
    const tab = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true })
    screen.getByRole('button', { name: 'Spin' }).dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
    expect(onInput).not.toHaveBeenCalled()
  })

  it('names the group, so a screen reader hears what the buttons are for', () => {
    render(<CupControls onInput={() => {}} />)
    expect(screen.getByRole('group', { name: 'Play with the cup' })).toBeInTheDocument()
  })
})

describe('CupDragSurface', () => {
  function setup() {
    const onInput = vi.fn()
    render(<CupDragSurface onInput={onInput} />)
    const surface = screen.getByTestId('cup-drag')
    const capture = vi.fn()
    const release = vi.fn()
    surface.setPointerCapture = capture
    surface.releasePointerCapture = release
    surface.hasPointerCapture = () => capture.mock.calls.length > release.mock.calls.length
    return { onInput, surface, capture }
  }

  const touch = { pointerId: 7, pointerType: 'touch', isPrimary: true }

  it('lets the page scroll vertically through it', () => {
    const { surface } = setup()
    expect(surface.style.touchAction).toBe('pan-y')
  })

  it('never captures a vertical swipe, so the page scrolls', () => {
    const { onInput, surface, capture } = setup()
    fireEvent.pointerDown(surface, { ...touch, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(surface, { ...touch, clientX: 102, clientY: 80 })
    fireEvent.pointerMove(surface, { ...touch, clientX: 104, clientY: 40 })
    // Once the swipe has read as a scroll, a sideways wobble later does not take it over.
    fireEvent.pointerMove(surface, { ...touch, clientX: 130, clientY: 30 })
    fireEvent.pointerUp(surface, { ...touch, clientX: 130, clientY: 30 })
    expect(capture).not.toHaveBeenCalled()
    expect(onInput).not.toHaveBeenCalled()
  })

  it(`captures the pointer only after ${DRAG_INTENT_PX} px of sideways intent, then turns the cup`, () => {
    expect(DRAG_INTENT_PX).toBe(6)
    const { onInput, surface, capture } = setup()
    fireEvent.pointerDown(surface, { ...touch, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(surface, { ...touch, clientX: 104, clientY: 101 })
    expect(capture).not.toHaveBeenCalled()
    expect(onInput).not.toHaveBeenCalled()

    fireEvent.pointerMove(surface, { ...touch, clientX: 108, clientY: 101 })
    expect(capture).toHaveBeenCalledWith(7)
    fireEvent.pointerMove(surface, { ...touch, clientX: 140, clientY: 102 })
    const turns = onInput.mock.calls.map(([input]) => (input as { turn?: number }).turn).filter((turn) => turn !== undefined)
    expect(turns.length).toBeGreaterThan(0)
    expect(turns.every((turn) => turn! > 0)).toBe(true)
  })

  it('works the same with a mouse', () => {
    const { onInput, surface, capture } = setup()
    const mouse = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 }
    fireEvent.pointerDown(surface, { ...mouse, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(surface, { ...mouse, clientX: 180, clientY: 100 })
    expect(capture).toHaveBeenCalledWith(1)
    const turns = onInput.mock.calls.map(([input]) => (input as { turn?: number }).turn).filter((turn) => turn !== undefined)
    expect(turns.every((turn) => turn! < 0)).toBe(true)
  })
})
