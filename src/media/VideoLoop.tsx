import { useCallback, useState } from 'react'
import { MEDIA, type LoopName, type StillName } from './manifest'
import { Picture } from './Picture'
import { useMaxWidth, usePrefersReducedMotion } from './usePrefersReducedMotion'
import './VideoLoop.css'

/** The loop fills the 72rem page column, so a wide screen never needs more than that. */
const POSTER_SIZES = '(min-width: 72rem) 72rem, 100vw'

/** The poster is asked for once the loop is within this distance of the screen. */
const NEAR = '100% 0px'

/** Below this viewport width the 1280 px pair is used. */
const SMALL_VIEWPORT = 900

export interface VideoLoopProps {
  name: LoopName
  /** Describes the loop. Without it the loop is decoration and hidden from assistive technology. */
  label?: string
  className?: string
  /**
   * Show the loop's own poster until it plays (the default). Off when the page already draws the
   * same frame underneath, as the hero does, so it is not downloaded twice.
   */
  poster?: boolean
}

/**
 * A silent looping video. It loads nothing until it is near the screen (not even its poster, which
 * would otherwise compete with the first screen's image), plays only while on screen, and under
 * reduced motion is just its poster (no video element at all).
 */
export function VideoLoop({ name, label, className, poster = true }: VideoLoopProps) {
  const reduced = usePrefersReducedMotion()
  const small = useMaxWidth(SMALL_VIEWPORT)
  const loop = MEDIA[name]
  const classes = ['video-loop', className].filter(Boolean).join(' ')
  const [near, setNear] = useState(false)
  const [playing, setPlaying] = useState(false)

  // A callback ref, so the observer follows the element when it is replaced (viewport size change).
  const watch = useCallback((video: HTMLVideoElement | null) => {
    if (!video || typeof IntersectionObserver === 'undefined') return
    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setNear(true)
        nearby.disconnect()
      },
      { rootMargin: NEAR },
    )
    nearby.observe(video)
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
    return () => {
      nearby.disconnect()
      observer.disconnect()
    }
  }, [])

  if (reduced) {
    return (
      <Picture
        name={loop.poster as StillName}
        alt={label ?? ''}
        className={classes}
        sizes={POSTER_SIZES}
      />
    )
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
      poster={near && poster ? `/media/${loop.poster}-${width}.webp` : undefined}
      data-playing={playing ? '' : undefined}
      onPlaying={() => setPlaying(true)}
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
