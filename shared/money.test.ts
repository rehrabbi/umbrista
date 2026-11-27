import { describe, expect, it } from 'vitest'
import { formatPrice, formatTotal } from './money'

describe('formatPrice', () => {
  it('writes the number only, with two decimals, as on the brand board', () => {
    expect(formatPrice(460)).toBe('4.60')
    expect(formatPrice(280)).toBe('2.80')
    expect(formatPrice(540)).toBe('5.40')
  })

  it('keeps the leading zero and the trailing zeros', () => {
    expect(formatPrice(0)).toBe('0.00')
    expect(formatPrice(5)).toBe('0.05')
    expect(formatPrice(1000)).toBe('10.00')
  })

  it('never groups thousands, so a total stays one plain number', () => {
    expect(formatPrice(123456)).toBe('1234.56')
  })

  it('refuses an amount that is not a whole, non-negative number of hundredths', () => {
    expect(() => formatPrice(-10)).toThrow(RangeError)
    expect(() => formatPrice(4.6)).toThrow(RangeError)
    expect(() => formatPrice(Number.NaN)).toThrow(RangeError)
  })
})

describe('formatTotal', () => {
  it('writes the number and the word, as totals and confirmations do', () => {
    expect(formatTotal(1910)).toBe('19.10 crowns')
    expect(formatTotal(0)).toBe('0.00 crowns')
  })
})
