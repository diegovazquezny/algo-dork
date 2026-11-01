import { z } from 'zod'

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  hidden: z.boolean().optional(),
})

export const languageDataSchema = z.object({
  starterCode: z.string(),
  functionName: z.string(),
  solution: z.string(),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.array(z.string()),
  description: z.string(),
  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional(),
      }),
    )
    .default([]),
  constraints: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  testCases: z.array(testCaseSchema).min(1),
  /** Keyed by language id, e.g. "typescript". */
  languages: z.record(z.string(), languageDataSchema),
})

export type TestCase = z.infer<typeof testCaseSchema>
export type LanguageData = z.infer<typeof languageDataSchema>
export type Question = z.infer<typeof questionSchema>

/** Lightweight shape used by the list page. */
export type QuestionSummary = Pick<
  Question,
  'id' | 'slug' | 'title' | 'difficulty' | 'tags' | 'description'
>
