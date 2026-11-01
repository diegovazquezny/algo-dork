import { describe, expect, it } from 'vitest'
import { firstFailure, parseCustomExpected, parseCustomInput } from './outcome'

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

  it('parses optional custom expected values', () => {
    expect(parseCustomExpected(undefined)).toEqual({
      ok: true,
      hasExpected: false,
    })
    expect(parseCustomExpected('  ')).toEqual({ ok: true, hasExpected: false })
    expect(parseCustomExpected('[0,1]')).toEqual({
      ok: true,
      hasExpected: true,
      expected: [0, 1],
    })
    expect(parseCustomExpected('null')).toEqual({
      ok: true,
      hasExpected: true,
      expected: null,
    })
    expect(parseCustomExpected('[0,').ok).toBe(false)
  })
})
