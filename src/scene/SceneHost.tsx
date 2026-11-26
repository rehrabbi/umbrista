import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import type { StillName } from '../media/manifest'
import { Picture } from '../media/Picture'
import { dprFor, isSoftwareRenderer, measureFrameTime, quality, type Quality, type Tier } from './quality'
import { SceneBoundary } from './SceneBoundary'
import { SceneQualityContext } from './scene-quality'
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

/*
 * Test-only hooks. Playwright sets these with `addInitScript`; nothing in the app sets them.
 * - `umbristaTestAllowSoftwareGL = true`: CI's headless browser only has software WebGL
 *   (SwiftShader), and the canvas still needs testing there.
 * - `umbristaTestTier = 'low' | 'mid' | 'high'`: draw at that tier, to test each tier's shader.
 */
type TestHooks = Window & { umbristaTestAllowSoftwareGL?: boolean; umbristaTestTier?: Tier }

function softwareAllowed(): boolean {
  return (window as TestHooks).umbristaTestAllowSoftwareGL === true
}

function forcedTier(): Tier | undefined {
  const tier = (window as TestHooks).umbristaTestTier
  return tier === 'low' || tier === 'mid' || tier === 'high' ? tier : undefined
}

/** The unmasked renderer name, or '' if the browser will not say. */
function rendererName(gl: WebGLRenderingContext): string {
  const info = gl.getExtension?.('WEBGL_debug_renderer_info')
  const name: unknown = gl.getParameter?.(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
  return typeof name === 'string' ? name : ''
}

/**
 * Is there WebGL fast enough for a live scene? The browser is asked to refuse a context it would
 * have to emulate in software, and the renderer's name is checked too, since not every browser
 * honours that request.
 */
function hasFastWebGL(): boolean {
  try {
    const allowSoftware = softwareAllowed()
    const options = allowSoftware ? undefined : { failIfMajorPerformanceCaveat: true }
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options)) as WebGLRenderingContext | null
    if (!gl) return false
    const fast = allowSoftware || !isSoftwareRenderer(rendererName(gl))
    // Hand the probe context straight back, so it does not count against the browser's limit.
    gl.getExtension?.('WEBGL_lose_context')?.loseContext()
    return fast
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
 * while the scene is visible. If WebGL is missing or only emulated in software, or the context is
 * lost during the visit, the canvas is removed and the still is all that remains: never a blank or
 * black canvas, and never a slideshow of slow frames.
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
      if (!hasFastWebGL()) return
      void measureFrameTime().then((frameMs) => {
        if (cancelled) return
        const forced = forcedTier()
        setTier(forced ? { tier: forced, dpr: dprFor(forced) } : quality(frameMs))
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
              <SceneQualityContext value={tier}>{children}</SceneQualityContext>
            </SceneCanvas>
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  )
}
