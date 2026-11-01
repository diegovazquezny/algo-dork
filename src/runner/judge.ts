import type { CaseResult, Submission } from '#/domain/progress'
import { deepEqual } from '#/lib/deep-equal'
import type { RawCaseResult } from './execute'
import type { RunnerCase } from './types'

export function judgeCase(
  c: RunnerCase,
  raw: RawCaseResult | undefined,
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
    passed: c.hasExpected ? deepEqual(raw.actual, c.expected) : null,
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
