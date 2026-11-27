import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DRINKS } from '../../shared/menu'
import { CartProvider } from '../cart/CartProvider'
import { CART_KEY } from '../cart/cartStore'
import { resetSceneGate } from '../scene/gate'
import { useFakeIntersectionObserver } from '../test/intersection'
import { setMatchMedia, setWebGL } from '../test/setup'
import { clearToasts, getToasts } from '../ui/toast-store'
import {
  RISE,
  TURN_STEP,
  barProgressAt,
  drinkPose,
  drinkTurn,
  liveDrinks,
  clearDrawnDrinks,
  resetDrinkTurns,
  setDrinkDrawn,
  type DrinkPose,
} from './barProgress'
import { DrinkStage } from './DrinkStage'

const REDUCED = '(prefers-reduced-motion: reduce)'
const FOG_LINE = DRINKS[1]!

useFakeIntersectionObserver()

beforeEach(() => {
  resetSceneGate()
  resetDrinkTurns()
  sessionStorage.clear()
  clearToasts()
})

afterEach(() => {
  clearDrawnDrinks()
  resetSceneGate()
})

function renderStage(item = FOG_LINE, index = 1) {
  return render(
    <CartProvider>
      <DrinkStage item={item} index={index} />
    </CartProvider>,
  )
}

/** The visitor shows intent: pictures below the first screen may load. */
function intent() {
  act(() => {
    window.dispatchEvent(new Event('pointermove'))
  })
}

describe('DrinkStage', () => {
  it('has the drink’s name as a heading, and its notes and price as text', () => {
    renderStage()
    expect(screen.getByRole('heading', { level: 3, name: 'Fog Line' })).toBeInTheDocument()
    expect(screen.getByText(FOG_LINE.notes)).toBeInTheDocument()
    expect(screen.getByText('3.40')).toBeInTheDocument()
  })

  it('is its own section, reached by the drink’s anchor', () => {
    const { container } = renderStage()
    const section = container.querySelector('section')!
    expect(section).toHaveAttribute('id', 'drink-fog-line')
    expect(section).toHaveAccessibleName('Fog Line')
  })

  it('adds the drink to the order, and says so', () => {
    renderStage()
    fireEvent.click(screen.getByRole('button', { name: 'Add to order: Fog Line' }))
    expect(JSON.parse(sessionStorage.getItem(CART_KEY)!)).toEqual([
      { id: 'fog-line', itemId: 'fog-line', name: 'Fog Line', unitPrice: 340, qty: 1 },
    ])
    expect(getToasts().at(-1)).toMatchObject({ message: 'Fog Line is in your order.', kind: 'success' })
  })

  it('offers "Turn left" and "Turn right" once its own drink is drawn, and they turn its model', () => {
    const { container } = renderStage()
    // The row is held from the first paint, hidden and out of reach, so nothing moves when it appears.
    const row = container.querySelector('.drink-turn')!
    expect(row).not.toBeNull()
    expect(row).toHaveAttribute('inert')
    expect(screen.queryByRole('button', { name: 'Turn right' })).toBeNull()
    // Another drink drawing changes nothing here.
    act(() => setDrinkDrawn('lantern', true))
    expect(screen.queryByRole('button', { name: 'Turn right' })).toBeNull()
    expect(container.querySelector('section')).not.toHaveAttribute('data-live')
    act(() => setDrinkDrawn('fog-line', true))
    expect(screen.getByRole('group', { name: 'Turn Fog Line' })).toBe(row)
    expect(row).not.toHaveAttribute('inert')
    // Its still steps aside (by CSS) only now.
    expect(container.querySelector('section')).toHaveAttribute('data-live')

    const pose: DrinkPose = { y: 0, angle: 0, visible: false }
    const before = drinkPose(1.5, 1, drinkTurn('fog-line'), pose).angle
    fireEvent.click(screen.getByRole('button', { name: 'Turn right' }))
    expect(drinkTurn('fog-line')).toBeCloseTo(TURN_STEP)
    expect(drinkPose(1.5, 1, drinkTurn('fog-line'), pose).angle).toBeCloseTo(before + TURN_STEP)
    fireEvent.click(screen.getByRole('button', { name: 'Turn left' }))
    fireEvent.click(screen.getByRole('button', { name: 'Turn left' }))
    expect(drinkPose(1.5, 1, drinkTurn('fog-line'), pose).angle).toBeCloseTo(before - TURN_STEP)
    // Only this drink turns.
    expect(drinkTurn('lantern')).toBe(0)
  })

  it('shows its still, and no turn buttons, under reduced motion', () => {
    setMatchMedia(REDUCED, true)
    const { container } = renderStage()
    intent()
    act(() => setDrinkDrawn('fog-line', true))
    expect(container.querySelector('img[src*="/media/drink-fog-line-"]')).not.toBeNull()
    expect(container.querySelector('section')).not.toHaveAttribute('data-live')
    expect(container.querySelector('.drink-turn')).toBeNull()
    // The name and price are simply there: nothing rises.
    for (const kinetic of container.querySelectorAll('[data-kinetic]')) expect(kinetic).toHaveAttribute('data-state', 'shown')
  })

  it('shows its still without WebGL', () => {
    setWebGL(false)
    const { container } = renderStage()
    intent()
    expect(container.querySelector('img[src*="/media/drink-fog-line-"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Turn right' })).toBeNull()
  })

  it('shows the cup’s still for Last Tram, which is the house cup', () => {
    const { container } = renderStage(DRINKS[0]!, 0)
    intent()
    expect(container.querySelector('img[src*="/media/cup-still-"]')).not.toBeNull()
  })

  it('asks for no picture before the visitor shows intent', () => {
    const { container } = renderStage()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('the bar’s motion', () => {
  const pose: DrinkPose = { y: 0, angle: 0, visible: false }

  it('raises each drink into view as its section arrives, holds it centred, and lifts it away', () => {
    expect(drinkPose(0.5, 2, 0, pose)).toMatchObject({ visible: false })
    expect(drinkPose(1.2, 2, 0, pose).y).toBeLessThan(0)
    expect(drinkPose(2.5, 2, 0, pose)).toMatchObject({ y: 0, visible: true })
    expect(drinkPose(2.4, 2, 0, pose).y).toBe(0)
    expect(drinkPose(3.2, 2, 0, pose).y).toBeGreaterThan(0)
    expect(drinkPose(3.6, 2, 0, pose)).toMatchObject({ y: RISE, visible: false })
  })

  it('turns each drink with the scroll', () => {
    const early = drinkPose(2.3, 2, 0, pose).angle
    const late = drinkPose(2.7, 2, 0, pose).angle
    expect(late).toBeGreaterThan(early)
  })

  it('follows the scroll across the drinks’ sections', () => {
    const tops = [1000, 1800, 2600]
    const heights = [800, 800, 800]
    expect(barProgressAt(0, tops, heights)).toBe(-1)
    expect(barProgressAt(1000, tops, heights)).toBe(0)
    expect(barProgressAt(1400, tops, heights)).toBe(0.5)
    expect(barProgressAt(2200, tops, heights)).toBe(1.5)
    expect(barProgressAt(3400, tops, heights)).toBe(3)
  })

  it('keeps the full models of the drink on screen and its neighbours only', () => {
    expect(liveDrinks(-1, 9)).toEqual([0, 1])
    expect(liveDrinks(0.5, 9)).toEqual([0, 1])
    expect(liveDrinks(4.5, 9)).toEqual([3, 4, 5])
    expect(liveDrinks(8.9, 9)).toEqual([7, 8])
    expect(liveDrinks(12, 9)).toEqual([7, 8])
  })
})
