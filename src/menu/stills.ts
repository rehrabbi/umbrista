import type { MenuItem } from '../../shared/menu'
import { MEDIA, type StillName } from '../media/manifest'

/** An item's photograph, if it has one in the media manifest. */
export function stillOf(item: MenuItem): StillName | undefined {
  const name = item.still
  if (name === undefined || !(name in MEDIA)) return undefined
  return MEDIA[name as keyof typeof MEDIA].kind === 'still' ? (name as StillName) : undefined
}
