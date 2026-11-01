import { describe, expect, it } from 'vitest'
import { allTags, filterQuestions } from './filter'
import type { QuestionSummary } from '#/domain/question'

const qs: QuestionSummary[] = [
  {
    id: '1',
    slug: 'a',
    title: 'Two Sum',
    difficulty: 'easy',
    tags: ['array', 'hash-table'],
    description: 'find pair',
  },
  {
    id: '2',
    slug: 'b',
    title: 'Stairs',
    difficulty: 'medium',
    tags: ['math'],
    description: 'Climb steps',
  },
]

describe('filterQuestions', () => {
  it('matches keywords in title and description, case-insensitively', () => {
    expect(filterQuestions(qs, { q: 'TWO' }).map((q) => q.id)).toEqual(['1'])
    expect(filterQuestions(qs, { q: 'climb' }).map((q) => q.id)).toEqual(['2'])
  })
  it('ANDs tags', () => {
    expect(filterQuestions(qs, { tags: ['array', 'hash-table'] })).toHaveLength(
      1,
    )
    expect(filterQuestions(qs, { tags: ['array', 'math'] })).toHaveLength(0)
  })
  it('filters by difficulty', () => {
    expect(filterQuestions(qs, { difficulty: 'medium' })[0].id).toBe('2')
  })
  it('lists unique sorted tags', () => {
    expect(allTags(qs)).toEqual(['array', 'hash-table', 'math'])
  })
})
