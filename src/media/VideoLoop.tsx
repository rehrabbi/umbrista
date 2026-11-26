import { useCallback } from 'react'
import { MEDIA, type LoopName, type StillName } from './manifest'
import { Picture } from './Picture'
import { useMaxWidth, usePrefersReducedMotion } from './usePrefersReducedMotion'
import './VideoLoop.css'

/** Below this viewport width the 1280 px pair is used. */
const SMALL_VIEWPORT = 900

export interface VideoLoopProps {
  name: LoopName
  /** Describes the loop. Without it the loop is decoration and hidden from assistive technology. */
  label?: string
  className?: string
}

/**
 * A silent looping video. It loads nothing until it is on screen, plays only while on screen, and
 * under reduced motion is just its poster (no video element at all).
 */
export function VideoLoop({ name, label, className }: VideoLoopProps) {
  const reduced = usePrefersReducedMotion()
  const small = useMaxWidth(SMALL_VIEWPORT)
  const loop = MEDIA[name]
  const classes = ['video-loop', className].filter(Boolean).join(' ')

  // A callback ref, so the observer follows the element when it is replaced (viewport size change).
  const watch = useCallback((video: HTMLVideoElement | null) => {
    if (!video || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      if (entry.isIntersecting) {
        // A browser may refuse to play (data saver, power saving). The poster simply stays.
        try {
          video.play()?.catch(() => {})
        } catch {
          // play() can throw synchronously where media is unsupported.
        }
      } else {
        video.pause()
      }
    })
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  if (reduced) {
    return <Picture name={loop.poster as StillName} alt={label ?? ''} className={classes} />
  }

  const width = small ? Math.min(...loop.widths) : Math.max(...loop.widths)
  const height = Math.round((width * loop.aspect[1]) / loop.aspect[0])
  const labelled = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }

  return (
    <video
      key={width}
      ref={watch}
      className={classes}
      width={width}
      height={height}
      poster={`/media/${loop.poster}-${width}.webp`}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      {...labelled}
    >
      <source src={`/media/${name}-${width}.webm`} type="video/webm" />
      <source src={`/media/${name}-${width}.mp4`} type="video/mp4" />
    </video>
  )
}
