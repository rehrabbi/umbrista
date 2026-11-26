import { useNight } from '../time/useNight'
import './NightSwitch.css'

/** Forces the night look; pressing it again goes back to following the visitor's clock. */
export function NightSwitch() {
  const { override, setOverride } = useNight()
  const pressed = override === 'night'
  return (
    <button
      type="button"
      className="night-switch"
      aria-pressed={pressed}
      onClick={() => setOverride(pressed ? null : 'night')}
    >
      See it at night
    </button>
  )
}
