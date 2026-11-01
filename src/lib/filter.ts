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
    if (tags?.length && !tags.every((t) => question.tags.includes(t))) return false
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
