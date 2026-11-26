// resvg reads TTF and OTF files by path only, but Fontsource ships WOFF and WOFF2. WOFF 1.0 is a
// zlib-wrapped TrueType file, so unwrapping it needs no dependency. The TTFs are written to the
// system temp folder and never committed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

export function woffToTtf(buf) {
  const flavor = buf.readUInt32BE(4)
  const n = buf.readUInt16BE(12)
  const tables = []
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20
    const offset = buf.readUInt32BE(o + 4)
    const compressed = buf.readUInt32BE(o + 8)
    const original = buf.readUInt32BE(o + 12)
    const checksum = buf.readUInt32BE(o + 16)
    const raw = buf.subarray(offset, offset + compressed)
    tables.push({ tag: buf.subarray(o, o + 4), checksum, data: compressed < original ? inflateSync(raw) : raw })
  }
  const entrySelector = Math.floor(Math.log2(n))
  const searchRange = 2 ** entrySelector * 16
  const head = Buffer.alloc(12 + 16 * n)
  head.writeUInt32BE(flavor, 0)
  head.writeUInt16BE(n, 4)
  head.writeUInt16BE(searchRange, 6)
  head.writeUInt16BE(entrySelector, 8)
  head.writeUInt16BE(n * 16 - searchRange, 10)
  let offset = head.length
  const parts = [head]
  tables.forEach((t, i) => {
    const r = 12 + i * 16
    t.tag.copy(head, r)
    head.writeUInt32BE(t.checksum, r + 4)
    head.writeUInt32BE(offset, r + 8)
    head.writeUInt32BE(t.data.length, r + 12)
    const pad = (4 - (t.data.length % 4)) % 4
    parts.push(t.data, Buffer.alloc(pad))
    offset += t.data.length + pad
  })
  return Buffer.concat(parts)
}

const fontsource = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@fontsource')

/**
 * One latin font file as a TTF path, for resvg's fontFiles. Load exactly one weight and style per
 * family: with several loaded, resvg can pick the wrong one.
 */
export function brandFont(packageName, weight, style = 'normal') {
  const file = `${packageName}-latin-${weight}-${style}`
  const source = join(fontsource, packageName, 'files', `${file}.woff`)
  const dir = join(tmpdir(), 'umbrista-brand-fonts')
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `${basename(file)}.ttf`)
  writeFileSync(out, woffToTtf(readFileSync(source)))
  return out
}
