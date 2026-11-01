import type { CaseResult } from '#/domain/progress'

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export type LogEntry = { level: LogLevel; text: string; caseIndex: number }

export type RunnerCase = {
  input: unknown[]
  /** Absent for custom cases: output is shown but not judged. */
  expected?: unknown
  hasExpected: boolean
  hidden?: boolean
  /** User-authored case (Run only). */
  custom?: boolean
}

export type RunStatus = 'ok' | 'compile-error' | 'time-limit'

export type RunResult = {
  status: RunStatus
  /** Present when status === 'compile-error'. */
  compileError?: string
  cases: CaseResult[]
  logs: LogEntry[]
  runtimeMs: number
}

export type Comparison = 'exact' | 'unordered' | 'unordered-deep'

/** How to invoke the user's code for one question. */
export type ExecutionSpec = {
  /** function: call `name(...input)`; class: LeetCode-style [ops, args]; roundtrip: decode(encode(x)). */
  kind: 'function' | 'class' | 'roundtrip'
  /** Function name, class name, or (roundtrip) the encoder's name. */
  name: string
  /** Roundtrip only: the decoder's name. */
  decoderName?: string
  /** Parameter types, see structures.ts. Missing entries are plain JSON. */
  params: string[]
  /** Return type, or 'inplace' to compare the (mutated) argument `inplaceArg`. */
  returns: string
  inplaceArg: number
  /** Require the returned graph to share no nodes with the input. */
  requiresCopy: boolean
}

export function simpleSpec(name: string): ExecutionSpec {
  return {
    kind: 'function',
    name,
    params: [],
    returns: 'json',
    inplaceArg: 0,
    requiresCopy: false,
  }
}

export type RunArgs = {
  code: string
  spec: ExecutionSpec
  comparison?: Comparison
  cases: RunnerCase[]
  timeoutMs?: number
}

export type FormatOptions = { tabSize: number }

/**
 * Extension point for new languages. Implement this (e.g. Python via Pyodide, or a
 * remote runner) and register it in `runners/index.ts`; the UI only uses this interface.
 */
export interface LanguageRunner {
  readonly id: string
  readonly label: string
  readonly monacoLanguage: string
  run: (args: RunArgs) => Promise<RunResult>
  format: (code: string, options: FormatOptions) => Promise<string>
}

export const DEFAULT_TIMEOUT_MS = 5000
export const LOG_CAP_CHARS = 10_000
