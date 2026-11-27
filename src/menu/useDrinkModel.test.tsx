import { renderHook } from '@testing-library/react'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DISPOSE_AFTER_MS, drinkModelUrl, useDrinkModel } from './useDrinkModel'

const loaded = vi.hoisted(() => ({ scenes: new Map<string, unknown>(), cleared: [] as string[] }))

// drei's loader needs a network and a decoder; here every URL is a box 2 wide, 4 tall and 1 deep.
vi.mock('@react-three/drei', () => {
  // A mock factory is hoisted above the file's own scope, so it cannot share a function from there.
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  const useGLTF = (url: string) => ({ scene: loaded.scenes.get(url) })
  useGLTF.clear = (url: string) => loaded.cleared.push(url)
  useGLTF.preload = () => {}
  return { useGLTF }
})

function modelAt(url: string) {
  const texture = new Texture()
  const material = new MeshStandardMaterial({ map: texture })
  const mesh = new Mesh(new BoxGeometry(2, 4, 1), material)
  mesh.position.set(3, 5, 0)
  const scene = new Group()
  scene.add(mesh)
  loaded.scenes.set(url, scene)
  return { scene, mesh, material, texture }
}

beforeEach(() => {
  vi.useFakeTimers()
  loaded.scenes.clear()
  loaded.cleared.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('drinkModelUrl', () => {
  it('finds a drink’s full and light models, and the cup for Last Tram', () => {
    expect(drinkModelUrl('fog-line', 'full')).toBe('/models/drinks/fog-line.glb')
    expect(drinkModelUrl('fog-line', 'lite')).toBe('/models/drinks/fog-line-lite.glb')
    expect(drinkModelUrl('cup', 'lite')).toBe('/models/cup.glb')
  })
})

describe('useDrinkModel', () => {
  it('stands the model on y = 0, centred, with its largest side one unit', () => {
    modelAt('/models/drinks/umbra.glb')
    const { result } = renderHook(() => useDrinkModel('umbra', 'full'))
    const bounds = new Box3().setFromObject(result.current)
    expect(bounds.min.y).toBeCloseTo(0)
    expect(bounds.max.y).toBeCloseTo(1)
    expect(bounds.min.x).toBeCloseTo(-0.25)
    expect(bounds.max.x).toBeCloseTo(0.25)
  })

  it('gives each scene its own copy of the nodes, sharing the geometry', () => {
    const { mesh } = modelAt('/models/drinks/umbra.glb')
    const first = renderHook(() => useDrinkModel('umbra', 'full')).result.current
    const second = renderHook(() => useDrinkModel('umbra', 'full')).result.current
    expect(first).not.toBe(second)
    const meshes: Mesh[] = []
    for (const copy of [first, second]) copy.traverse((node) => node instanceof Mesh && meshes.push(node))
    expect(meshes).toHaveLength(2)
    expect(meshes[0]!.geometry).toBe(mesh.geometry)
    expect(meshes[1]!.geometry).toBe(mesh.geometry)
  })

  it('frees the model a while after nothing draws it, and not while something does', () => {
    const { mesh, material, texture } = modelAt('/models/drinks/lantern-lite.glb')
    const disposed = { geometry: vi.spyOn(mesh.geometry, 'dispose'), material: vi.spyOn(material, 'dispose'), texture: vi.spyOn(texture, 'dispose') }
    const first = renderHook(() => useDrinkModel('lantern', 'lite'))
    const second = renderHook(() => useDrinkModel('lantern', 'lite'))

    first.unmount()
    vi.advanceTimersByTime(DISPOSE_AFTER_MS * 2)
    expect(disposed.geometry).not.toHaveBeenCalled()

    second.unmount()
    vi.advanceTimersByTime(DISPOSE_AFTER_MS - 1)
    expect(disposed.geometry).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(disposed.geometry).toHaveBeenCalledOnce()
    expect(disposed.material).toHaveBeenCalledOnce()
    expect(disposed.texture).toHaveBeenCalledOnce()
    expect(loaded.cleared).toEqual(['/models/drinks/lantern-lite.glb'])
  })

  it('keeps the model when a scene asks for it again before it is freed', () => {
    const { mesh } = modelAt('/models/drinks/sodium.glb')
    const dispose = vi.spyOn(mesh.geometry, 'dispose')
    renderHook(() => useDrinkModel('sodium', 'full')).unmount()
    vi.advanceTimersByTime(DISPOSE_AFTER_MS / 2)
    renderHook(() => useDrinkModel('sodium', 'full'))
    vi.advanceTimersByTime(DISPOSE_AFTER_MS * 2)
    expect(dispose).not.toHaveBeenCalled()
    expect(loaded.cleared).toEqual([])
  })
})
