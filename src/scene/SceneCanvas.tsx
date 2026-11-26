import { Canvas } from '@react-three/fiber'
import type { ReactNode } from 'react'

export interface SceneCanvasProps {
  frameloop: 'always' | 'demand'
  dpr: [number, number]
  children?: ReactNode
}

/** The only module that imports three and R3F for the host, so it loads as its own chunk. */
export default function SceneCanvas({ frameloop, dpr, children }: SceneCanvasProps) {
  return (
    <Canvas
      className="scene-canvas"
      aria-hidden="true"
      frameloop={frameloop}
      dpr={dpr}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
    >
      {children}
    </Canvas>
  )
}
