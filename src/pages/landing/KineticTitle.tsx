import './KineticTitle.css'

export interface KineticTitleProps {
  text: string
  /**
   * Hold the letters below their baseline until a script plays them in. Only honoured when motion
   * is allowed (the CSS checks), so with reduced motion the title is always whole.
   */
  waiting?: boolean
  className?: string
}

/**
 * Display type whose letters rise one by one from a baseline, as on the brand board. The phrase is
 * real text for assistive technology and search (visually hidden); the split letters are drawn
 * for the eye only and hidden from the accessibility tree. Each word is kept whole so lines only
 * break between words. The animation itself belongs to the page: it targets `[data-letter]`.
 */
export function KineticTitle({ text, waiting = false, className }: KineticTitleProps) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <span data-kinetic="" data-state={waiting ? 'waiting' : 'shown'} className={['kinetic', className].filter(Boolean).join(' ')}>
      <span className="kinetic-text">{text}</span>
      <span className="kinetic-letters" aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            {w > 0 && ' '}
            <span data-word="" className="kinetic-word">
              {[...word].map((letter, i) => (
                <span key={i} data-letter="" className="kinetic-letter">
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
