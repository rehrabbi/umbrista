import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setIntersecting, useFakeIntersectionObserver } from '../test/intersection'
import { changeMatchMedia, setMatchMedia } from '../test/setup'
import { VideoLoop } from './VideoLoop'

const REDUCED = '(prefers-reduced-motion: reduce)'
const SMALL = '(max-width: 899px)'

let play: ReturnType<typeof vi.fn>
let pause: ReturnType<typeof vi.fn>

useFakeIntersectionObserver()

beforeEach(() => {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement['play']
  HTMLMediaElement.prototype.pause = pause as unknown as HTMLMediaElement['pause']
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('VideoLoop', () => {
  it('renders a muted, looping, inline video that waits to load, with WebM before MP4', () => {
    const { container } = render(<VideoLoop name="steam-loop" />)
    const video = container.querySelector('video')!
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).not.toHaveAttribute('autoplay')
    const sources = [...video.querySelectorAll('source')]
    expect(sources.map((s) => s.type)).toEqual(['video/webm', 'video/mp4'])
    expect(sources[0]).toHaveAttribute('src', '/media/steam-loop-1920.webm')
    act(() => setIntersecting(video, true))
    expect(video).toHaveAttribute('poster', '/media/steam-loop-poster-1920.webp')
  })

  it('asks for its poster only as it nears the screen, so it never competes with the first screen', () => {
    const { container } = render(<VideoLoop name="steam-loop" />)
    const video = container.querySelector('video')!
    expect(video).not.toHaveAttribute('poster')
    act(() => setIntersecting(video, true))
    expect(video).toHaveAttribute('poster', '/media/steam-loop-poster-1920.webp')
    // Once asked for, it stays: scrolling away does not drop it.
    act(() => setIntersecting(video, false))
    expect(video).toHaveAttribute('poster', '/media/steam-loop-poster-1920.webp')
  })

  it('picks the smaller pair below 900 px of viewport width', () => {
    setMatchMedia(SMALL, true)
    const { container } = render(<VideoLoop name="steam-loop" />)
    const video = container.querySelector('video')!
    expect(video.querySelector('source')).toHaveAttribute('src', '/media/steam-loop-1280.webm')
    act(() => setIntersecting(video, true))
    expect(video).toHaveAttribute('poster', '/media/steam-loop-poster-1280.webp')
  })

  it('is hidden from assistive tech when decorative, and labelled when it has a label', () => {
    const { container, rerender } = render(<VideoLoop name="steam-loop" />)
    expect(container.querySelector('video')).toHaveAttribute('aria-hidden', 'true')
    rerender(<VideoLoop name="steam-loop" label="Steam rising from a cup" />)
    const video = container.querySelector('video')!
    expect(video).not.toHaveAttribute('aria-hidden')
    expect(video).toHaveAttribute('aria-label', 'Steam rising from a cup')
    expect(video).toHaveAttribute('role', 'img')
  })

  it('plays only while it is on screen', () => {
    const { container } = render(<VideoLoop name="steam-loop" />)
    const video = container.querySelector('video')!
    expect(play).not.toHaveBeenCalled()
    act(() => setIntersecting(video, true))
    expect(play).toHaveBeenCalledTimes(1)
    act(() => setIntersecting(video, false))
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('ignores a rejected play() promise', async () => {
    play.mockImplementation(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')))
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const { container } = render(<VideoLoop name="steam-loop" />)
    act(() => setIntersecting(container.querySelector('video')!, true))
    await new Promise((resolve) => setTimeout(resolve, 10))
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('renders only the poster, with no video element, under reduced motion', () => {
    setMatchMedia(REDUCED, true)
    const { container } = render(<VideoLoop name="steam-loop" label="Steam rising" />)
    expect(container.querySelector('video')).toBeNull()
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', '/media/steam-loop-poster-1920.webp')
    expect(img).toHaveAttribute('alt', 'Steam rising')
    expect(play).not.toHaveBeenCalled()
  })

  it('sizes the poster to the page column, not the whole viewport', () => {
    setMatchMedia(REDUCED, true)
    const { container } = render(<VideoLoop name="steam-loop" />)
    expect(container.querySelector('source')).toHaveAttribute('sizes', '(min-width: 72rem) 72rem, 100vw')
  })

  it('uses an empty alt for the poster when decorative', () => {
    setMatchMedia(REDUCED, true)
    const { container } = render(<VideoLoop name="steam-loop" />)
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('follows a reduced-motion change during a visit', () => {
    const { container } = render(<VideoLoop name="steam-loop" />)
    expect(container.querySelector('video')).not.toBeNull()
    act(() => changeMatchMedia(REDUCED, true))
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
    act(() => changeMatchMedia(REDUCED, false))
    expect(container.querySelector('video')).not.toBeNull()
  })
})
