import type { CSSProperties } from 'react'
import { STAGGER } from './titleTiming'
import './KineticTitle.css'

export interface KineticTitleProps {
  text: string
  /**
   * Rise into place once, letter by letter, as the page arrives: each letter over --dur-chapter on
   * the settle curve, STAGGER seconds after the one before (titleTiming.ts). Only with motion
   * allowed (the CSS checks), so with reduced motion the title is simply there.
   */
  rise?: boolean
  className?: string
}

/**
 * Display type whose letters rise one by one from a baseline, as on the brand board. The phrase is
 * real text for assistive technology and search (visually hidden); the split letters are drawn
 * for the eye only and hidden from the accessibility tree. Each word is kept whole so lines only
 * break between words.
 */
export function KineticTitle({ text, rise = false, className }: KineticTitleProps) {
  const words = text.split(/\s+/).filter(Boolean)
  let index = 0
  return (
    <span
      data-kinetic=""
      data-state={rise ? 'rising' : 'shown'}
      className={['kinetic', className].filter(Boolean).join(' ')}
      style={{ '--kinetic-stagger': `${STAGGER * 1000}ms` } as CSSProperties}
    >
      <span className="kinetic-text">{text}</span>
      <span className="kinetic-letters" aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            {w > 0 && ' '}
            <span data-word="" className="kinetic-word">
              {[...word].map((letter, i) => (
                <span key={i} data-letter="" className="kinetic-letter" style={{ '--letter': index++ } as CSSProperties}>
                  {letter}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
