import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { CupInput } from './physics'
import './CupControls.css'

/** Sideways travel, in CSS pixels, before a drag is taken as turning the cup rather than scrolling. */
export const DRAG_INTENT_PX = 6
/** How far the cup turns for each pixel dragged, in radians: a full screen width is about two turns. */
const TURN_PER_PX = 0.012
/** A release faster than this, in pixels per millisecond, sets the cup spinning on. */
const FLICK_SPEED = 0.4

const MOVES = [
  { label: 'Tilt left', input: { tilt: [-1, 0] }, key: 'ArrowLeft' },
  { label: 'Tilt right', input: { tilt: [1, 0] }, key: 'ArrowRight' },
  { label: 'Spin', input: { spin: 1 }, key: 'ArrowUp' },
  { label: 'Splash', input: { splash: 1 }, key: 'ArrowDown' },
] as const satisfies readonly { label: string; input: CupInput; key: string }[]

export interface CupControlsProps {
  /** Called once per move the visitor asks for. The scene decides how long the push lasts. */
  onInput: (input: CupInput) => void
  className?: string
}

/** A fresh copy, so a listener can never change the constant. */
function inputOf(move: (typeof MOVES)[number]): CupInput {
  const input = move.input as CupInput
  return input.tilt ? { tilt: [input.tilt[0], input.tilt[1]] } : { ...input }
}

/**
 * The cup's controls, for everyone: every move the cup makes under a drag also has a button, and the
 * arrow keys work while focus is on the buttons (left and right tilt, up spins, down splashes). The
 * arrows are kept from scrolling the page only there.
 */
export function CupControls({ onInput, className }: CupControlsProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const move = MOVES.find((candidate) => candidate.key === event.key)
    if (!move) return
    event.preventDefault()
    onInput(inputOf(move))
  }

  return (
    <div role="group" aria-label="Play with the cup" className={['cup-controls', className].filter(Boolean).join(' ')} onKeyDown={onKeyDown}>
      {MOVES.map((move) => (
        <button key={move.label} type="button" className="cup-control" onClick={() => onInput(inputOf(move))}>
          {move.label}
        </button>
      ))}
    </div>
  )
}

interface Drag {
  pointerId: number
  x: number
  y: number
  /** Undecided until the pointer has moved; 'scroll' leaves it to the page for the rest of the touch. */
  mode: 'pending' | 'turn' | 'scroll'
  lastX: number
  lastTime: number
  speed: number
}

export interface CupDragSurfaceProps {
  onInput: (input: CupInput) => void
  className?: string
}

/**
 * The area over the cup that turns it when dragged sideways. Vertical swipes and pinches are the
 * page's: the surface allows them (`touch-action: pan-y pinch-zoom`) and only takes the pointer
 * once a drag has gone DRAG_INTENT_PX sideways, more than it has gone up or down. A quick release
 * sets the cup spinning on, slowing to rest.
 */
export function CupDragSurface({ onInput, className }: CupDragSurfaceProps) {
  const drag = useRef<Drag | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      mode: 'pending',
      lastX: event.clientX,
      lastTime: event.timeStamp,
      speed: 0,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || current.mode === 'scroll') return
    if (current.mode === 'pending') {
      const dx = Math.abs(event.clientX - current.x)
      const dy = Math.abs(event.clientY - current.y)
      if (dy > dx && dy >= DRAG_INTENT_PX) {
        current.mode = 'scroll'
        return
      }
      if (dx < DRAG_INTENT_PX || dx <= dy) return
      current.mode = 'turn'
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const moved = event.clientX - current.lastX
    const elapsed = Math.max(1, event.timeStamp - current.lastTime)
    current.speed = moved / elapsed
    current.lastX = event.clientX
    current.lastTime = event.timeStamp
    if (moved !== 0) onInput({ turn: moved * TURN_PER_PX })
  }

  const end = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (current.mode !== 'turn') return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (event.type === 'pointerup' && Math.abs(current.speed) > FLICK_SPEED) {
      onInput({ spin: Math.max(-1, Math.min(1, current.speed / 2)) })
    }
  }

  return (
    <div
      data-testid="cup-drag"
      aria-hidden="true"
      className={['cup-drag', className].filter(Boolean).join(' ')}
      // Set from script (the stylesheet has it too), so it holds whatever the cascade does.
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    />
  )
}
