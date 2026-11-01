import { z } from 'zod'

export const STORAGE_VERSION = 1
export const MAX_SUBMISSIONS = 20

export const caseResultSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
  passed: z.boolean().nullable(), // null => no expectation, output only
  custom: z.boolean().optional(),
  hidden: z.boolean().optional(),
  error: z.string().optional(),
})
export type CaseResult = z.infer<typeof caseResultSchema>

export const submissionSchema = z.object({
  id: z.string(),
  language: z.string(),
  code: z.string(),
  passed: z.number(),
  total: z.number(),
  status: z.enum(['accepted', 'wrong-answer', 'runtime-error', 'time-limit']),
  runtimeMs: z.number(),
  submittedAt: z.number(),
  results: z.array(caseResultSchema),
})
export type Submission = z.infer<typeof submissionSchema>

export const customCaseSchema = z.object({
  /** JSON array of arguments. */
  input: z.string(),
  /** JSON value; empty/absent means output-only (not judged). */
  expected: z.string().optional(),
})
export type CustomCase = z.infer<typeof customCaseSchema>

export const questionProgressSchema = z.object({
  status: z.enum(['unsolved', 'attempted', 'solved']),
  drafts: z.record(z.string(), z.string()),
  customCases: z.array(customCaseSchema),
  submissions: z.array(submissionSchema),
  updatedAt: z.number(),
})
export type QuestionProgress = z.infer<typeof questionProgressSchema>

export const settingsSchema = z.object({
  formatOnSave: z.boolean(),
  tabSize: z.number().int().min(1).max(8),
  theme: z.enum(['dark', 'light']),
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  formatOnSave: true,
  tabSize: 2,
  theme: 'dark',
}

export function emptyProgress(): QuestionProgress {
  return {
    status: 'unsolved',
    drafts: {},
    customCases: [],
    submissions: [],
    updatedAt: Date.now(),
  }
}
