import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { StillName } from '../media/manifest'
import { Picture } from '../media/Picture'
import { dprFor, isSoftwareRenderer, measureFrameTime, quality, type Quality, type Tier } from './quality'
import { whenScenesMayStart } from './gate'
import { SceneBoundary } from './SceneBoundary'
import { SceneQualityContext } from './scene-quality'
import { SceneReadyContext } from './scene-ready'
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
  /**
   * Start only once the host is within this distance of the screen (an IntersectionObserver
   * rootMargin, such as '100% 0px'), so a scene further down the page loads nothing before then.
   */
  near?: string
  /**
   * The canvas draws the still's subject itself, over a transparent background (the hero cup): once
   * the live scene has faded in, the still steps aside, so the two never show at once.
   */
  swap?: boolean
  /** Smooth the canvas's edges (multisampling). Worth it for an object with fine edges, not a backdrop. */
  antialias?: boolean
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

/** Is the host near the screen? Always true without `near`, or without IntersectionObserver. */
function useNear(ref: RefObject<Element | null>, near: string | undefined): boolean {
  const [isNear, setNear] = useState(() => near === undefined || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (isNear || !element || near === undefined) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: near },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, near, isNear])
  return isNear
}

/**
 * The stage for a live 3D scene. The still is always there first, so the page has a photograph
 * before any 3D loads. Nothing 3D starts until the visitor shows intent or the loaded page has been
 * quiet a while (see gate.ts), and, with `near`, until the host nears the screen. The Canvas then
 * mounts, fades in once its scene has drawn, and runs its frame loop only while the scene is visible. If WebGL is missing or only emulated in software, or the context is
 * lost during the visit, the canvas is removed and the still is all that remains: never a blank or
 * black canvas, and never a slideshow of slow frames.
 */
export function SceneHost({
  still,
  label,
  priority = false,
  className,
  near,
  swap = false,
  antialias = false,
  children,
}: SceneHostProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [tier, setTier] = useState<Quality | null>(null)
  const [lost, setLost] = useState(false)
  const [drawn, setDrawn] = useState(false)
  const active = useSceneActive(ref)
  const isNear = useNear(ref, near)
  const ready = useCallback(() => setDrawn(true), [])
  // Waited for from mount, so the visitor's intent counts even while the host is still far away.
  const [mayStart, setMayStart] = useState(false)
  useEffect(() => whenScenesMayStart(() => setMayStart(true)), [])

  useEffect(() => {
    if (!isNear || !mayStart) return
    let cancelled = false
    const cancelPaint = afterFirstPaint(() => {
      // Probed here, not at mount, so no WebGL context is created before the visitor needs one.
      if (cancelled || !hasFastWebGL()) return
      void measureFrameTime().then((frameMs) => {
        if (cancelled) return
        const forced = forcedTier()
        setTier(forced ? { tier: forced, dpr: dprFor(forced) } : quality(frameMs))
      })
    })
    return () => {
      cancelled = true
      cancelPaint()
    }
  }, [isNear, mayStart])

  // webglcontextlost does not bubble, but a capturing listener on the host still sees it.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const onLost = () => {
      setLost(true)
      setDrawn(false)
    }
    host.addEventListener('webglcontextlost', onLost, true)
    return () => host.removeEventListener('webglcontextlost', onLost, true)
  }, [])

  const showCanvas = tier !== null && !lost

  return (
    <div
      ref={ref}
      data-scene-host=""
      data-live={showCanvas && drawn ? 'ready' : undefined}
      data-swap={swap ? '' : undefined}
      className={['scene-host', className].filter(Boolean).join(' ')}
    >
      <Picture name={still} alt={label} priority={priority} className="scene-still" />
      {showCanvas && (
        <SceneBoundary
          onError={() => {
            setLost(true)
            setDrawn(false)
          }}
        >
          <Suspense fallback={null}>
            <SceneCanvas frameloop={active ? 'always' : 'demand'} dpr={tier.dpr} antialias={antialias && tier.tier !== 'low'}>
              <SceneQualityContext value={tier}>
                <SceneReadyContext value={ready}>{children}</SceneReadyContext>
              </SceneQualityContext>
            </SceneCanvas>
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  )
}
