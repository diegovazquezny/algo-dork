import {
  DEFAULT_SETTINGS,
  MAX_SUBMISSIONS,
  STORAGE_VERSION,
  emptyProgress,
  questionProgressSchema,
  settingsSchema,
} from '#/domain/progress'
import type { QuestionProgress, Settings, Submission } from '#/domain/progress'
import type { ProgressStore } from './ports'

const PROGRESS_KEY = 'algo-dork:progress'
const SETTINGS_KEY = 'algo-dork:settings'

type Envelope<T> = { version: number; data: T }

export class LocalStorageProgressStore implements ProgressStore {
  constructor(
    private readonly storage: Pick<
      Storage,
      'getItem' | 'setItem'
    > = localStorage,
  ) {}

  private read<T>(key: string): T | null {
    try {
      const raw = this.storage.getItem(key)
      if (!raw) return null
      const env = JSON.parse(raw) as Envelope<T>
      if (env.version !== STORAGE_VERSION) return null // future: migrate
      return env.data
    } catch {
      return null
    }
  }

  private write<T>(key: string, data: T) {
    const env: Envelope<T> = { version: STORAGE_VERSION, data }
    this.storage.setItem(key, JSON.stringify(env))
  }

  private readAll(): Record<string, QuestionProgress> {
    const raw = this.read<Record<string, unknown>>(PROGRESS_KEY) ?? {}
    const out: Record<string, QuestionProgress> = {}
    for (const [id, value] of Object.entries(raw)) {
      const parsed = questionProgressSchema.safeParse(value)
      if (parsed.success) out[id] = parsed.data
    }
    return out
  }

  async getAll() {
    return this.readAll()
  }

  async get(questionId: string) {
    return this.readAll()[questionId] ?? emptyProgress()
  }

  private update(
    questionId: string,
    fn: (p: QuestionProgress) => QuestionProgress,
  ) {
    const all = this.readAll()
    const next = {
      ...fn(all[questionId] ?? emptyProgress()),
      updatedAt: Date.now(),
    }
    all[questionId] = next
    this.write(PROGRESS_KEY, all)
    return next
  }

  async saveDraft(questionId: string, language: string, code: string) {
    this.update(questionId, (p) => ({
      ...p,
      drafts: { ...p.drafts, [language]: code },
    }))
  }

  async saveCustomCases(questionId: string, inputs: string[]) {
    this.update(questionId, (p) => ({
      ...p,
      customCases: inputs.map((input) => ({ input })),
    }))
  }

  async recordSubmission(questionId: string, submission: Submission) {
    return this.update(questionId, (p) => {
      const accepted = submission.status === 'accepted'
      return {
        ...p,
        status: accepted || p.status === 'solved' ? 'solved' : 'attempted',
        submissions: [submission, ...p.submissions].slice(0, MAX_SUBMISSIONS),
      }
    })
  }

  async getSettings(): Promise<Settings> {
    const parsed = settingsSchema.safeParse(this.read(SETTINGS_KEY))
    return parsed.success ? parsed.data : DEFAULT_SETTINGS
  }

  async saveSettings(settings: Settings) {
    this.write(SETTINGS_KEY, settings)
  }
}
