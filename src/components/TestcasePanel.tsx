import { useState } from 'react'
import type { TestCase } from '#/domain/question'

type Props = {
  visibleCases: TestCase[]
  customInputs: string[]
  onCustomChange: (inputs: string[]) => void
}

const show = (v: unknown) => JSON.stringify(v)

export default function TestcasePanel({
  visibleCases,
  customInputs,
  onCustomChange,
}: Props) {
  const [active, setActive] = useState(0)
  const total = visibleCases.length + customInputs.length
  const idx = Math.min(active, Math.max(0, total - 1))
  const customIdx = idx - visibleCases.length

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {visibleCases.map((_, i) => (
          <Tab key={i} active={idx === i} onClick={() => setActive(i)}>
            Case {i + 1}
          </Tab>
        ))}
        {customInputs.map((_, i) => (
          <Tab
            key={`c${i}`}
            active={idx === visibleCases.length + i}
            onClick={() => setActive(visibleCases.length + i)}
          >
            Custom {i + 1}
          </Tab>
        ))}
        <button
          type="button"
          title="Add custom case"
          className="rounded px-2 py-0.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          onClick={() => {
            onCustomChange([...customInputs, '[]'])
            setActive(total)
          }}
        >
          +
        </button>
      </div>

      {customIdx < 0 ? (
        <div className="space-y-1 font-mono text-xs">
          <p className="text-zinc-500">Input (JSON array of arguments)</p>
          <pre className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
            {show(visibleCases[idx]?.input)}
          </pre>
          <p className="text-zinc-500">Expected</p>
          <pre className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
            {show(visibleCases[idx]?.expected)}
          </pre>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">
            Input (JSON array of arguments, e.g. <code>[[2,7],9]</code>). Custom
            cases show output only.
          </p>
          <textarea
            value={customInputs[customIdx] ?? ''}
            onChange={(e) =>
              onCustomChange(
                customInputs.map((v, i) =>
                  i === customIdx ? e.target.value : v,
                ),
              )
            }
            spellCheck={false}
            rows={3}
            className="w-full rounded border border-zinc-300 bg-transparent p-2 font-mono text-xs outline-none focus:border-amber-500 dark:border-zinc-600"
          />
          <button
            type="button"
            className="text-xs text-red-500 hover:underline"
            onClick={() =>
              onCustomChange(customInputs.filter((_, i) => i !== customIdx))
            }
          >
            Remove this case
          </button>
        </div>
      )}
    </div>
  )
}

export function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded px-2 py-0.5 text-xs ' +
        (active
          ? 'bg-zinc-200 font-semibold dark:bg-zinc-700'
          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800')
      }
    >
      {children}
    </button>
  )
}
