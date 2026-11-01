import { useState } from 'react'
import type { CaseResult } from '#/domain/progress'
import { firstFailure, statusLabel } from '#/lib/outcome'
import type { Outcome } from '#/lib/outcome'
import { Tab } from './TestcasePanel'

const show = (v: unknown) => (v === undefined ? 'undefined' : JSON.stringify(v))

export default function ResultPanel({
  outcome,
  running,
}: {
  outcome: Outcome | null
  running: boolean
}) {
  const [active, setActive] = useState(0)

  if (running) return <p className="p-3 text-sm text-zinc-500">Running…</p>
  if (!outcome)
    return (
      <p className="p-3 text-sm text-zinc-500">
        Run or submit your code to see results.
      </p>
    )
  if (outcome.inputError)
    return (
      <p className="p-3 font-mono text-sm text-red-500">{outcome.inputError}</p>
    )

  const { result } = outcome
  if (result.status === 'compile-error') {
    return (
      <div className="p-3">
        <p className="font-semibold text-red-500">Compile Error</p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-red-400">
          {result.compileError}
        </pre>
      </div>
    )
  }

  const cases = result.cases
  const fail = firstFailure(cases)
  const passed = cases.filter((c) => c.passed === true).length
  const judged = cases.filter((c) => c.passed !== null).length
  const outputOnly = cases.length - judged
  const isSubmit = outcome.kind === 'submit'
  const idx = Math.min(active, cases.length - 1)
  const c = cases[idx] as CaseResult | undefined
  // Hidden cases stay redacted unless it is the first failure of a submission.
  const redacted = !!c?.hidden && idx !== fail
  const logs = result.logs.filter((l) => l.caseIndex === idx)

  const headline = isSubmit
    ? statusLabel[outcome.status ?? 'wrong-answer']
    : result.status === 'time-limit'
      ? 'Time Limit Exceeded'
      : fail === -1 && !cases.some((x) => x.error)
        ? 'Ran successfully'
        : 'Wrong Answer'
  const good = headline === 'Accepted' || headline === 'Ran successfully'

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3 text-sm">
      <div className="flex items-baseline gap-3">
        <span
          className={
            'text-lg font-semibold ' +
            (good ? 'text-emerald-500' : 'text-red-500')
          }
        >
          {headline}
        </span>
        <span className="text-xs text-zinc-500">
          {judged > 0 && `${passed} / ${judged} test cases passed · `}
          {outputOnly > 0 &&
            `${outputOnly} output-only case${outputOnly === 1 ? '' : 's'} · `}
          {result.runtimeMs} ms
        </span>
      </div>

      {result.status === 'time-limit' && (
        <p className="text-xs text-zinc-500">
          Execution stopped after the time limit. Output so far is shown.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {cases.map((x, i) => (
          <Tab key={i} active={idx === i} onClick={() => setActive(i)}>
            <span
              className={
                x.passed === true
                  ? 'text-emerald-500'
                  : x.passed === false
                    ? 'text-red-500'
                    : ''
              }
            >
              ●
            </span>{' '}
            {x.hidden
              ? 'Hidden'
              : x.custom
                ? `Custom ${cases.slice(0, i + 1).filter((y) => y.custom).length}`
                : `Case ${i + 1}`}
          </Tab>
        ))}
      </div>

      {c &&
        (redacted ? (
          <p className="text-xs text-zinc-500">
            {c.passed
              ? 'Hidden case passed.'
              : 'Hidden case — details not shown.'}
          </p>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            <Block label="Input" value={show(c.input)} />
            {c.error ? (
              <Block label="Error" value={c.error} tone="error" />
            ) : (
              <>
                <Block
                  label="Output"
                  value={show(c.actual)}
                  tone={c.passed === false ? 'error' : undefined}
                />
                {c.passed !== null && (
                  <Block label="Expected" value={show(c.expected)} />
                )}
              </>
            )}
          </div>
        ))}

      {!redacted && logs.length > 0 && (
        <div className="font-mono text-xs">
          <p className="mb-1 text-zinc-500">Console</p>
          <pre className="whitespace-pre-wrap rounded bg-zinc-100 p-2 dark:bg-zinc-800">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.level === 'error'
                    ? 'text-red-400'
                    : l.level === 'warn'
                      ? 'text-amber-400'
                      : ''
                }
              >
                {l.text}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}

function Block({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'error'
}) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <pre
        className={
          'whitespace-pre-wrap rounded bg-zinc-100 p-2 dark:bg-zinc-800 ' +
          (tone ? 'text-red-400' : '')
        }
      >
        {value}
      </pre>
    </div>
  )
}
