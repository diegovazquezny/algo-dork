import { LOG_CAP_CHARS, type LogEntry, type LogLevel } from './types'

export type RawCaseResult = { ok: true; actual: unknown } | { ok: false; error: string }

/** Turns console arguments into a single display string. */
export function formatLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack ?? `${a.name}: ${a.message}`
      if (a === undefined) return 'undefined'
      if (typeof a === 'function') return `[Function ${a.name || 'anonymous'}]`
      try {
        return JSON.stringify(a) ?? String(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

/** Makes a value safe to structured-clone and compare as JSON. */
export function toJsonValue(value: unknown): unknown {
  if (value === undefined) return undefined
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

/**
 * Runs `functionName` (defined by the already-transpiled script `js`) against each input.
 * Environment-agnostic so it can run inside a Web Worker or directly in tests.
 * The user's `console` is injected as a parameter instead of patching globals.
 */
export async function executeCases(
  js: string,
  functionName: string,
  inputs: unknown[][],
  hooks: {
    onLog: (entry: LogEntry) => void
    onCase: (index: number, result: RawCaseResult) => void
  },
): Promise<void> {
  let current = 0
  let used = 0
  let truncated = false

  const emit = (level: LogLevel) => (...args: unknown[]) => {
    if (truncated) return
    let text = formatLogArgs(args)
    if (used + text.length > LOG_CAP_CHARS) {
      text = text.slice(0, Math.max(0, LOG_CAP_CHARS - used)) + '\n… output truncated'
      truncated = true
    }
    used += text.length
    hooks.onLog({ level, text, caseIndex: current })
  }
  const fakeConsole = {
    log: emit('log'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    debug: emit('debug'),
  }

  let fn: unknown
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(
      'console',
      `${js}\n;return typeof ${functionName} === 'function' ? ${functionName} : undefined`,
    )
    fn = factory(fakeConsole)
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    inputs.forEach((_, i) => hooks.onCase(i, { ok: false, error }))
    return
  }
  if (typeof fn !== 'function') {
    const error = `Function "${functionName}" is not defined.`
    inputs.forEach((_, i) => hooks.onCase(i, { ok: false, error }))
    return
  }

  for (let i = 0; i < inputs.length; i++) {
    current = i
    try {
      const actual = await (fn as (...a: unknown[]) => unknown)(...structuredClone(inputs[i]))
      hooks.onCase(i, { ok: true, actual: toJsonValue(actual) })
    } catch (e) {
      hooks.onCase(i, {
        ok: false,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      })
    }
  }
}
