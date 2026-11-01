import {
  GraphNode,
  ListNode,
  TreeNode,
  decodeValue,
  encodeValue,
  graphNodes,
} from './structures'
import { LOG_CAP_CHARS } from './types'
import type { ExecutionSpec, LogEntry, LogLevel } from './types'

export type RawCaseResult =
  { ok: true; actual: unknown } | { ok: false; error: string }

/** Turns console arguments into a single display string. */
export function formatLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack || `${a.name}: ${a.message}`
      if (a === undefined) return 'undefined'
      if (typeof a === 'function') return `[Function ${a.name || 'anonymous'}]`
      try {
        // JSON.stringify returns undefined at runtime for symbols, despite its typings.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

const errText = (e: unknown) =>
  e instanceof Error ? `${e.name}: ${e.message}` : String(e)

type Callable = (...a: unknown[]) => unknown

async function runOne(
  spec: ExecutionSpec,
  fns: Callable[],
  input: unknown[],
): Promise<unknown> {
  const cloned = structuredClone(input)
  const decode = (i: number, v: unknown) =>
    decodeValue(spec.params[i] ?? 'json', v)

  if (spec.kind === 'class') {
    const [ops, argLists] = cloned as [string[], unknown[][]]
    const Cls = fns[0] as unknown as new (
      ...a: unknown[]
    ) => Record<string, unknown>
    const obj = new Cls(...(argLists[0] ?? []))
    const out: unknown[] = [null]
    for (let i = 1; i < ops.length; i++) {
      const method = obj[ops[i]]
      if (typeof method !== 'function')
        throw new Error(`${spec.name} has no method "${ops[i]}".`)
      const r = await (method as Callable).apply(obj, argLists[i] ?? [])
      out.push(r === undefined ? null : toJsonValue(r))
    }
    return out
  }

  if (spec.kind === 'roundtrip') {
    const value = decode(0, cloned[0])
    const encoded = await fns[0](value)
    if (typeof encoded !== 'string')
      throw new Error(`${spec.name} must return a string.`)
    const decoded = await fns[1](encoded)
    return encodeValue(spec.returns, decoded)
  }

  const args = cloned.map((v, i) => decode(i, v))
  const inputNodes = spec.requiresCopy
    ? new Set(
        args.flatMap((a) => (a instanceof GraphNode ? graphNodes(a) : [])),
      )
    : null
  const result = await fns[0](...args)
  if (spec.returns === 'inplace') {
    return encodeValue(
      spec.params[spec.inplaceArg] ?? 'json',
      args[spec.inplaceArg],
    )
  }
  if (inputNodes && result instanceof GraphNode) {
    if (graphNodes(result).some((n) => inputNodes.has(n)))
      throw new Error(
        'You must return a deep copy; found a node from the original graph.',
      )
  }
  return encodeValue(spec.returns, result)
}

/**
 * Runs the user's code (an already-transpiled script `js`) against each input, as
 * described by `spec`. Environment-agnostic so it can run inside a Web Worker or
 * directly in tests. `console` and the data structure classes are injected as
 * parameters of a wrapper function rather than patched onto globals; the user's
 * script runs in a nested function so it may even redeclare e.g. `ListNode`.
 */
export async function executeCases(
  js: string,
  spec: ExecutionSpec,
  inputs: unknown[][],
  hooks: {
    onLog: (entry: LogEntry) => void
    onCase: (index: number, result: RawCaseResult) => void
  },
): Promise<void> {
  let current = 0
  let used = 0
  let truncated = false

  const emit =
    (level: LogLevel) =>
    (...args: unknown[]) => {
      if (truncated) return
      let text = formatLogArgs(args)
      if (used + text.length > LOG_CAP_CHARS) {
        text =
          text.slice(0, Math.max(0, LOG_CAP_CHARS - used)) +
          '\n… output truncated'
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

  const names =
    spec.kind === 'roundtrip'
      ? [spec.name, spec.decoderName ?? '']
      : [spec.name]
  const failAll = (error: string) =>
    inputs.forEach((_, i) => hooks.onCase(i, { ok: false, error }))

  let fns: Callable[]
  try {
    const lookups = names
      .map((n) => `typeof ${n} === 'function' ? ${n} : undefined`)
      .join(', ')
    const factory = new Function(
      'console',
      'ListNode',
      'TreeNode',
      'GraphNode',
      `return (function () {\n${js}\n;return [${lookups}]\n})()`,
    )
    fns = factory(fakeConsole, ListNode, TreeNode, GraphNode) as Callable[]
  } catch (e) {
    failAll(errText(e))
    return
  }
  const missing = names.findIndex((_, i) => typeof fns[i] !== 'function')
  if (missing !== -1) {
    failAll(
      `${spec.kind === 'class' ? 'Class' : 'Function'} "${names[missing]}" is not defined.`,
    )
    return
  }

  for (let i = 0; i < inputs.length; i++) {
    current = i
    try {
      const actual = await runOne(spec, fns, inputs[i])
      hooks.onCase(i, { ok: true, actual: toJsonValue(actual) })
    } catch (e) {
      hooks.onCase(i, { ok: false, error: errText(e) })
    }
  }
}
