import { MEDIA, type StillName } from './manifest'
import { srcSet } from './srcset'

export interface PictureProps {
  name: StillName
  /** Describes the image. An empty string marks it as decoration. */
  alt: string
  /** The LCP image: loads eagerly at high priority. Everything else is lazy. */
  priority?: boolean
  sizes?: string
  className?: string
}

/**
 * A still from public/media, as responsive AVIF with a WebP fallback. The widths come from the
 * generated manifest; width and height come from the aspect ratio, so the layout never shifts.
 */
export function Picture({ name, alt, priority = false, sizes = '100vw', className }: PictureProps) {
  const { widths, aspect } = MEDIA[name]
  const largest = Math.max(...widths)
  const height = Math.round((largest * aspect[1]) / aspect[0])
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(name, widths, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(name, widths, 'webp')} sizes={sizes} />
      <img
        src={`/media/${name}-${largest}.webp`}
        width={largest}
        height={height}
        alt={alt}
        className={className}
        // The first screen's image is decoded as soon as it arrives; the rest off the main path.
        decoding={priority ? undefined : 'async'}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
    </picture>
  )
}
