import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary'

/** The class names of a button, for a link that must look like one. */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return ['btn', `btn-${variant}`, className].filter(Boolean).join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Work is in progress: the button stays in the tab order but ignores clicks and says it is busy. */
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, className, type = 'button', onClick, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClasses(variant, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
    >
      {children}
    </button>
  )
}
