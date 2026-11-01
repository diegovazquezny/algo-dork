import type { CaseResult } from '#/domain/progress'

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export type LogEntry = { level: LogLevel; text: string; caseIndex: number }

export type RunnerCase = {
  input: unknown[]
  /** Absent for custom cases: output is shown but not judged. */
  expected?: unknown
  hasExpected: boolean
  hidden?: boolean
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

export type RunArgs = {
  code: string
  functionName: string
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
  run(args: RunArgs): Promise<RunResult>
  format(code: string, options: FormatOptions): Promise<string>
}

export const DEFAULT_TIMEOUT_MS = 5000
export const LOG_CAP_CHARS = 10_000
