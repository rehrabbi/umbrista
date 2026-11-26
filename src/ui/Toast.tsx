import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribe } from './toast-store'
import './Toast.css'

/**
 * The two live regions are always in the page, so a message added later is announced:
 * polite for info and success, assertive for errors.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getToasts, getToasts)
  const polite = items.filter((item) => item.kind !== 'error')
  const errors = items.filter((item) => item.kind === 'error')

  return (
    <div className="toaster">
      <div role="status" className="toast-region">
        {polite.map((item) => (
          <p key={item.id} className={`toast toast-${item.kind}`}>
            {item.message}
          </p>
        ))}
      </div>
      <div role="alert" className="toast-region">
        {errors.map((item) => (
          <div key={item.id} className="toast toast-error">
            <p>{item.message}</p>
            <button type="button" className="toast-close" onClick={() => dismissToast(item.id)}>
              Close
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
