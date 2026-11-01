import { JsonFileQuestionStore } from './json-question-store'
import { LocalStorageProgressStore } from './local-storage-progress-store'
import type { DataContext } from './ports'

/**
 * Composition root: the only place that chooses concrete adapters.
 * Swap these for HTTP / document-DB adapters when a backend exists.
 */
export function createDataContext(): DataContext {
  return {
    questions: new JsonFileQuestionStore(),
    progress: new LocalStorageProgressStore(),
  }
}

export type { DataContext } from './ports'
