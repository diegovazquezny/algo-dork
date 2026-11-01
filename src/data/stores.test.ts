import { describe, expect, it } from 'vitest'
import { JsonFileQuestionStore } from './json-question-store'
import { LocalStorageProgressStore } from './local-storage-progress-store'
import type { Submission } from '#/domain/progress'

function memStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  }
}

const sub = (status: Submission['status'], i = 0): Submission => ({
  id: String(i),
  language: 'typescript',
  code: 'x',
  passed: 1,
  total: 1,
  status,
  runtimeMs: 1,
  submittedAt: i,
  results: [],
})

describe('JsonFileQuestionStore', () => {
  it('loads and validates all seed questions', async () => {
    const store = new JsonFileQuestionStore()
    const list = await store.list()
    expect(list.length).toBeGreaterThanOrEqual(6)
    expect(
      (await store.getBySlug('two-sum'))?.languages.typescript.functionName,
    ).toBe('twoSum')
    expect(await store.getBySlug('nope')).toBeNull()
  })
  it('rejects invalid question JSON', () => {
    expect(() => new JsonFileQuestionStore([{ id: 1 }])).toThrow()
  })
})

describe('LocalStorageProgressStore', () => {
  it('saves drafts and prefixes keys', async () => {
    const s = memStorage()
    const store = new LocalStorageProgressStore(s)
    await store.saveDraft('q1', 'typescript', 'code')
    expect((await store.get('q1')).drafts.typescript).toBe('code')
    expect([...s.m.keys()].every((k) => k.startsWith('algo-dork:'))).toBe(true)
  })
  it('tracks status and caps history', async () => {
    const store = new LocalStorageProgressStore(memStorage())
    expect(
      (await store.recordSubmission('q', sub('wrong-answer'))).status,
    ).toBe('attempted')
    expect((await store.recordSubmission('q', sub('accepted', 1))).status).toBe(
      'solved',
    )
    expect(
      (await store.recordSubmission('q', sub('wrong-answer', 2))).status,
    ).toBe('solved')
    for (let i = 3; i < 30; i++)
      await store.recordSubmission('q', sub('wrong-answer', i))
    const p = await store.get('q')
    expect(p.submissions).toHaveLength(20)
    expect(p.submissions[0].id).toBe('29')
  })
  it('persists custom cases with optional expected values', async () => {
    const store = new LocalStorageProgressStore(memStorage())
    await store.saveCustomCases('q', [
      { input: '[1]', expected: '2' },
      { input: '[3]' },
    ])
    expect((await store.get('q')).customCases).toEqual([
      { input: '[1]', expected: '2' },
      { input: '[3]' },
    ])
  })
  it('returns default settings and persists changes', async () => {
    const store = new LocalStorageProgressStore(memStorage())
    expect((await store.getSettings()).tabSize).toBe(2)
    await store.saveSettings({
      formatOnSave: false,
      tabSize: 4,
      theme: 'light',
    })
    expect((await store.getSettings()).theme).toBe('light')
  })
})
