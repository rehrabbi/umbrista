// Renders the hero cup's still from the cup model itself, into media-src/cup-still.png (a 1280 px
// square with a transparent background). `npm run media` then makes its web copies.
//
//   npm run cup-still
//
// It needs a real GPU: the browser is asked for one, and the scene refuses nothing here, but a
// software renderer draws a poorer cup. Run it after changing the cup's scene, then `npm run media
// -- --force` (or delete the old public/media/cup-still-* files first).

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(root, 'media-src', 'cup-still.png')
const SIZE = 1280

const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), server: { port: 5198, strictPort: true }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] })
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5198/scripts/cup-still/index.html')
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 60_000 })
  // A few more frames, so every texture is on the GPU and the shadows have settled.
  await page.waitForTimeout(1500)
  mkdirSync(dirname(OUT), { recursive: true })
  await page.locator('canvas').screenshot({ path: OUT, omitBackground: true })
  console.log(`cup-still: wrote media-src/cup-still.png (${SIZE} px)`)
} finally {
  await browser.close()
  await server.close()
}
