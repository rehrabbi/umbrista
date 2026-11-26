import { afterEach, beforeEach } from 'vitest'

type Callback = (entries: IntersectionObserverEntry[]) => void

const observers = new Set<FakeObserver>()

class FakeObserver {
  readonly targets = new Set<Element>()
  constructor(readonly callback: Callback) {
    observers.add(this)
  }
  observe(target: Element): void {
    this.targets.add(target)
  }
  unobserve(target: Element): void {
    this.targets.delete(target)
  }
  disconnect(): void {
    this.targets.clear()
    observers.delete(this)
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

/** Tell every observer watching `target` whether it is on screen. Wrap the call in `act`. */
export function setIntersecting(target: Element, isIntersecting: boolean): void {
  for (const observer of observers) {
    if (!observer.targets.has(target)) continue
    observer.callback([{ target, isIntersecting } as unknown as IntersectionObserverEntry])
  }
}

/** Replace IntersectionObserver (jsdom has none) with one the test drives through `setIntersecting`. */
export function useFakeIntersectionObserver(): void {
  beforeEach(() => {
    observers.clear()
    window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver
  })
  afterEach(() => {
    observers.clear()
  })
}
