import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): Buffer => readFileSync(path)
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngSize(buffer: Buffer): [number, number] {
  expect(buffer.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
}

describe('icon files', () => {
  it.each([
    ['public/favicon-32.png', 32, 32],
    ['public/apple-touch-icon.png', 180, 180],
    ['public/icon-192.png', 192, 192],
    ['public/icon-512.png', 512, 512],
    ['public/og-image.png', 1200, 630],
  ])('%s is %i x %i', (path, width, height) => {
    expect(pngSize(read(path as string))).toEqual([width, height])
  })

  it('favicon.ico packs PNG images of 16, 32 and 48 px', () => {
    const ico = read('public/favicon.ico')
    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    const count = ico.readUInt16LE(4)
    expect(count).toBe(3)
    const sizes: number[] = []
    for (let i = 0; i < count; i++) {
      const entry = 6 + i * 16
      const size = ico.readUInt8(entry)
      const length = ico.readUInt32LE(entry + 8)
      const offset = ico.readUInt32LE(entry + 12)
      expect(pngSize(ico.subarray(offset, offset + length))).toEqual([size, size])
      sizes.push(size)
    }
    expect(sizes).toEqual([16, 32, 48])
  })

  it('the apple touch icon is opaque (RGB, no alpha channel)', () => {
    // IHDR colour type, byte 25: 2 = truecolour without alpha.
    expect(read('public/apple-touch-icon.png').readUInt8(25)).toBe(2)
  })

  it('favicon.svg is the simplified 16 px drawing, with no script', () => {
    const svg = read('public/favicon.svg').toString('utf8')
    expect(svg).toContain('viewBox="0 0 16 16"')
    expect(svg).not.toMatch(/<script|\son\w+=|href=/i)
  })
})

describe('site.webmanifest', () => {
  const manifest = JSON.parse(read('public/site.webmanifest').toString('utf8')) as {
    name: string
    display: string
    theme_color: string
    background_color: string
    icons: { src: string; sizes: string; type: string }[]
  }

  it('names the site and sets the night colours', () => {
    expect(manifest.name).toBe('Umbrista')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#0D1524')
    expect(manifest.background_color).toBe('#0D1524')
  })

  it('lists the 192 and 512 px icons', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })
})

describe('index.html', () => {
  const html = read('index.html').toString('utf8')

  it('links the favicon set, the manifest and the theme colour', () => {
    expect(html).toMatch(/<link[^>]*rel="icon"[^>]*>/)
    expect(html).toContain('href="/favicon.svg"')
    expect(html).toContain('type="image/svg+xml"')
    expect(html).toContain('href="/favicon.ico"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('href="/site.webmanifest"')
    expect(html).toContain('<meta name="theme-color" content="#0D1524"')
  })

  it('carries Open Graph and Twitter card metadata', () => {
    for (const name of ['og:title', 'og:description', 'og:image', 'twitter:card']) {
      expect(html).toContain(name)
    }
  })

  it('has no inline script, inline style or style attribute (CSP)', () => {
    expect(html).not.toMatch(/<style/i)
    expect(html).not.toMatch(/\sstyle=/i)
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/i)
  })
})
