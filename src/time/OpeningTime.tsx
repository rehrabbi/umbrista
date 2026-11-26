import { CAFE, cafeNight, openingWindow } from '../../shared/hours'
import { useNow } from './useNow'

function cafeClock(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAFE.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
}

/** When the café opens or closes, always in café time, always 24-hour. */
export function OpeningTime({ className }: { className?: string }) {
  const now = useNow()
  const { opens, closes } = openingWindow(cafeNight(now))
  const open = now.getTime() >= opens.getTime()
  return (
    <p className={className}>
      {open ? (
        <>
          Open now, until <time dateTime={closes.toISOString()}>{cafeClock(closes)}</time> café time
        </>
      ) : (
        <>
          Opens tonight at <time dateTime={opens.toISOString()}>{cafeClock(opens)}</time> café time
        </>
      )}
    </p>
  )
}
