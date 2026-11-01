import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { z } from 'zod'

import { DIFFICULTIES } from '#/domain/question'
import type { Difficulty } from '#/domain/question'
import type { QuestionProgress } from '#/domain/progress'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  allTags,
  filterQuestions,
  paginate,
} from '#/lib/filter'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  difficulty: z.enum(DIFFICULTIES).optional().catch(undefined),
  limit: z
    .number()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .optional()
    .catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
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
  const { questions, progress: progressById } = Route.useLoaderData()
  const progress: Partial<Record<string, QuestionProgress>> = progressById
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const tags = useMemo(() => allTags(questions), [questions])
  const filtered = useMemo(
    () => filterQuestions(questions, search),
    [questions, search],
  )
  const selected = search.tags ?? []
  const limit = search.limit ?? DEFAULT_PAGE_SIZE
  const {
    items: visible,
    page,
    pageCount,
  } = paginate(filtered, search.page ?? 1, limit)

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, page: undefined, ...patch }
        if (!next.q) delete next.q
        if (!next.tags?.length) delete next.tags
        if (!next.difficulty) delete next.difficulty
        if (!next.page || next.page === 1) delete next.page
        if (!next.limit || next.limit === DEFAULT_PAGE_SIZE) delete next.limit
        return next
      },
      replace: true,
    })

  const toggleTag = (tag: string) =>
    setSearch({
      tags: selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
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
          onChange={(e) =>
            setSearch({
              difficulty: (e.target.value || undefined) as
                Difficulty | undefined,
            })
          }
          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Problems per page"
          value={limit}
          onChange={(e) => setSearch({ limit: Number(e.target.value) })}
          className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              Show {n}
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
          {visible.map((q) => (
            <tr
              key={q.id}
              className="border-b border-zinc-100 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <td
                className="py-2 text-emerald-500"
                title={progress[q.id]?.status ?? 'unsolved'}
              >
                {statusIcon[progress[q.id]?.status ?? 'unsolved']}
              </td>
              <td className="py-2">
                <Link
                  to="/problems/$slug"
                  params={{ slug: q.slug }}
                  className="font-medium hover:text-amber-500"
                >
                  {q.title}
                </Link>
              </td>
              <td
                className={'py-2 capitalize ' + difficultyColor[q.difficulty]}
              >
                {q.difficulty}
              </td>
              <td className="py-2 text-xs text-zinc-500">
                {q.tags.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setSearch({ page: page - 1 })}
            className="rounded border border-zinc-300 px-3 py-1 enabled:hover:bg-zinc-200 disabled:opacity-40 dark:border-zinc-600 dark:enabled:hover:bg-zinc-700"
          >
            Prev
          </button>
          <span className="text-xs text-zinc-500">
            Page {page} of {pageCount} ({filtered.length} problems)
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setSearch({ page: page + 1 })}
            className="rounded border border-zinc-300 px-3 py-1 enabled:hover:bg-zinc-200 disabled:opacity-40 dark:border-zinc-600 dark:enabled:hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}
      {filtered.length === 0 && (
        <p className="py-8 text-center text-zinc-500">
          No questions match your filters.
        </p>
      )}
    </div>
  )
}
