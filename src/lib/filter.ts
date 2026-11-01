import type { Difficulty, QuestionSummary } from '#/domain/question'

export type QuestionFilters = {
  q?: string
  tags?: string[]
  difficulty?: Difficulty
}

/** Keyword matches title/description (case-insensitive); tags are AND-ed. */
export function filterQuestions(
  questions: QuestionSummary[],
  { q, tags, difficulty }: QuestionFilters,
): QuestionSummary[] {
  const needle = q?.trim().toLowerCase()
  return questions.filter((question) => {
    if (difficulty && question.difficulty !== difficulty) return false
    if (tags?.length && !tags.every((t) => question.tags.includes(t)))
      return false
    if (needle) {
      const hay = `${question.title}\n${question.description}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

export function allTags(questions: QuestionSummary[]): string[] {
  return [...new Set(questions.flatMap((q) => q.tags))].sort()
}

export const PAGE_SIZES = [25, 50, 75, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 25

/** 1-based page, clamped to the valid range. */
export function paginate<T>(items: T[], page: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * size
  return { items: items.slice(start, start + size), page: current, pageCount }
}
