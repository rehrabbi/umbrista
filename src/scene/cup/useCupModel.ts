import { useGLTF } from '@react-three/drei'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { Box3, Mesh, Vector3, type Group } from 'three'
import type { GLTFLoader } from 'three-stdlib'

/** The compressed cup, built by `npm run models` from the approved master. */
export const CUP_URL = '/models/cup.glb'

export interface CupModel {
  /** The cup and saucer, as one mesh, standing on y = 0 and centred on the cup's axis. */
  scene: Group
  /** The inside radius of the cup at its rim. */
  rimRadius: number
  /** The height of the coffee the model was made with (its crema), above the saucer's underside. */
  liquidHeight: number
  /** The height of the rim. */
  rimHeight: number
  /** The inside radius of the cup at a height (between the modelled coffee and the rim). */
  wallRadiusAt: (height: number) => number
  /**
   * Where the cup sits in the saucer: the inner edge of the saucer's top face, which rings the cup's
   * foot. The model has an open slot between the two there (see HeroCup's seat).
   */
  seat: { radius: number; height: number }
  /** Which way the handle points, as an angle in the xz plane (atan2 of z over x). */
  handleAngle: number
}

/**
 * The meshopt decoder is three's own, bundled with the site (a small WebAssembly module embedded
 * in it), so nothing is fetched from a CDN. Draco is never used: the cup is not Draco-compressed.
 */
function withLocalDecoders(loader: GLTFLoader): void {
  loader.setMeshoptDecoder(MeshoptDecoder)
}

const measured = new WeakMap<Group, CupModel>()

/**
 * Reads the cup's shape from its vertices: where the rim is, how wide the inside is there, and how
 * high the modelled coffee stands. The coffee's surface is the highest point near the axis; the
 * rim's inside radius is the narrowest point at the top of the wall.
 */
function measure(scene: Group): CupModel {
  const known = measured.get(scene)
  if (known) return known

  // Stand the cup on y = 0, centred on its axis (the saucer is round, so its box centre is the axis).
  scene.updateMatrixWorld(true)
  const box = new Box3().setFromObject(scene)
  const centre = box.getCenter(new Vector3())
  scene.position.set(-centre.x, -box.min.y, -centre.z)
  scene.updateMatrixWorld(true)

  const point = new Vector3()
  const normal = new Vector3()
  const height = box.max.y - box.min.y
  let top = -Infinity
  let seat = { radius: Infinity, height: 0 }
  const handle = new Vector3()
  let liquid = -Infinity
  const ring: { y: number; r: number }[] = []
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const position = object.geometry.getAttribute('position')
    const normals = object.geometry.getAttribute('normal')
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld)
      const r = Math.hypot(point.x, point.z)
      top = Math.max(top, point.y)
      // The saucer's top face, low down and facing up: its narrowest point is the edge around the foot.
      if (normals && point.y > 0.05 * height && point.y < 0.2 * height) {
        normal.fromBufferAttribute(normals, index).transformDirection(object.matrixWorld)
        if (normal.y > 0.7 && r < seat.radius && r > 0.1 * box.max.x) seat = { radius: r, height: point.y }
      }
      if (r < 0.15 * (box.max.x - box.min.x)) liquid = Math.max(liquid, point.y)
      ring.push({ y: point.y, r })
      // The handle: whatever stands well out from the body, between the saucer and the rim.
      if (point.y > 0.45 * height && point.y < 0.9 * height && r > 0.55 * box.max.x) handle.add(point)
    }
  })
  // The inside wall: the smallest radius (leaving out the coffee near the axis) in a thin band just
  // under the rim, and in one a little above the coffee. The wall is close to straight between them.
  const band = 0.03 * (box.max.y - box.min.y)
  const inside = (from: number, to: number) =>
    ring.reduce((least, { y, r }) => (y >= from && y <= to && r > 0.2 * box.max.x ? Math.min(least, r) : least), Infinity)
  const upper = { y: top - band / 2, r: inside(top - band, top) }
  const lower = { y: liquid + 2.5 * band, r: inside(liquid + 2 * band, liquid + 3 * band) }
  const slope = (upper.r - lower.r) / (upper.y - lower.y)
  const wallRadiusAt = (at: number) => lower.r + (at - lower.y) * slope
  const model: CupModel = {
    scene,
    rimHeight: top,
    rimRadius: upper.r,
    liquidHeight: liquid,
    wallRadiusAt,
    seat,
    handleAngle: Math.atan2(handle.z, handle.x),
  }
  measured.set(scene, model)
  return model
}

/** The approved cup, loaded once (it suspends until it has), with its measurements. */
export function useCupModel(): CupModel {
  const { scene } = useGLTF(CUP_URL, false, false, withLocalDecoders)
  return measure(scene)
}

/** Start loading the cup before it is needed. */
export function preloadCupModel(): void {
  useGLTF.preload(CUP_URL, false, false, withLocalDecoders)
}
