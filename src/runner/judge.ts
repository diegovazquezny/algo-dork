import type { CaseResult, Submission } from '#/domain/progress'
import { deepEqual } from '#/lib/deep-equal'
import type { RawCaseResult } from './execute'
import type { Comparison, RunnerCase } from './types'

const key = (v: unknown) => JSON.stringify(v)

/** Normalizes order-insensitive answers so they can be compared structurally. */
export function canonicalize(value: unknown, mode: Comparison): unknown {
  if (mode === 'exact' || !Array.isArray(value)) return value
  const inner =
    mode === 'unordered-deep'
      ? value.map((v) => (Array.isArray(v) ? [...v].sort(byKey) : v))
      : value
  return [...inner].sort(byKey)
}

function byKey(a: unknown, b: unknown) {
  const x = key(a)
  const y = key(b)
  return x < y ? -1 : x > y ? 1 : 0
}

export function answersMatch(
  actual: unknown,
  expected: unknown,
  mode: Comparison = 'exact',
): boolean {
  return deepEqual(canonicalize(actual, mode), canonicalize(expected, mode))
}

export function judgeCase(
  c: RunnerCase,
  raw: RawCaseResult | undefined,
  comparison: Comparison = 'exact',
): CaseResult {
  const base = {
    input: c.input,
    hidden: c.hidden,
    custom: c.custom,
    expected: c.hasExpected ? c.expected : undefined,
  }
  if (!raw)
    return {
      ...base,
      passed: c.hasExpected ? false : null,
      error: 'Not executed',
    }
  if (!raw.ok)
    return { ...base, passed: c.hasExpected ? false : null, error: raw.error }
  return {
    ...base,
    actual: raw.actual,
    passed: c.hasExpected
      ? answersMatch(raw.actual, c.expected, comparison)
      : null,
  }
}

export function submissionStatus(
  runStatus: 'ok' | 'compile-error' | 'time-limit',
  cases: CaseResult[],
): Submission['status'] {
  if (runStatus === 'time-limit') return 'time-limit'
  if (
    runStatus === 'compile-error' ||
    cases.some((c) => c.error && c.error !== 'Not executed')
  )
    return 'runtime-error'
  return cases.every((c) => c.passed) ? 'accepted' : 'wrong-answer'
}
