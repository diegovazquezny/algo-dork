import type { CaseResult, Submission } from '#/domain/progress'
import type { RunResult } from '#/runner/types'

export type Outcome = {
  kind: 'run' | 'submit'
  result: RunResult
  /** Set for submits. */
  status?: Submission['status']
  /** Message for input problems (e.g. invalid custom-case JSON). */
  inputError?: string
}

export const statusLabel: Record<Submission['status'], string> = {
  accepted: 'Accepted',
  'wrong-answer': 'Wrong Answer',
  'runtime-error': 'Runtime Error',
  'time-limit': 'Time Limit Exceeded',
}

/** Index of the first failing case, which is the only hidden case we reveal. */
export function firstFailure(cases: CaseResult[]): number {
  return cases.findIndex((c) => c.passed === false)
}

/** Parses a custom case typed as a JSON array of arguments. */
export function parseCustomInput(text: string): { ok: true; input: unknown[] } | { ok: false; error: string } {
  try {
    const v = JSON.parse(text)
    if (!Array.isArray(v)) return { ok: false, error: 'Input must be a JSON array of arguments, e.g. [[1,2],3]' }
    return { ok: true, input: v }
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` }
  }
}
