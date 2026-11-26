import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Field } from './Field'
import { Toaster } from './Toast'
import { TOAST_DURATION_MS, clearToasts, toast } from './toast-store'

describe('Button', () => {
  it('is a plain button that does not submit by default', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('says it is busy while loading and ignores clicks', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('can be disabled', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})

describe('Field', () => {
  it('ties the label to the input', () => {
    render(<Field label="Name" />)
    expect(screen.getByLabelText('Name')).toBeInstanceOf(HTMLInputElement)
  })

  it('wires the hint and the error by aria-describedby and marks the input invalid', () => {
    render(<Field label="Party size" hint="Up to eight people." error="Choose a number from 1 to 8." />)
    const input = screen.getByLabelText('Party size')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Up to eight people. Choose a number from 1 to 8.')
  })

  it('is not marked invalid without an error', () => {
    render(<Field label="Name" hint="As on the booking." />)
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
  })

  it('can be a textarea', () => {
    render(<Field label="Note" multiline />)
    expect(screen.getByLabelText('Note').tagName).toBe('TEXTAREA')
  })
})

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    clearToasts()
    vi.useRealTimers()
  })

  it('announces info and success politely and removes them after about five seconds', () => {
    render(<Toaster />)
    act(() => {
      toast('Saved.', { kind: 'success' })
      toast('Heads up.')
    })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Saved.')
    expect(status).toHaveTextContent('Heads up.')

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS + 1)
    })
    expect(status).toBeEmptyDOMElement()
  })

  it('announces errors as alerts that stay until they are closed', async () => {
    vi.useRealTimers()
    render(<Toaster />)
    act(() => {
      toast('That table is taken. Pick another time.', { kind: 'error' })
    })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('That table is taken.')

    vi.useFakeTimers()
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS * 10)
    })
    expect(alert).toHaveTextContent('That table is taken.')

    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(alert).toBeEmptyDOMElement()
  })
})
