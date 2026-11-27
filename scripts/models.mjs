// Builds the web copies of the 3D models in public/models/ from the local masters in media-src/.
// Masters are never committed; the compressed models are.
//
//   npm run models              build what is missing
//   npm run models -- --force   rebuild everything (after replacing a master or changing a setting)
//
// Every model goes through the same steps with @gltf-transform/cli: tidy (dedupe, prune, weld,
// resize the textures), WebP textures, then meshopt geometry. The page decodes meshopt with three's
// own decoder, bundled with the site: nothing is fetched from another origin. The steps are
// deterministic, so a rebuild with --force gives the same bytes and `git status` stays clean.
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

/**
 * The models. `master` is the file in media-src/, `out` the path under public/models/.
 * `textureSize` caps every texture's longest side; `budget` is the most the output may weigh, in
 * bytes (the media rules: the cup about 2 MB or less, each drink about 1.5 MB or less).
 */
const MODELS = [{ id: 'cup', master: 'cup.glb', out: 'cup.glb', textureSize: 2048, budget: 2_000_000 }]

// WebP quality for colour-like textures, and for the normal map, whose small errors show as bumps.
const WEBP_QUALITY = 86
const NORMAL_QUALITY = 94
// Texture coordinates keep 14 bits: a 2048 px atlas then lands within a quarter of a texel.
const TEXCOORD_BITS = 14

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
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' })
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
    const textured = join(work, '2-colour.glb')
    const webp = join(work, '3-webp.glb')
    // Dedupe, prune, weld and resize; geometry is kept as modelled (no simplification), and
    // compression is left to the steps below so each has its own settings.
    transform([
      'optimize', master, tidy,
      '--compress', 'false',
      '--texture-compress', 'false',
      '--texture-size', String(model.textureSize),
      '--simplify', 'false',
      '--palette', 'false',
      '--instance', 'false',
    ])
    transform(['webp', tidy, textured, '--slots', '{baseColorTexture,emissiveTexture,metallicRoughnessTexture}', '--quality', String(WEBP_QUALITY), '--effort', '100'])
    transform(['webp', textured, webp, '--slots', 'normalTexture', '--quality', String(NORMAL_QUALITY), '--effort', '100'])
    transform(['meshopt', webp, out, '--level', 'high', '--quantize-texcoord', String(TEXCOORD_BITS)])
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
  const bytes = statSync(out).size
  console.log(`models: ${model.id} → public/models/${model.out} (${(bytes / 1e6).toFixed(2)} MB, sha256 ${sha(out)})`)
  if (bytes > model.budget) fail(`${model.id} is ${bytes} bytes, over its budget of ${model.budget}`)
}

for (const model of MODELS) build(model)
