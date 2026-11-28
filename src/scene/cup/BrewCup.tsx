import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { brewLook, type BrewChoice } from '../../../shared/brew'
import { usePrefersReducedMotion } from '../../media/usePrefersReducedMotion'
import { blendBrew, brewSurface, type BrewSurface } from './brewSurface'
import HeroCup, { type CupSource } from './HeroCup'

/** How long the coffee takes to change to a new choice: a scene change, like light (docs/brand.md). */
export const EASE_SECONDS = 0.6

/** 0..1, eased at both ends. */
function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

interface Ease {
  from: BrewSurface
  to: BrewSurface
  start: number
}

export interface BrewCupProps {
  choice: BrewChoice
}

/**
 * Brew-your-own's cup: the hero cup, the same model under the same lamp, at rest, its coffee the
 * visitor's drink. Each new choice eases the coffee there over EASE_SECONDS, from wherever it was
 * (even part way through the last change); under reduced motion it changes at once. The name is
 * not in the cup, so naming the drink changes nothing here.
 */
export default function BrewCup({ choice }: BrewCupProps) {
  const reduced = usePrefersReducedMotion()
  const invalidate = useThree((state) => state.invalidate)
  const { beans, roast, method, milk } = choice
  const target = useMemo(() => brewSurface(brewLook({ beans, roast, method, milk })), [beans, roast, method, milk])

  // Read and written by the frame loop, outside React.
  const ease = useRef<Ease | null>(null)
  const shown = useRef<BrewSurface | null>(null)

  // A canvas drawn on demand wakes for the change; the cup keeps asking until it has settled.
  useEffect(() => {
    if (target) invalidate()
  }, [target, invalidate])

  const source = useCallback<CupSource>(
    (now) => {
      if (!ease.current || ease.current.to !== target) ease.current = { from: shown.current ?? target, to: target, start: now }
      // Nothing to ease from on the first frame: the cup starts as the drink.
      const t = reduced || ease.current.from === target ? 1 : smooth((now - ease.current.start) / EASE_SECONDS)
      const current = blendBrew(ease.current.from, target, t)
      shown.current = current
      return { look: current.look, tint: current.tint, changing: t < 1 }
    },
    [target, reduced],
  )

  return <HeroCup still source={source} />
}
