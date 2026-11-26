import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import './Field.css'

interface FieldBase {
  label: string
  hint?: string
  /** An error message in plain words: what went wrong and how to fix it. */
  error?: string
}

type InputFieldProps = FieldBase & InputHTMLAttributes<HTMLInputElement> & { multiline?: false }
type TextareaFieldProps = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true }

export type FieldProps = InputFieldProps | TextareaFieldProps

export function Field(props: FieldProps) {
  const { label, hint, error, multiline, id: givenId, className, ...rest } = props
  const generated = useId()
  const id = givenId ?? generated
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId, rest['aria-describedby']].filter(Boolean).join(' ') || undefined
  const shared = {
    id,
    className: 'field-control',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  } as const

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...shared} />
      ) : (
        <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...shared} />
      )}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
