/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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

export default defineConfig({
  plugins: [react(), preloadFirstScreenFonts()],
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
