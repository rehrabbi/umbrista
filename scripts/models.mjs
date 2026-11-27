// Builds the web copies of the 3D models in public/models/ from the local masters in media-src/.
// Masters are never committed; the compressed models are.
//
//   npm run models                          build what is missing
//   npm run models -- --force               rebuild everything (after replacing a master or changing a setting)
//   npm run models -- fog-line lantern      only these models (a drink's name selects its light version too)
//
// Every model goes through the same steps with @gltf-transform/cli: tidy (dedupe, prune, weld, and
// for a light version simplify the geometry), resize the textures where the entry asks for less than
// the master has, WebP textures, then meshopt geometry. The page decodes meshopt with three's own decoder, bundled with the site: nothing is
// fetched from another origin. The steps are deterministic, so a rebuild with --force gives the same
// bytes and `git status` stays clean.
//
// The models are built one at a time and the image work runs on one thread (VIPS_CONCURRENCY and
// UV_THREADPOOL_SIZE are 1 in each step's environment): slower, but it never loads every core.
// Building a few models per run, with a pause between runs, keeps the machine cooler still.
//
// The list is the only thing to edit when a model is added: one entry per model.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'media-src')
const OUT = join(root, 'public', 'models')
const force = process.argv.includes('--force')
const names = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))

/**
 * The models. `master` is the file in media-src/, `out` the path under public/models/.
 * `textureSize` caps every texture's longest side; `budget` is the most the output may weigh, in
 * bytes (the media rules: the cup about 2 MB or less, each drink about 1.5 MB or less).
 * `simplify`, when set, cuts the geometry with meshoptimizer's simplifier: `ratio` is the share of
 * vertices to keep, `error` the most the surface may move, as a fraction of the model's size.
 */
const MODELS = [
  { id: 'cup', master: 'cup.glb', out: 'cup.glb', textureSize: 2048, budget: 2_000_000 },
  // The cup as Last Tram on the menu's counter: light like the drinks' counter versions below.
  { id: 'cup-lite', master: 'cup.glb', out: 'cup-lite.glb', textureSize: 512, simplify: { ratio: 0.25, error: 0.001 }, budget: 400_000 },
  // Each menu drink twice: the full model for the bar, and a light one for the counter, where all
  // eight show at once and small (textures at 512 px, about a quarter of the triangles, 400 KB or less).
  // A full model keeps 2048 px textures unless that is over its budget; then it gets 1024. A light
  // model's simplifier error is 0.001 unless the model stays over its budget; then `liteError` loosens it.
  ...[
    { id: 'fog-line', textureSize: 2048 },
    { id: 'lantern', textureSize: 1024 },
    { id: 'sodium', textureSize: 1024 },
    { id: 'night-ferry', textureSize: 1024 },
    { id: 'low-tide', textureSize: 1024 },
    { id: 'umbra', textureSize: 1024 },
    { id: 'wet-cobble', textureSize: 1024 },
    { id: 'three-oclock', textureSize: 1024, liteError: 0.002 },
  ].flatMap(({ id, textureSize, liteError = 0.001 }) => [
    { id, master: `drinks/${id}.glb`, out: `drinks/${id}.glb`, textureSize, budget: 1_500_000 },
    {
      id: `${id}-lite`,
      master: `drinks/${id}.glb`,
      out: `drinks/${id}-lite.glb`,
      textureSize: 512,
      simplify: { ratio: 0.25, error: liteError },
      budget: 400_000,
    },
  ]),
]

// The image work on one thread (sharp/libvips and Node's own pool), in every step's environment.
const ENV = { ...process.env, VIPS_CONCURRENCY: '1', UV_THREADPOOL_SIZE: '1' }

// WebP quality for colour-like textures, and for the normal map, whose small errors show as bumps.
const WEBP_QUALITY = 86
const NORMAL_QUALITY = 94
// Texture coordinates keep 14 bits: a 2048 px atlas then lands within a quarter of a texel.
const TEXCOORD_BITS = 14
// The image-to-3D masters all come with 2048 px textures.
const MASTER_TEXTURE_SIZE = 2048

// The CLI's own entry point: the `bin` its package.json names. The package exports only its main
// module, so its folder is found by walking up from that to its package.json.
const require = createRequire(import.meta.url)

function cliEntry() {
  let folder = dirname(require.resolve('@gltf-transform/cli'))
  for (;;) {
    const manifest = join(folder, 'package.json')
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
      if (pkg.name === '@gltf-transform/cli') {
        const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['gltf-transform']
        return join(folder, bin)
      }
    }
    const parent = dirname(folder)
    if (parent === folder) fail('could not find @gltf-transform/cli. Run npm ci first.')
    folder = parent
  }
}

const CLI = cliEntry()

function fail(message) {
  console.error(`models: ${message}`)
  process.exit(1)
}

function transform(args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: ENV })
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? `${result.stderr}${result.stdout}`.trim().split('\n').slice(-3).join(' | ')
    fail(`gltf-transform ${args[0]} failed: ${detail}`)
  }
}

function sha(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function build(model) {
  const master = join(SRC, model.master)
  if (!existsSync(master)) {
    fail(`missing master media-src/${model.master}. The masters are not committed; copy it into media-src/ first.`)
  }
  const out = join(OUT, model.out)
  if (existsSync(out) && !force) {
    console.log(`models: ${model.id} is built (public/models/${model.out}, sha256 ${sha(out)}); --force rebuilds it`)
    return
  }
  mkdirSync(dirname(out), { recursive: true })
  const work = mkdtempSync(join(tmpdir(), `umbrista-${model.id}-`))
  try {
    const tidy = join(work, '1-tidy.glb')
    const sized = join(work, '2-sized.glb')
    const textured = join(work, '3-colour.glb')
    const webp = join(work, '4-webp.glb')
    // Dedupe, prune and weld; geometry is kept as modelled unless the entry asks for
    // simplification, and compression is left to the steps below so each has its own settings.
    const simplify = model.simplify
      ? ['--simplify', 'true', '--simplify-ratio', String(model.simplify.ratio), '--simplify-error', String(model.simplify.error)]
      : ['--simplify', 'false']
    transform([
      'optimize', master, tidy,
      '--compress', 'false',
      '--texture-compress', 'false',
      ...simplify,
      '--palette', 'false',
      '--instance', 'false',
    ])
    // Resize only below the masters' own size. optimize's --texture-size acts only when optimize
    // itself compresses the textures, and this step re-encodes every image, so at full size it is
    // skipped and the images reach WebP untouched.
    let textures = tidy
    if (model.textureSize < MASTER_TEXTURE_SIZE) {
      transform(['resize', tidy, sized, '--width', String(model.textureSize), '--height', String(model.textureSize)])
      textures = sized
    }
    transform(['webp', textures, textured, '--slots', '{baseColorTexture,emissiveTexture,metallicRoughnessTexture}', '--quality', String(WEBP_QUALITY), '--effort', '100'])
    transform(['webp', textured, webp, '--slots', 'normalTexture', '--quality', String(NORMAL_QUALITY), '--effort', '100'])
    transform(['meshopt', webp, out, '--level', 'high', '--quantize-texcoord', String(TEXCOORD_BITS)])
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
  const bytes = statSync(out).size
  console.log(`models: ${model.id} → public/models/${model.out} (${(bytes / 1e6).toFixed(2)} MB, sha256 ${sha(out)})`)
  if (bytes > model.budget) fail(`${model.id} is ${bytes} bytes, over its budget of ${model.budget}`)
}

const unknown = names.filter((name) => !MODELS.some((model) => model.id === name))
if (unknown.length > 0) fail(`no model named ${unknown.join(', ')}. The names are: ${MODELS.map((model) => model.id).join(', ')}`)
const chosen = names.length === 0 ? MODELS : MODELS.filter((model) => names.some((name) => model.id === name || model.id === `${name}-lite`))

for (const model of chosen) build(model)
