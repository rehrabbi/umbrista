import { useId } from 'react'
import './Logo.css'
import { BRAND_COLORS, LOCKUP, MARK_FULL, WORDMARK, logoColors } from './geometry'
import type { MarkDrawing, Role } from './geometry'

export interface LogoProps {
  variant: 'mark' | 'wordmark' | 'lockup'
  /** The accessible name. Defaults to "Umbrista". */
  title?: string
  /**
   * Hide the logo from assistive technology. Use it when the mark sits inside a link or button that
   * already has its own accessible name; the logo then carries no title.
   */
  decorative?: boolean
  className?: string
}

// The fill attributes are the night colours; Logo.css overrides them from the theme tokens, so the
// logo follows [data-time="day"] and still draws correctly if the stylesheet is missing.
const NIGHT = logoColors(BRAND_COLORS.night)
const CLASS: Record<Role, string> = { body: 'logo-body', shadow: 'logo-shadow', crema: 'logo-crema' }

function Mark({ mark }: { mark: MarkDrawing }) {
  const shapes = mark.shapes.map((shape, i) => {
    const fill = NIGHT[shape.role]
    if (shape.tag === 'ellipse') {
      return <ellipse key={i} className={CLASS[shape.role]} fill={fill} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
    }
    return shape.stroke ? (
      <path
        key={i}
        className={`${CLASS[shape.role]}-stroke`}
        fill="none"
        stroke={fill}
        strokeWidth={shape.stroke}
        strokeLinecap="round"
        d={shape.d}
      />
    ) : (
      <path key={i} className={CLASS[shape.role]} fill={fill} d={shape.d} />
    )
  })
  return mark.transform ? <g transform={mark.transform}>{shapes}</g> : <>{shapes}</>
}

function Wordmark() {
  return <path className="logo-body" fill={NIGHT.body} d={WORDMARK.path} />
}

export function Logo({ variant, title = 'Umbrista', decorative = false, className }: LogoProps) {
  const titleId = useId()
  const viewBox = {
    mark: MARK_FULL.viewBox,
    wordmark: WORDMARK.viewBox,
    lockup: LOCKUP.viewBox,
  }[variant]

  const access = decorative
    ? ({ 'aria-hidden': true, focusable: false } as const)
    : ({ role: 'img', 'aria-labelledby': titleId } as const)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox.join(' ')}
      className={['logo', `logo-${variant}`, className].filter(Boolean).join(' ')}
      {...access}
    >
      {decorative ? null : <title id={titleId}>{title}</title>}
      {variant === 'mark' && <Mark mark={MARK_FULL} />}
      {variant === 'wordmark' && <Wordmark />}
      {variant === 'lockup' && (
        <>
          <g transform={`translate(${LOCKUP.mark.x} ${LOCKUP.mark.y})`}>
            <Mark mark={MARK_FULL} />
          </g>
          <g transform={`translate(${LOCKUP.wordmark.x} ${LOCKUP.wordmark.y}) scale(${LOCKUP.wordmark.scale})`}>
            <Wordmark />
          </g>
        </>
      )}
    </svg>
  )
}
