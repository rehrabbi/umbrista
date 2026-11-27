/**
 * A still's `srcset` for one format, from its widths: the one place it is spelled, so the hero's
 * preload in index.html (vite.config.ts) and the page's `<picture>` ask for exactly the same files.
 */
export function srcSet(name: string, widths: readonly number[], ext: 'avif' | 'webp'): string {
  return widths.map((w) => `/media/${name}-${w}.${ext} ${w}w`).join(', ')
}
