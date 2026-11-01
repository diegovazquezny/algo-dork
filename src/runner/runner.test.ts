import { describe, expect, it } from 'vitest'
import { executeCases } from './execute'
import type { RawCaseResult } from './execute'
import { judgeCase, submissionStatus } from './judge'
import { TypeScriptRunner, transpileTypeScript } from './typescript-runner'
import { JsonFileQuestionStore } from '#/data/json-question-store'
import type { LogEntry } from './types'

async function exec(code: string, fn: string, inputs: unknown[][]) {
  const t = await transpileTypeScript(code)
  if (!t.ok) throw new Error(t.error)
  const logs: LogEntry[] = []
  const results: RawCaseResult[] = []
  await executeCases(t.js, fn, inputs, {
    onLog: (e) => logs.push(e),
    onCase: (i, r) => (results[i] = r),
  })
  return { logs, results }
}

describe('executeCases', () => {
  it('runs TS, captures console output per case, and returns values', async () => {
    const { logs, results } = await exec(
      `function add(a: number, b: number): number { console.log('sum', a, b, {x: 1}); return a + b }`,
      'add',
      [
        [1, 2],
        [3, 4],
      ],
    )
    expect(results).toEqual([
      { ok: true, actual: 3 },
      { ok: true, actual: 7 },
    ])
    expect(logs.map((l) => [l.caseIndex, l.text])).toEqual([
      [0, 'sum 1 2 {"x":1}'],
      [1, 'sum 3 4 {"x":1}'],
    ])
  })
  it('reports thrown errors per case without aborting others', async () => {
    const { results } = await exec(
      `function f(n: number) { if (n < 0) throw new Error('neg'); return n }`,
      'f',
      [[-1], [2]],
    )
    expect(results[0]).toEqual({ ok: false, error: 'Error: neg' })
    expect(results[1]).toEqual({ ok: true, actual: 2 })
  })
  it('reports a missing function', async () => {
    const { results } = await exec(`const x = 1`, 'nope', [[1]])
    expect(results[0]).toMatchObject({ ok: false })
  })
  it('supports async functions and does not mutate shared inputs', async () => {
    const input = [[[1, 2]]]
    const { results } = await exec(
      `async function f(a: number[]) { a.push(3); return a }`,
      'f',
      input,
    )
    expect(results[0]).toEqual({ ok: true, actual: [1, 2, 3] })
    expect(input).toEqual([[[1, 2]]])
  })
  it('truncates huge console output', async () => {
    const { logs } = await exec(
      `function f() { for (let i = 0; i < 5000; i++) console.log('xxxxxxxxxx'); return 1 }`,
      'f',
      [[]],
    )
    expect(logs.reduce((n, l) => n + l.text.length, 0)).toBeLessThan(10_100)
    expect(logs.at(-1)!.text).toContain('truncated')
  })
})

describe('transpile + judge', () => {
  it('reports syntax errors', async () => {
    const t = await transpileTypeScript('function f( {')
    expect(t.ok).toBe(false)
  })
  it('ignores type errors', async () => {
    expect((await transpileTypeScript('const x: number = "a"')).ok).toBe(true)
  })
  it('judges cases and derives statuses', () => {
    const pass = judgeCase(
      { input: [], expected: [1], hasExpected: true },
      { ok: true, actual: [1] },
    )
    const fail = judgeCase(
      { input: [], expected: 1, hasExpected: true },
      { ok: true, actual: 2 },
    )
    const custom = judgeCase(
      { input: [], hasExpected: false },
      { ok: true, actual: 2 },
    )
    expect(custom.passed).toBeNull()
    const judgedCustom = judgeCase(
      { input: [], expected: 2, hasExpected: true, custom: true },
      { ok: true, actual: 2 },
    )
    expect(judgedCustom).toMatchObject({ passed: true, custom: true })
    expect(submissionStatus('ok', [pass])).toBe('accepted')
    expect(submissionStatus('ok', [pass, fail])).toBe('wrong-answer')
    expect(submissionStatus('time-limit', [])).toBe('time-limit')
    expect(
      submissionStatus('ok', [
        judgeCase(
          { input: [], expected: 1, hasExpected: true },
          { ok: false, error: 'x' },
        ),
      ]),
    ).toBe('runtime-error')
  })
})

describe('reference solutions', () => {
  it('every seed question solution passes all of its test cases', async () => {
    const store = new JsonFileQuestionStore()
    for (const summary of await store.list()) {
      const q = (await store.getBySlug(summary.slug))!
      const lang = q.languages.typescript
      const { results } = await exec(
        lang.solution,
        lang.functionName,
        q.testCases.map((c) => c.input),
      )
      q.testCases.forEach((c, i) =>
        expect(
          judgeCase({ ...c, hasExpected: true }, results[i]).passed,
          `${q.slug} #${i}`,
        ).toBe(true),
      )
    }
  })
})

describe('TypeScriptRunner.format', () => {
  it('formats with 2-space indentation by default option', async () => {
    const out = await new TypeScriptRunner().format('function f(){return 1}', {
      tabSize: 2,
    })
    expect(out).toBe('function f() {\n  return 1;\n}\n')
  })
  it('respects tab size', async () => {
    const out = await new TypeScriptRunner().format('function f(){return 1}', {
      tabSize: 4,
    })
    expect(out).toContain('    return 1')
  })
})
