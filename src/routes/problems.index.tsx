import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { z } from 'zod'

import { DIFFICULTIES, type Difficulty } from '#/domain/question'
import type { QuestionProgress } from '#/domain/progress'
import { allTags, filterQuestions } from '#/lib/filter'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  difficulty: z.enum(DIFFICULTIES).optional().catch(undefined),
})

export const Route = createFileRoute('/problems/')({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const [questions, progress] = await Promise.all([
      context.data.questions.list(),
      context.data.progress.getAll(),
    ])
    return { questions, progress }
  },
  component: ProblemsPage,
})

const difficultyColor: Record<Difficulty, string> = {
  easy: 'text-emerald-500',
  medium: 'text-amber-500',
  hard: 'text-red-500',
}

const statusIcon: Record<QuestionProgress['status'], string> = {
  solved: '✔',
  attempted: '◐',
  unsolved: '',
}

function ProblemsPage() {
  const { questions, progress } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const tags = useMemo(() => allTags(questions), [questions])
  const filtered = useMemo(() => filterQuestions(questions, search), [questions, search])
  const selected = search.tags ?? []

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...patch }
        if (!next.q) delete next.q
        if (!next.tags?.length) delete next.tags
        if (!next.difficulty) delete next.difficulty
        return next
      },
      replace: true,
    })

  const toggleTag = (tag: string) =>
    setSearch({
      tags: selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag],
    })

  return (
    <div className="mx-auto h-full max-w-5xl overflow-auto p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search questions…"
          value={search.q ?? ''}
          onChange={(e) => setSearch({ q: e.target.value })}
          className="min-w-64 flex-1 rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-amber-500 dark:border-zinc-600"
        />
        <select
          value={search.difficulty ?? ''}
          onChange={(e) => setSearch({ difficulty: (e.target.value || undefined) as Difficulty | undefined })}
          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={selected.includes(tag)}
            onClick={() => toggleTag(tag)}
            className={
              'rounded-full border px-3 py-0.5 text-xs ' +
              (selected.includes(tag)
                ? 'border-amber-500 bg-amber-500 text-black'
                : 'border-zinc-300 hover:bg-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700')
            }
          >
            {tag}
          </button>
        ))}
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-700">
          <tr>
            <th className="w-20 py-2">Status</th>
            <th className="py-2">Title</th>
            <th className="w-28 py-2">Difficulty</th>
            <th className="py-2">Tags</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q) => (
            <tr key={q.id} className="border-b border-zinc-100 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
              <td className="py-2 text-emerald-500" title={progress[q.id]?.status ?? 'unsolved'}>
                {statusIcon[progress[q.id]?.status ?? 'unsolved']}
              </td>
              <td className="py-2">
                <Link to="/problems/$slug" params={{ slug: q.slug }} className="font-medium hover:text-amber-500">
                  {q.title}
                </Link>
              </td>
              <td className={'py-2 capitalize ' + difficultyColor[q.difficulty]}>{q.difficulty}</td>
              <td className="py-2 text-xs text-zinc-500">{q.tags.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-zinc-500">No questions match your filters.</p>
      )}
    </div>
  )
}
