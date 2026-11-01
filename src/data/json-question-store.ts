import { questionSchema, type Question } from '#/domain/question'
import type { QuestionStore } from './ports'

const modules = import.meta.glob('./questions/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

export class JsonFileQuestionStore implements QuestionStore {
  private readonly questions: Question[]

  constructor(raw: unknown[] = Object.values(modules)) {
    this.questions = raw.map((q) => questionSchema.parse(q))
    const slugs = new Set<string>()
    for (const q of this.questions) {
      if (slugs.has(q.slug)) throw new Error(`Duplicate slug: ${q.slug}`)
      slugs.add(q.slug)
    }
    this.questions.sort((a, b) => a.title.localeCompare(b.title))
  }

  async list() {
    return this.questions.map(
      ({ id, slug, title, difficulty, tags, description }) => ({
        id,
        slug,
        title,
        difficulty,
        tags,
        description,
      }),
    )
  }

  async getBySlug(slug: string) {
    return this.questions.find((q) => q.slug === slug) ?? null
  }
}
