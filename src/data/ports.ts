import type { Question, QuestionSummary } from '#/domain/question'
import type { QuestionProgress, Settings, Submission } from '#/domain/progress'

/** Port: where questions come from. Swap for an HTTP / document-DB adapter later. */
export interface QuestionStore {
  list: () => Promise<QuestionSummary[]>
  getBySlug: (slug: string) => Promise<Question | null>
}

/** Port: where user progress is persisted. */
export interface ProgressStore {
  getAll: () => Promise<Record<string, QuestionProgress>>
  get: (questionId: string) => Promise<QuestionProgress>
  saveDraft: (
    questionId: string,
    language: string,
    code: string,
  ) => Promise<void>
  saveCustomCases: (questionId: string, inputs: string[]) => Promise<void>
  /** Appends a submission, trims history, and updates status. */
  recordSubmission: (
    questionId: string,
    submission: Submission,
  ) => Promise<QuestionProgress>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<void>
}

export interface DataContext {
  questions: QuestionStore
  progress: ProgressStore
}
