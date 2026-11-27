// Builds the web derivatives in public/media/ from the local masters in media-src/, and writes
// src/media/manifest.ts. Masters are never committed; the derivatives and the manifest are.
//
//   npm run media              build what is missing
//   npm run media -- --force   rebuild everything (after replacing a master or changing a setting)
//
// Needs the system `ffmpeg` and `ffprobe` (with libaom-av1, libwebp, libvpx-vp9 and libx264) and
// nothing else: no npm dependency. Every encode strips metadata and timestamps, so a rebuild with
// --force gives the same bytes and `git status` stays clean.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'media-src')
const OUT = join(root, 'public', 'media')
const MANIFEST = join(root, 'src', 'media', 'manifest.ts')
const force = process.argv.includes('--force')

// Quality settings, tuned so a 1920 px still stays well under 250 KB as AVIF and 400 KB as WebP.
const IMAGE_WIDTHS = [640, 1280, 1920, 2560]
const AVIF_CRF = 24 // lower is better; 0 to 63
const WEBP_QUALITY = 84 // higher is better; 0 to 100
const VIDEO_WIDTHS = [1920, 1280]
const VP9_CRF = 30
const H264_CRF = 22

const STILLS = ['street-dusk', 'rain-window', 'crema-macro']
// Stills with a transparent background, kept transparent in both formats: the hero cup, rendered
// from its own model by `npm run cup-still`, which the live cup replaces in place.
const ALPHA_STILLS = ['cup-still']
// The menu's drinks, from their approved studio stills (docs/brand.md): what the bar and the counter
// show before the 3D arrives, and for good under reduced motion or without WebGL. One drink fills at
// most one screen, so 640 and 1280 px are enough. Drink 1, Last Tram, is the cup and uses cup-still.
const DRINK_STILLS = ['fog-line', 'lantern', 'sodium', 'night-ferry', 'low-tide', 'umbra', 'wet-cobble', 'three-oclock']
const DRINK_WIDTHS = [640, 1280]
const LOOPS = [{ name: 'steam-loop', file: 'steam-loop.mp4' }]
// Textures for the 3D scenes: square WebP only (a WebGL texture loads through a plain image, with no
// <picture> to fall back from AVIF), at 768 px and 512 px for the low quality tier. The hero cup's
// coffee surfaces, photographed from above (docs/brand.md). The cup is never more than about 700 CSS
// px across; at 1024 px the espresso's finely flecked crema was still 222 KB at quality 60.
const TEXTURES = [
  { name: 'surface-espresso', file: 'surfaces/1-espresso.png' },
  { name: 'surface-bloom', file: 'surfaces/2-milk-bloom.png' },
  { name: 'surface-rosetta', file: 'surfaces/3-lamp-rosetta.png' },
]
const TEXTURE_WIDTHS = [768, 512]
const TEXTURE_QUALITY = 55

const BITEXACT = ['-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact']
// Decode and scale on one thread too (the encoders already are): the build never loads every core.
const ONE_THREAD = ['-threads', '1', '-filter_threads', '1']

function fail(message) {
  console.error(`media: ${message}`)
  process.exit(1)
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    fail(`${cmd} failed: ${result.error?.message ?? result.stderr.trim().split('\n').slice(-3).join(' | ')}`)
  }
  return result.stdout
}

function requireTool(tool) {
  const probe = spawnSync(tool, ['-version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) {
    fail(`${tool} was not found on PATH. Install ffmpeg (https://ffmpeg.org/download.html) and try again.`)
  }
}

function requireMaster(file) {
  const path = join(SRC, file)
  if (!existsSync(path)) {
    fail(`missing master media-src/${file}. The masters are not committed; copy them into media-src/ first.`)
  }
  return path
}

function dimensions(path) {
  const out = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path])
  const [width, height] = out.trim().split(',').map(Number)
  if (!width || !height) fail(`could not read the size of ${path}`)
  return { width, height }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

function aspectOf({ width, height }) {
  const d = gcd(width, height)
  return [width / d, height / d]
}

/** Output height for a width, kept even so every codec accepts it. */
function heightFor(width, aspect) {
  return 2 * Math.round((width * aspect[1]) / aspect[0] / 2)
}

function build(outName, make) {
  const path = join(OUT, outName)
  if (!force && existsSync(path)) return
  make(path)
  console.log(`  ${outName}  ${(statSync(path).size / 1024).toFixed(0)} KB`)
}

function stillSet(input, name, aspect, sourceWidth, extraInput = [], alpha = false, sizes = IMAGE_WIDTHS) {
  const widths = sizes.filter((w) => w <= sourceWidth)
  for (const w of widths) {
    const scale = `scale=${w}:${heightFor(w, aspect)}:flags=lanczos`
    // AVIF carries transparency as a second, greyscale image beside the colour one.
    const avifPicture = alpha
      ? ['-filter_complex', `[0]${scale},format=yuva420p,split[c][a];[a]alphaextract[a]`, '-map', '[c]', '-map', '[a]']
      : ['-vf', `${scale},format=yuv420p`]
    build(`${name}-${w}.avif`, (out) =>
      run('ffmpeg', ['-v', 'error', '-y', ...ONE_THREAD, ...extraInput, '-i', input, ...avifPicture, ...BITEXACT,
        '-c:v', 'libaom-av1', '-crf', String(AVIF_CRF), '-b:v', '0', '-cpu-used', '4', '-row-mt', '0', '-threads', '1',
        '-still-picture', '1', '-frames:v', '1', out]))
    build(`${name}-${w}.webp`, (out) =>
      run('ffmpeg', ['-v', 'error', '-y', ...ONE_THREAD, ...extraInput, '-i', input, '-vf', alpha ? `${scale},format=yuva420p` : scale, ...BITEXACT,
        '-c:v', 'libwebp', '-quality', String(WEBP_QUALITY), '-compression_level', '6', '-frames:v', '1', out]))
  }
  return widths
}

requireTool('ffmpeg')
requireTool('ffprobe')
mkdirSync(OUT, { recursive: true })
mkdirSync(dirname(MANIFEST), { recursive: true })

const entries = {}

for (const name of STILLS) {
  console.log(name)
  const input = requireMaster(`${name}.png`)
  const size = dimensions(input)
  const aspect = aspectOf(size)
  entries[name] = { kind: 'still', aspect, widths: stillSet(input, name, aspect, size.width) }
}

for (const name of ALPHA_STILLS) {
  console.log(name)
  const input = requireMaster(`${name}.png`)
  const size = dimensions(input)
  const aspect = aspectOf(size)
  entries[name] = { kind: 'still', aspect, widths: stillSet(input, name, aspect, size.width, [], true) }
}

for (const drink of DRINK_STILLS) {
  const name = `drink-${drink}`
  console.log(name)
  const input = requireMaster(`drinks/${drink}.png`)
  const size = dimensions(input)
  const aspect = aspectOf(size)
  entries[name] = { kind: 'still', aspect, widths: stillSet(input, name, aspect, size.width, [], false, DRINK_WIDTHS) }
}

for (const texture of TEXTURES) {
  console.log(texture.name)
  const input = requireMaster(texture.file)
  const size = dimensions(input)
  if (size.width !== size.height) fail(`${texture.file} must be square`)
  const widths = TEXTURE_WIDTHS.filter((w) => w <= size.width)
  for (const w of widths) {
    build(`${texture.name}-${w}.webp`, (out) =>
      run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', `scale=${w}:${w}:flags=lanczos`, ...BITEXACT,
        '-c:v', 'libwebp', '-quality', String(TEXTURE_QUALITY), '-compression_level', '6', '-frames:v', '1', out]))
  }
  entries[texture.name] = { kind: 'texture', aspect: [1, 1], widths }
}

for (const loop of LOOPS) {
  console.log(loop.name)
  const input = requireMaster(loop.file)
  const size = dimensions(input)
  const aspect = aspectOf(size)
  const posterName = `${loop.name}-poster`

  // The poster is the first frame, at the same widths as the stills (never upscaled).
  entries[posterName] = { kind: 'still', aspect, widths: stillSet(input, posterName, aspect, size.width) }

  const widths = VIDEO_WIDTHS.filter((w) => w <= size.width)
  for (const w of widths) {
    const scale = `scale=${w}:${heightFor(w, aspect)}:flags=lanczos,format=yuv420p`
    build(`${loop.name}-${w}.webm`, (out) =>
      run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-an', '-vf', scale, ...BITEXACT,
        '-c:v', 'libvpx-vp9', '-crf', String(VP9_CRF), '-b:v', '0', '-row-mt', '0', '-threads', '1',
        '-deadline', 'good', '-cpu-used', '1', '-pix_fmt', 'yuv420p', out]))
    build(`${loop.name}-${w}.mp4`, (out) =>
      run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-an', '-vf', scale, ...BITEXACT,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(H264_CRF), '-profile:v', 'high', '-threads', '1',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]))
  }
  entries[loop.name] = { kind: 'loop', aspect, widths, poster: posterName }
}

const body = Object.entries(entries)
  .map(([name, e]) => {
    const fields = [`kind: '${e.kind}'`, `aspect: [${e.aspect.join(', ')}]`, `widths: [${e.widths.join(', ')}]`]
    if (e.poster) fields.push(`poster: '${e.poster}'`)
    return `  '${name}': { ${fields.join(', ')} },`
  })
  .join('\n')

const manifest = `// Generated by \`npm run media\` (scripts/media.mjs). Do not edit by hand.
// Every name maps to the files in public/media/: stills as <name>-<width>.avif and .webp, loops as
// <name>-<width>.webm and .mp4 plus the poster still named in \`poster\`, textures (for the 3D scenes)
// as <name>-<width>.webp only. \`aspect\` is width : height.

export interface StillEntry {
  readonly kind: 'still'
  readonly aspect: readonly [number, number]
  readonly widths: readonly number[]
}

export interface TextureEntry {
  readonly kind: 'texture'
  readonly aspect: readonly [number, number]
  readonly widths: readonly number[]
}

export interface LoopEntry {
  readonly kind: 'loop'
  readonly aspect: readonly [number, number]
  readonly widths: readonly number[]
  readonly poster: string
}

export const MEDIA = {
${body}
} as const satisfies Record<string, StillEntry | LoopEntry | TextureEntry>

export type MediaName = keyof typeof MEDIA
export type StillName = {
  [K in MediaName]: (typeof MEDIA)[K] extends { kind: 'still' } ? K : never
}[MediaName]
export type LoopName = {
  [K in MediaName]: (typeof MEDIA)[K] extends { kind: 'loop' } ? K : never
}[MediaName]
export type TextureName = {
  [K in MediaName]: (typeof MEDIA)[K] extends { kind: 'texture' } ? K : never
}[MediaName]
`
writeFileSync(MANIFEST, manifest)
console.log('wrote src/media/manifest.ts')
