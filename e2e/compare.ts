import type { Page } from '@playwright/test'

/* Pixel comparisons of two screenshots, shared by the canvas tests. */

export interface Comparison {
  /** Mean absolute difference per channel, 0..255. */
  meanDiff: number
  /**
   * Mean absolute difference of the two luminance images after each is normalised to zero mean and
   * unit deviation: a global grade cancels out, a shifted or rescaled photograph does not.
   */
  structureDiff: number
  /** Luminance deviation of the first image, 0..255: near zero when it is blank. */
  deviation: number
}

/** Compares two same-sized PNG screenshots, decoded in the page. */
export async function compare(page: Page, a: Buffer, b: Buffer): Promise<Comparison> {
  return page.evaluate(
    // This function runs in the page, so its helpers live inside it: it cannot reach this module.
    async ([first, second]) => {
      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const pixels = async (base64: string) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob()
        const bitmap = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data
      }
      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const luma = (data: Uint8ClampedArray) => {
        const out = new Float64Array(data.length / 4)
        for (let i = 0; i < out.length; i++) {
          out[i] = 0.2126 * data[i * 4]! + 0.7152 * data[i * 4 + 1]! + 0.0722 * data[i * 4 + 2]!
        }
        let mean = 0
        for (const v of out) mean += v
        mean /= out.length
        let variance = 0
        for (const v of out) variance += (v - mean) ** 2
        return { out, mean, sd: Math.sqrt(variance / out.length) }
      }
      const [pa, pb] = await Promise.all([pixels(first), pixels(second)])
      let diff = 0
      for (let i = 0; i < pa.length; i++) {
        if (i % 4 !== 3) diff += Math.abs(pa[i]! - pb[i]!)
      }
      const la = luma(pa)
      const lb = luma(pb)
      let structure = 0
      for (let i = 0; i < la.out.length; i++) {
        structure += Math.abs((la.out[i]! - la.mean) / la.sd - (lb.out[i]! - lb.mean) / lb.sd)
      }
      return {
        meanDiff: diff / ((pa.length / 4) * 3),
        structureDiff: structure / la.out.length,
        deviation: la.sd,
      }
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}
