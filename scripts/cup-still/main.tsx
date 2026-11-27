/*
 * The hero cup's still, drawn by the live scene itself (HeroCup) so the photograph the page shows
 * before the canvas, and without WebGL, is the same cup in the same pose and light: the cup at rest
 * as its chapter begins, an espresso, at night, on a transparent background. render.mjs saves it.
 */
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/tokens.css'
import HeroCup from '../../src/scene/cup/HeroCup'
import { SceneQualityContext } from '../../src/scene/scene-quality'
import { SceneReadyContext } from '../../src/scene/scene-ready'
import { setOverride } from '../../src/time/night-store'

setOverride('night')
document.documentElement.style.background = 'transparent'
document.body.style.margin = '0'

function drawn() {
  document.body.dataset.ready = 'true'
}

createRoot(document.getElementById('stage')!).render(
  <Canvas
    style={{ position: 'fixed', inset: 0 }}
    dpr={1}
    gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
  >
    <SceneQualityContext value={{ tier: 'high', dpr: [1, 1] }}>
      <SceneReadyContext value={drawn}>
        <Suspense fallback={null}>
          {/* The cup's rest: the hero chapter, before its own chapter starts to move it. */}
          <HeroCup progress={0.5} />
        </Suspense>
      </SceneReadyContext>
    </SceneQualityContext>
  </Canvas>,
)
