import { describe, expect, it } from 'vitest'
import { executeCases } from './execute'
import type { RawCaseResult } from './execute'
import { answersMatch, judgeCase, submissionStatus } from './judge'
import { TypeScriptRunner, transpileTypeScript } from './typescript-runner'
import { JsonFileQuestionStore } from '#/data/json-question-store'
import { buildSpec } from './spec'
import { simpleSpec } from './types'
import type { ExecutionSpec, LogEntry } from './types'

async function exec(
  code: string,
  fn: string | ExecutionSpec,
  inputs: unknown[][],
) {
  const t = await transpileTypeScript(code)
  if (!t.ok) throw new Error(t.error)
  const logs: LogEntry[] = []
  const results: RawCaseResult[] = []
  await executeCases(
    t.js,
    typeof fn === 'string' ? simpleSpec(fn) : fn,
    inputs,
    {
      onLog: (e) => logs.push(e),
      onCase: (i, r) => (results[i] = r),
    },
  )
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
        buildSpec(q, 'typescript'),
        q.testCases.map((c) => c.input),
      )
      q.testCases.forEach((c, i) =>
        expect(
          judgeCase({ ...c, hasExpected: true }, results[i], q.comparison)
            .passed,
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

const spec = (over: Partial<ExecutionSpec>): ExecutionSpec => ({
  ...simpleSpec('f'),
  ...over,
})

describe('structures', () => {
  it('converts lists, trees and graphs both ways', async () => {
    const { results } = await exec(
      `function f(a: ListNode | null, t: TreeNode | null) { return a }`,
      spec({ params: ['ListNode', 'TreeNode'], returns: 'ListNode' }),
      [
        [
          [1, 2, 3],
          [1, null, 2],
        ],
        [[], []],
      ],
    )
    expect(results[0]).toEqual({ ok: true, actual: [1, 2, 3] })
    expect(results[1]).toEqual({ ok: true, actual: [] })
  })
  it('round-trips level-order trees and trims trailing nulls', async () => {
    const { results } = await exec(
      `function f(t: TreeNode | null) { return t }`,
      spec({ params: ['TreeNode'], returns: 'TreeNode' }),
      [[[3, 9, 20, null, null, 15, 7]], [[1, null, 2, 3]], [[]]],
    )
    expect(results.map((r) => r.ok && r.actual)).toEqual([
      [3, 9, 20, null, null, 15, 7],
      [1, null, 2, 3],
      [],
    ])
  })
  it('builds cyclic lists', async () => {
    const { results } = await exec(
      `function f(h: ListNode | null) { let s = h, g = h; while (g && g.next) { s = s!.next; g = g.next.next; if (s === g) return true } return false }`,
      spec({ params: ['CyclicList'] }),
      [[{ values: [3, 2, 0, -4], pos: 1 }], [{ values: [1, 2], pos: -1 }]],
    )
    expect(results.map((r) => r.ok && r.actual)).toEqual([true, false])
  })
  it('supports arrays of lists and in-place problems', async () => {
    const a = await exec(
      `function f(ls: (ListNode | null)[]) { return ls[1] }`,
      spec({ params: ['ListNode[]'], returns: 'ListNode' }),
      [[[[1], [2, 3]]]],
    )
    expect(a.results[0]).toEqual({ ok: true, actual: [2, 3] })
    const b = await exec(
      `function f(m: number[][]) { m[0][0] = 9 }`,
      spec({ returns: 'inplace' }),
      [[[[1, 2]]]],
    )
    expect(b.results[0]).toEqual({ ok: true, actual: [[9, 2]] })
  })
  it('rejects a clone that reuses original nodes', async () => {
    const cloneSpec = spec({
      params: ['GraphNode'],
      returns: 'GraphNode',
      requiresCopy: true,
    })
    const same = await exec(
      `function f(n: GraphNode) { return n }`,
      cloneSpec,
      [[[[2], [1]]]],
    )
    expect(same.results[0]).toMatchObject({ ok: false })
    const copy = await exec(
      `function f(n: GraphNode | null) { return new GraphNode(1, [new GraphNode(2, [])]) }`,
      cloneSpec,
      [[[[2], []]]],
    )
    expect(copy.results[0]).toMatchObject({ ok: true })
  })
  it('lets user code redeclare the injected classes', async () => {
    const { results } = await exec(
      `class ListNode { constructor(public val: number, public next: any = null) {} }\nfunction f() { return 1 }`,
      'f',
      [[]],
    )
    expect(results[0]).toEqual({ ok: true, actual: 1 })
  })
})

describe('class and roundtrip kinds', () => {
  it('runs LeetCode-style operation sequences', async () => {
    const { results } = await exec(
      `class Counter { n = 0; constructor(start: number) { this.n = start } inc() { this.n++ } get() { return this.n } }`,
      spec({ kind: 'class', name: 'Counter' }),
      [
        [
          ['Counter', 'inc', 'inc', 'get'],
          [[5], [], [], []],
        ],
      ],
    )
    expect(results[0]).toEqual({ ok: true, actual: [null, null, null, 7] })
  })
  it('round-trips through encoder and decoder', async () => {
    const ok = await exec(
      `function enc(a: string[]) { return JSON.stringify(a) }\nfunction dec(s: string) { return JSON.parse(s) }`,
      spec({ kind: 'roundtrip', name: 'enc', decoderName: 'dec' }),
      [[['a', '#b', '']]],
    )
    expect(ok.results[0]).toEqual({ ok: true, actual: ['a', '#b', ''] })
    const bad = await exec(
      `function enc(a: string[]) { return 5 }\nfunction dec(s: string) { return s }`,
      spec({ kind: 'roundtrip', name: 'enc', decoderName: 'dec' }),
      [[['a']]],
    )
    expect(bad.results[0]).toMatchObject({ ok: false })
  })
  it('reports a missing class or decoder', async () => {
    const { results } = await exec(
      `const x = 1`,
      spec({ kind: 'roundtrip', name: 'enc', decoderName: 'dec' }),
      [[[]]],
    )
    expect(results[0]).toMatchObject({ ok: false })
  })
})

describe('comparison modes', () => {
  it('ignores order only when asked to', () => {
    expect(answersMatch([[2, 1], [3]], [[3], [1, 2]], 'unordered-deep')).toBe(
      true,
    )
    expect(answersMatch([[2, 1], [3]], [[3], [1, 2]], 'unordered')).toBe(false)
    expect(
      answersMatch(
        [
          [1, 0],
          [2, 2],
        ],
        [
          [2, 2],
          [1, 0],
        ],
        'unordered',
      ),
    ).toBe(true)
    expect(answersMatch([[0, 1]], [[1, 0]], 'unordered')).toBe(false)
    expect(answersMatch([1, 2], [2, 1], 'exact')).toBe(false)
  })
})
