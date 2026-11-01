import { describe, expect, it } from 'vitest'
import { firstFailure, parseCustomInput } from './outcome'

describe('outcome helpers', () => {
  it('parses custom input', () => {
    expect(parseCustomInput('[[1,2],3]')).toEqual({
      ok: true,
      input: [[1, 2], 3],
    })
    expect(parseCustomInput('3').ok).toBe(false)
    expect(parseCustomInput('[1,').ok).toBe(false)
  })
  it('finds first failing case, ignoring custom (null) cases', () => {
    expect(
      firstFailure([
        { input: [], passed: true },
        { input: [], passed: null },
        { input: [], passed: false },
      ]),
    ).toBe(2)
    expect(firstFailure([{ input: [], passed: true }])).toBe(-1)
  })
})
