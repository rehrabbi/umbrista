import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import type { StillName } from '../media/manifest'
import { Picture } from '../media/Picture'
import { measureFrameTime, quality, type Quality } from './quality'
import { SceneBoundary } from './SceneBoundary'
import { useSceneActive } from './visibility'
import './SceneHost.css'

// three and R3F are heavy: they load as their own chunk, only once the host decides to mount.
const SceneCanvas = lazy(() => import('./SceneCanvas'))

export interface SceneHostProps {
  /** The photoreal still under the canvas, and the whole scene whenever WebGL is not available. */
  still: StillName
  /** Describes the still (its alt text). */
  label: string
  /** Pass for the page's LCP image. */
  priority?: boolean
  className?: string
  /** R3F elements drawn over the still. */
  children?: ReactNode
}

const FALLBACK_DELAY_MS = 200

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    // Hand the probe context straight back, so it does not count against the browser's limit.
    ;(gl as WebGLRenderingContext).getExtension?.('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/** Run `task` once the page has painted: when the browser is idle, or after a short delay. */
function afterFirstPaint(task: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(task, { timeout: 1500 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(task, FALLBACK_DELAY_MS)
  return () => clearTimeout(id)
}

/**
 * The stage for a live 3D scene. The still is always there first, so the page has a photograph
 * before any 3D loads. The Canvas mounts after first paint, fades in, and runs its frame loop only
 * while the scene is visible. If WebGL is missing, or the context is lost during the visit, the
 * canvas is removed and the still is all that remains: never a blank or black canvas.
 */
export function SceneHost({ still, label, priority = false, className, children }: SceneHostProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [tier, setTier] = useState<Quality | null>(null)
  const [lost, setLost] = useState(false)
  const active = useSceneActive(ref)

  useEffect(() => {
    let cancelled = false
    const cancel = afterFirstPaint(() => {
      // Probed here, not at mount, so no WebGL context is created during the LCP window.
      if (!hasWebGL()) return
      void measureFrameTime().then((frameMs) => {
        if (!cancelled) setTier(quality(frameMs))
      })
    })
    return () => {
      cancelled = true
      cancel()
    }
  }, [])

  // webglcontextlost does not bubble, but a capturing listener on the host still sees it.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const onLost = () => setLost(true)
    host.addEventListener('webglcontextlost', onLost, true)
    return () => host.removeEventListener('webglcontextlost', onLost, true)
  }, [])

  const showCanvas = tier !== null && !lost

  return (
    <div ref={ref} data-scene-host="" className={['scene-host', className].filter(Boolean).join(' ')}>
      <Picture name={still} alt={label} priority={priority} className="scene-still" />
      {showCanvas && (
        <SceneBoundary onError={() => setLost(true)}>
          <Suspense fallback={null}>
            <SceneCanvas frameloop={active ? 'always' : 'demand'} dpr={tier.dpr}>
              {children}
            </SceneCanvas>
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  )
}
