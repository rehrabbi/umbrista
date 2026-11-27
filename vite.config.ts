/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { MEDIA } from './src/media/manifest'
import { srcSet } from './src/media/srcset'

/**
 * Preloads the fonts every page's first screen sets (the display face for headings, and the text
 * face's regular and bold), so they arrive with the script instead of after the first layout. A
 * font that swaps in after the page has drawn reflows its text, and the landing's large title moved
 * by enough to count as a layout shift. Build only: the file names carry content hashes.
 */
function preloadFirstScreenFonts(): Plugin {
  const FIRST_SCREEN = [
    /big-shoulders-display-latin-800-normal-[\w-]+\.woff2$/,
    /atkinson-hyperlegible-next-latin-400-normal-[\w-]+\.woff2$/,
    /atkinson-hyperlegible-next-latin-700-normal-[\w-]+\.woff2$/,
  ]
  return {
    name: 'umbrista:preload-first-screen-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const files = Object.keys(context.bundle ?? {}).filter((file) => FIRST_SCREEN.some((font) => font.test(file)))
        return files.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

/** The landing hero's poster: the page's largest image, and the one it is judged by. */
const HERO_POSTER = 'steam-loop-poster'

/**
 * Preloads the landing hero's poster from the HTML, so the browser starts on it at once instead of
 * after the app's script has run and rendered the `<picture>`. Only on `/`: index.html serves every
 * route, so a tiny script in the head adds the preload when the path is the landing's. Its srcset
 * and sizes are the picture's own AVIF source, so the same file is used, not a second one.
 * A Content Security Policy must allow this one inline script by its sha256 hash.
 */
function preloadHeroPoster(): Plugin {
  const link = {
    rel: 'preload',
    as: 'image',
    type: 'image/avif',
    imagesrcset: srcSet(HERO_POSTER, MEDIA[HERO_POSTER].widths, 'avif'),
    imagesizes: '100vw',
    fetchpriority: 'high',
  }
  const script = `if(location.pathname==='/'){var l=document.createElement('link');${Object.entries(link)
    .map(([key, value]) => `l.setAttribute(${JSON.stringify(key)},${JSON.stringify(value)});`)
    .join('')}document.head.appendChild(l)}`
  return {
    name: 'umbrista:preload-hero-poster',
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'script', children: script, injectTo: 'head-prepend' as const }],
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadFirstScreenFonts(), preloadHeroPoster()],
  build: {
    // The 3D canvas (three and R3F) is one lazy chunk of about 900 kB, loaded after first paint.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
