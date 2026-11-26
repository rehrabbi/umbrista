import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MEDIA } from './manifest'
import { Picture } from './Picture'

function parts(container: HTMLElement) {
  const sources = [...container.querySelectorAll('source')]
  const img = container.querySelector('img')!
  return { sources, img }
}

describe('Picture', () => {
  it('lists AVIF then WebP sources built from the manifest, with an img fallback', () => {
    const { container } = render(<Picture name="street-dusk" alt="A street at dusk" />)
    const { sources, img } = parts(container)
    expect(sources.map((s) => s.type)).toEqual(['image/avif', 'image/webp'])
    expect(sources[0]!.getAttribute('srcset')).toBe(
      '/media/street-dusk-640.avif 640w, /media/street-dusk-1280.avif 1280w, /media/street-dusk-1920.avif 1920w, /media/street-dusk-2560.avif 2560w',
    )
    expect(sources[1]!.getAttribute('srcset')).toContain('/media/street-dusk-2560.webp 2560w')
    expect(sources[0]!.getAttribute('sizes')).toBe('100vw')
    expect(img).toHaveAttribute('src', '/media/street-dusk-2560.webp')
    expect(img).toHaveAttribute('alt', 'A street at dusk')
  })

  it('reserves its space from the aspect ratio so nothing shifts', () => {
    const { container } = render(<Picture name="street-dusk" alt="" />)
    const { img } = parts(container)
    const [w, h] = MEDIA['street-dusk'].aspect
    expect(img).toHaveAttribute('width', '2560')
    expect(img).toHaveAttribute('height', String(Math.round((2560 * h) / w)))
    expect(img).toHaveAttribute('decoding', 'async')
  })

  it('takes a sizes hint and a class, and allows an empty alt for decoration', () => {
    const { container } = render(<Picture name="crema-macro" alt="" sizes="50vw" className="x" />)
    const { sources, img } = parts(container)
    expect(sources[0]!.getAttribute('sizes')).toBe('50vw')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveClass('x')
  })

  it('is lazy by default and eager with high fetch priority only when it is the priority image', () => {
    const { container: lazy } = render(<Picture name="rain-window" alt="" />)
    expect(lazy.querySelector('img')).toHaveAttribute('loading', 'lazy')
    expect(lazy.querySelector('img')).not.toHaveAttribute('fetchpriority')

    const { container: eager } = render(<Picture name="street-dusk" alt="" priority />)
    expect(eager.querySelector('img')).toHaveAttribute('loading', 'eager')
    expect(eager.querySelector('img')).toHaveAttribute('fetchpriority', 'high')
  })
})
