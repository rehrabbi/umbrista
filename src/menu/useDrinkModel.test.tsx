import { act, render } from '@testing-library/react'
import { Suspense } from 'react'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DISPOSE_AFTER_MS, drinkModelUrl, preloadDrinkModel, resetDrinkModels, useDrinkModel } from './useDrinkModel'

const loads = vi.hoisted(() => ({ urls: [] as string[], scenes: new Map<string, unknown>(), pending: new Map<string, () => void>(), hold: false }))

// The loader needs a network and a decoder; here every model is a box 2 wide, 4 tall and 1 deep.
// With `hold` set, a load waits until the test lets it land.
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder() {
      return this
    }
    loadAsync(url: string) {
      loads.urls.push(url)
      const scene = loads.scenes.get(url)
      if (!loads.hold) return Promise.resolve({ scene })
      return new Promise((resolve) => loads.pending.set(url, () => resolve({ scene })))
    }
  },
}))

// drei holds the landing's hero cup; the menu must never touch it.
const drei = vi.hoisted(() => ({ clear: vi.fn() }))
vi.mock('@react-three/drei', () => ({ useGLTF: Object.assign(() => ({}), { clear: drei.clear, preload: () => {} }) }))

function modelAt(url: string) {
  const texture = new Texture()
  const material = new MeshStandardMaterial({ map: texture })
  const mesh = new Mesh(new BoxGeometry(2, 4, 1), material)
  mesh.position.set(3, 5, 0)
  const scene = new Group()
  scene.add(mesh)
  loads.scenes.set(url, scene)
  return {
    mesh,
    disposed: { geometry: vi.spyOn(mesh.geometry, 'dispose'), material: vi.spyOn(material, 'dispose'), texture: vi.spyOn(texture, 'dispose') },
  }
}

const got: Group[] = []
function Drink({ model, detail }: { model: string; detail: 'full' | 'lite' }) {
  got.push(useDrinkModel(model, detail))
  return null
}

/** Mount a scene drawing the model, and let its load land. */
async function mount(model: string, detail: 'full' | 'lite' = 'full') {
  const before = got.length
  // Rendered in an awaited act, so React retries the suspended scene once its load lands.
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(
      <Suspense fallback={null}>
        <Drink model={model} detail={detail} />
      </Suspense>,
    )
  })
  // React reveals suspended content on its own short schedule; let it run.
  for (let tries = 0; got.length === before && tries < 20; tries++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
  }
  if (got.length === before) throw new Error(`${model} never loaded`)
  return view
}

beforeEach(() => {
  vi.useFakeTimers()
  resetDrinkModels()
  loads.urls.length = 0
  loads.scenes.clear()
  loads.pending.clear()
  loads.hold = false
  got.length = 0
  drei.clear.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('drinkModelUrl', () => {
  it('finds a drink’s full and light models, and the cup and its light version for Last Tram', () => {
    expect(drinkModelUrl('fog-line', 'full')).toBe('/models/drinks/fog-line.glb')
    expect(drinkModelUrl('fog-line', 'lite')).toBe('/models/drinks/fog-line-lite.glb')
    expect(drinkModelUrl('cup', 'full')).toBe('/models/cup.glb')
    expect(drinkModelUrl('cup', 'lite')).toBe('/models/cup-lite.glb')
  })
})

describe('useDrinkModel', () => {
  it('stands the model on y = 0, centred, with its largest side one unit', async () => {
    modelAt('/models/drinks/umbra.glb')
    await mount('umbra')
    const bounds = new Box3().setFromObject(got.at(-1)!)
    expect(bounds.min.y).toBeCloseTo(0)
    expect(bounds.max.y).toBeCloseTo(1)
    expect(bounds.min.x).toBeCloseTo(-0.25)
    expect(bounds.max.x).toBeCloseTo(0.25)
  })

  it('loads each model once, and gives each scene its own copy of the nodes', async () => {
    const { mesh } = modelAt('/models/drinks/umbra.glb')
    await mount('umbra')
    const first = got.at(-1)!
    await mount('umbra')
    const second = got.at(-1)!
    expect(loads.urls).toEqual(['/models/drinks/umbra.glb'])
    expect(first).not.toBe(second)
    const meshes: Mesh[] = []
    for (const copy of [first, second]) copy.traverse((node) => node instanceof Mesh && meshes.push(node))
    expect(meshes.map((copy) => copy.geometry)).toEqual([mesh.geometry, mesh.geometry])
  })

  it('frees the model a while after nothing draws it, and not while something does', async () => {
    const { disposed } = modelAt('/models/drinks/lantern-lite.glb')
    const first = await mount('lantern', 'lite')
    const second = await mount('lantern', 'lite')

    first.unmount()
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS * 2)
    expect(disposed.geometry).not.toHaveBeenCalled()

    second.unmount()
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS - 1)
    expect(disposed.geometry).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(disposed.geometry).toHaveBeenCalledOnce()
    expect(disposed.material).toHaveBeenCalledOnce()
    expect(disposed.texture).toHaveBeenCalledOnce()
    // Forgotten: asked for again, it loads again.
    await mount('lantern', 'lite')
    expect(loads.urls).toEqual(['/models/drinks/lantern-lite.glb', '/models/drinks/lantern-lite.glb'])
  })

  it('keeps the model when a scene asks for it again before it is freed', async () => {
    const { disposed } = modelAt('/models/drinks/sodium.glb')
    ;(await mount('sodium')).unmount()
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS / 2)
    await mount('sodium')
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS * 2)
    expect(disposed.geometry).not.toHaveBeenCalled()
    expect(loads.urls).toHaveLength(1)
  })

  it('frees a model whose load lands after the scene that asked for it has gone', async () => {
    const { disposed } = modelAt('/models/drinks/umbra.glb')
    loads.hold = true
    const view = render(
      <Suspense fallback={null}>
        <Drink model="umbra" detail="full" />
      </Suspense>,
    )
    // The visitor flicks on before it arrives.
    view.unmount()
    await act(async () => {
      loads.pending.get('/models/drinks/umbra.glb')!()
      await vi.advanceTimersByTimeAsync(0)
    })
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS)
    expect(disposed.geometry).toHaveBeenCalledOnce()
  })

  it('frees a preloaded model that no scene ever draws', async () => {
    const { disposed } = modelAt('/models/drinks/fog-line-lite.glb')
    preloadDrinkModel('fog-line', 'lite')
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS)
    expect(disposed.geometry).toHaveBeenCalledOnce()
  })

  it('never touches the landing’s hero cup: the menu keeps its own copy of the cup', async () => {
    modelAt('/models/cup.glb')
    modelAt('/models/cup-lite.glb')
    ;(await mount('cup', 'full')).unmount()
    ;(await mount('cup', 'lite')).unmount()
    await vi.advanceTimersByTimeAsync(DISPOSE_AFTER_MS * 2)
    expect(drei.clear).not.toHaveBeenCalled()
    expect(loads.urls).toEqual(['/models/cup.glb', '/models/cup-lite.glb'])
  })
})
