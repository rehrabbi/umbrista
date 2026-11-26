// Writes every logo file and icon from the geometry in src/brand/geometry.ts:
//   public/favicon.svg, favicon.ico (16, 32 and 48 px), favicon-32.png, apple-touch-icon.png,
//   icon-192.png, icon-512.png, og-image.png (1200x630), and docs/brand/logo-a-*.svg.
// Run with `npm run icons`, then commit the results. The tests read the committed files; nothing
// is generated during `npm test`. The output is deterministic.
//
// The simplified 16 px drawing is used at 16 and 32 px; the full drawing from 48 px up.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, crc32 } from 'node:zlib'
import { Resvg } from '@resvg/resvg-js'
import {
  BRAND_COLORS,
  LOCKUP,
  MARK_FULL,
  MARK_SMALL,
  lockupMarkup,
  logoColors,
  markMarkup,
} from '../src/brand/geometry.ts'
import { brandFont } from './fonts.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { night, day } = BRAND_COLORS
const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"'

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
  console.log(`wrote ${relative(root, path).replaceAll('\\', '/')}`)
}

const render = (svg, fontFiles = []) =>
  new Resvg(svg, { font: { fontFiles, loadSystemFonts: false }, shapeRendering: 2 }).render()

// ---- Favicon: the 16 px drawing; day colours on a light tab, night colours on a dark one ----

const css = (cls, colors) => `.${cls}{fill:${colors}}`
function favicon() {
  const d = logoColors(day)
  const n = logoColors(night)
  const classOf = { body: 'b', shadow: 's', crema: 'c' }
  const shapes = MARK_SMALL.shapes
    .map((shape) => {
      const cls = classOf[shape.role]
      const fill = d[shape.role]
      return shape.tag === 'ellipse'
        ? `<ellipse class="${cls}" fill="${fill}" cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"/>`
        : `<path class="${cls}" fill="${fill}" d="${shape.d}"/>`
    })
    .join('')
  const dark = `@media (prefers-color-scheme: dark){${css('b', n.body)}${css('s', n.shadow)}${css('c', n.crema)}}`
  return `<svg ${SVG_NS} viewBox="0 0 16 16"><style>${dark}</style>${shapes}</svg>\n`
}
write(join(root, 'public/favicon.svg'), favicon())

// ---- Tiles: a drawing centred on the night background ----

/** A drawing centred in a size x size tile, its box a share of the tile. */
function tile(size, drawing, share, radius = 0) {
  const [, , vw, vh] = drawing.viewBox
  const scale = (size * share) / vw
  const x = (size - vw * scale) / 2
  const y = (size - vh * scale) / 2
  const body = markMarkup(drawing, logoColors(night))
  return (
    `<svg ${SVG_NS} width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${night.bg}"/>` +
    `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g></svg>`
  )
}

/** The drawing for a size: simplified up to 32 px, full from 48 px. */
const drawingFor = (size) => (size <= 32 ? MARK_SMALL : MARK_FULL)
const corner = (size) => (size * 6) / 32

const icon = (size, share, radius) => render(tile(size, drawingFor(size), share, radius)).asPng()

write(join(root, 'public/favicon-32.png'), icon(32, 1, corner(32)))

/**
 * An .ico file holding PNG images, one per size: a 6-byte header, a 16-byte directory entry per
 * image, then the images. Anything that asks for /favicon.ico by name gets a proper icon.
 */
function ico(sizes) {
  const images = sizes.map((size) => icon(size, 1, corner(size)))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map((image, i) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(sizes[i] % 256, 0) // width; 0 means 256
    entry.writeUInt8(sizes[i] % 256, 1) // height
    entry.writeUInt8(0, 2) // no palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(image.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += image.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images])
}
write(join(root, 'public/favicon.ico'), ico([16, 32, 48]))

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

/** A truecolour PNG with no alpha channel, from RGBA pixels: an icon that is opaque by construction. */
function opaquePng(width, height, rgba) {
  const rows = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    rows[row] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4
      rows[row + 1 + x * 3] = rgba[from]
      rows[row + 2 + x * 3] = rgba[from + 1]
      rows[row + 3 + x * 3] = rgba[from + 2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(2, 9) // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// The mark's box is 0.8 of the tile; its ink then spans about 70%, clear of a rounded mask.
const SHARE = 0.8
const apple = render(tile(180, MARK_FULL, SHARE))
write(join(root, 'public/apple-touch-icon.png'), opaquePng(180, 180, apple.pixels))
write(join(root, 'public/icon-192.png'), icon(192, SHARE))
write(join(root, 'public/icon-512.png'), icon(512, SHARE))

// ---- Link preview ----

// One weight per family, because resvg can pick the wrong one when several are loaded.
const FONTS = [brandFont('big-shoulders-display', 800), brandFont('atkinson-hyperlegible-next', 400)]

function ogImage(width, height) {
  const colors = logoColors(night)
  const left = 96
  const lockupWidth = 440
  const lockupScale = lockupWidth / LOCKUP.viewBox[2]
  const lockupTop = 84
  const lockupHeight = LOCKUP.viewBox[3] * lockupScale
  const heroSize = 156
  const heroY = lockupTop + lockupHeight + 40 + heroSize * 0.78
  const small = 'A design project, not a real café.'
  const hero = (text, y) =>
    `<text x="${left - 4}" y="${y}" font-family="Big Shoulders Display" font-weight="800" font-size="${heroSize}" fill="${night.text}">${text}</text>`
  return (
    `<svg ${SVG_NS} width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${night.bg}"/>` +
    // A long, low shadow along the foot of the card, as in the mark.
    `<rect x="0" y="${height - 14}" width="${width * 0.62}" height="14" fill="${night.shadow}" opacity="0.55"/>` +
    `<g transform="translate(${left} ${lockupTop}) scale(${lockupScale})">${lockupMarkup(colors)}</g>` +
    hero('We open when', heroY) +
    hero('the light goes.', heroY + heroSize * 0.92) +
    `<text x="${left}" y="${height - 68}" font-family="Atkinson Hyperlegible Next" font-weight="400" font-size="30" fill="${night.textQuiet}">${small}</text>` +
    `</svg>`
  )
}
write(join(root, 'public/og-image.png'), render(ogImage(1200, 630), FONTS).asPng())

// ---- Logo files for the docs: the final drawings in the approved palette, on their background ----

function logoFile(title, viewBox, body, theme) {
  const [x, y, w, h] = viewBox
  const pad = Math.max(w, h) * 0.08
  const box = [x - pad, y - pad, w + pad * 2, h + pad * 2].map((n) => Math.round(n * 100) / 100)
  return (
    `<svg ${SVG_NS} viewBox="${box.join(' ')}" role="img" aria-labelledby="t">` +
    `<title id="t">${title}</title>` +
    `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="${theme.bg}"/>` +
    `${body}</svg>\n`
  )
}

for (const [suffix, theme] of [['on-dark', night], ['on-light', day]]) {
  const colors = logoColors(theme)
  write(
    join(root, `docs/brand/logo-a-mark-${suffix}.svg`),
    logoFile('Umbrista mark', MARK_FULL.viewBox, markMarkup(MARK_FULL, colors), theme),
  )
  write(
    join(root, `docs/brand/logo-a-lockup-${suffix}.svg`),
    logoFile('Umbrista', LOCKUP.viewBox, lockupMarkup(colors), theme),
  )
  write(
    join(root, `docs/brand/logo-a-16-${suffix}.svg`),
    logoFile('Umbrista mark, 16 px drawing', MARK_SMALL.viewBox, markMarkup(MARK_SMALL, colors), theme),
  )
}
