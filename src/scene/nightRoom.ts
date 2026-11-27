import { BackSide, BoxGeometry, Color, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, type Texture, type WebGLRenderer } from 'three'

export interface NightRoomOptions {
  /** The window panel's colour, in linear light. The landing's is a cool night blue. */
  pane?: [number, number, number]
}

/** The landing's window: cool night blue, brighter than white so it reads as a light source. */
const NIGHT_PANE: [number, number, number] = [0.55, 0.7, 1.05]

/*
 * The light a cup or glass reflects: a dark room built in code (no image is fetched), with a warm panel
 * overhead for the sodium lamp and a tall panel to one side for the window. Prefiltered once.
 */
export function nightRoom(gl: WebGLRenderer, { pane: paneColour = NIGHT_PANE }: NightRoomOptions = {}): Texture {
  const room = new Scene()
  const box = new Mesh(new BoxGeometry(12, 8, 12), new MeshBasicMaterial({ color: new Color('#0a1120'), side: BackSide }))
  box.position.y = 2
  room.add(box)
  const lamp = new Mesh(new PlaneGeometry(2.4, 2.4), new MeshBasicMaterial({ color: new Color(6.0, 3.4, 1.4) }))
  lamp.position.set(-1.6, 5.5, 1.2)
  lamp.rotation.x = Math.PI / 2
  room.add(lamp)
  const pane = new Mesh(new PlaneGeometry(3.2, 4.5), new MeshBasicMaterial({ color: new Color(...paneColour) }))
  pane.position.set(5.8, 2.2, -1.2)
  pane.rotation.y = -Math.PI / 2
  room.add(pane)
  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshBasicMaterial({ color: new Color(0.05, 0.04, 0.035) }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.9
  room.add(floor)
  const pmrem = new PMREMGenerator(gl)
  const target = pmrem.fromScene(room, 0.03)
  pmrem.dispose()
  room.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      ;(object.material as MeshBasicMaterial).dispose()
    }
  })
  return target.texture
}
