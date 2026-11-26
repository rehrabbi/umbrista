import type { Page } from '@playwright/test'

type Tier = 'low' | 'mid' | 'high'

/*
 * CI's headless Chromium only has software WebGL (SwiftShader), which the site refuses: a real
 * visitor on a software renderer gets the photograph alone. Tests of the canvas opt back in through
 * SceneHost's test-only window flags, set before the page's own scripts run.
 */
export async function allowSoftwareGL(page: Page, tier?: Tier): Promise<void> {
  await page.addInitScript((forced) => {
    const hooks = window as Window & { umbristaTestAllowSoftwareGL?: boolean; umbristaTestTier?: string }
    hooks.umbristaTestAllowSoftwareGL = true
    if (forced) hooks.umbristaTestTier = forced
  }, tier)
}
