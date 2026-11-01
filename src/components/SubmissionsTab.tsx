import { useState } from 'react'
import type { Submission } from '#/domain/progress'
import { statusLabel } from '#/lib/outcome'

type Props = { submissions: Submission[]; onRestore: (code: string) => void }

export default function SubmissionsTab({ submissions, onRestore }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  if (submissions.length === 0)
    return <p className="text-sm text-zinc-500">No submissions yet.</p>

  return (
    <ul className="space-y-2 text-sm">
      {submissions.map((s) => (
        <li
          key={s.id}
          className="rounded border border-zinc-200 dark:border-zinc-700"
        >
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left"
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            <span
              className={
                s.status === 'accepted'
                  ? 'font-semibold text-emerald-500'
                  : 'font-semibold text-red-500'
              }
            >
              {statusLabel[s.status]}
            </span>
            <span className="text-xs text-zinc-500">
              {s.passed}/{s.total} · {s.runtimeMs} ms ·{' '}
              {new Date(s.submittedAt).toLocaleString()}
            </span>
          </button>
          {open === s.id && (
            <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
              <pre className="max-h-64 overflow-auto rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                {s.code}
              </pre>
              <button
                type="button"
                className="mt-2 text-xs text-amber-500 hover:underline"
                onClick={() => onRestore(s.code)}
              >
                Load into editor
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
