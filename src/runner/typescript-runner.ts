import prettier from 'prettier/standalone'
import * as tsPlugin from 'prettier/plugins/typescript'
import * as estreePlugin from 'prettier/plugins/estree'

import type { RawCaseResult } from './execute'
import { judgeCase } from './judge'
import { DEFAULT_TIMEOUT_MS } from './types'
import type {
  FormatOptions,
  LanguageRunner,
  LogEntry,
  RunArgs,
  RunResult,
} from './types'

export type TranspileResult =
  { ok: true; js: string } | { ok: false; error: string }

export async function transpileTypeScript(
  code: string,
): Promise<TranspileResult> {
  const ts = await import('typescript')
  const out = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
    },
  })
  const errors = (out.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  )
  if (errors.length) {
    const d = errors[0]
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    const pos =
      d.file && d.start !== undefined
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : undefined
    return {
      ok: false,
      error: pos ? `Line ${pos.line + 1}: ${message}` : message,
    }
  }
  return { ok: true, js: out.outputText }
}

export class TypeScriptRunner implements LanguageRunner {
  readonly id = 'typescript'
  readonly label = 'TypeScript'
  readonly monacoLanguage = 'typescript'

  async run({
    code,
    functionName,
    cases,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: RunArgs): Promise<RunResult> {
    const started = performance.now()
    const transpiled = await transpileTypeScript(code)
    if (!transpiled.ok) {
      return {
        status: 'compile-error',
        compileError: transpiled.error,
        cases: [],
        logs: [],
        runtimeMs: 0,
      }
    }

    const worker = new Worker(new URL('./ts-worker.ts', import.meta.url), {
      type: 'module',
    })
    const raw: (RawCaseResult | undefined)[] = []
    const logs: LogEntry[] = []

    const timedOut = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(true), timeoutMs)
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data
        if (msg.type === 'log') logs.push(msg.entry)
        else if (msg.type === 'case') raw[msg.index] = msg.result
        else if (msg.type === 'done') {
          clearTimeout(timer)
          resolve(false)
        }
      }
      worker.onerror = (e) => {
        clearTimeout(timer)
        raw.push({ ok: false, error: e.message })
        resolve(false)
      }
      worker.postMessage({
        js: transpiled.js,
        functionName,
        inputs: cases.map((c) => c.input),
      })
    })
    worker.terminate()

    return {
      status: timedOut ? 'time-limit' : 'ok',
      cases: cases.map((c, i) => judgeCase(c, raw[i])),
      logs,
      runtimeMs: Math.round(performance.now() - started),
    }
  }

  async format(code: string, { tabSize }: FormatOptions): Promise<string> {
    return prettier.format(code, {
      parser: 'typescript',
      plugins: [tsPlugin, estreePlugin],
      tabWidth: tabSize,
      useTabs: false,
    })
  }
}
