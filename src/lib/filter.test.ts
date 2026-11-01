import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  paginate,
  allTags,
  filterQuestions,
} from './filter'
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

describe('page sizes', () => {
  it('defaults to 25 and offers 25/50/75/100', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25)
    expect([...PAGE_SIZES]).toEqual([25, 50, 75, 100])
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 60 }, (_, i) => i)
  it('slices the requested page', () => {
    const r = paginate(items, 2, 25)
    expect(r.items[0]).toBe(25)
    expect(r.items).toHaveLength(25)
    expect(r.pageCount).toBe(3)
  })
  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 25).page).toBe(3)
    expect(paginate(items, 0, 25).page).toBe(1)
  })
  it('handles empty lists', () => {
    expect(paginate([], 1, 25)).toEqual({ items: [], page: 1, pageCount: 1 })
  })
})
