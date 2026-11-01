import type { LanguageRunner } from './types'
import { TypeScriptRunner } from './typescript-runner'

const runners: LanguageRunner[] = [new TypeScriptRunner()]

export function getRunner(languageId: string): LanguageRunner {
  const runner = runners.find((r) => r.id === languageId)
  if (!runner)
    throw new Error(`No runner registered for language "${languageId}"`)
  return runner
}

export const availableLanguages = runners.map((r) => r.id)
