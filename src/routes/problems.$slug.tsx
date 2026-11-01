import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'

import Markdown from '#/components/Markdown'
import ResultPanel from '#/components/ResultPanel'
import SplitPane from '#/components/SplitPane'
import SubmissionsTab from '#/components/SubmissionsTab'
import TestcasePanel, { Tab } from '#/components/TestcasePanel'
import type { editor } from 'monaco-editor'
import type { QuestionProgress, Submission } from '#/domain/progress'
import type { Question } from '#/domain/question'
import { parseCustomExpected, parseCustomInput } from '#/lib/outcome'
import type { Outcome } from '#/lib/outcome'
import { useSettings } from '#/lib/settings-context'
import { getRunner } from '#/runner'
import { submissionStatus } from '#/runner/judge'
import { buildSpec } from '#/runner/spec'
import type { RunnerCase } from '#/runner/types'

const CodeEditor = lazy(() => import('#/components/CodeEditor'))

const LANGUAGE = 'typescript' // TODO: language selector once a second runner exists

export const Route = createFileRoute('/problems/$slug')({
  loader: async ({ context, params }) => {
    const question = await context.data.questions.getBySlug(params.slug)
    if (!question) throw notFound()
    const progress = await context.data.progress.get(question.id)
    return { question, progress }
  },
  notFoundComponent: () => (
    <div className="p-6">
      Question not found.{' '}
      <Link to="/problems" search={{}} className="text-amber-500 underline">
        Back to list
      </Link>
    </div>
  ),
  component: () => {
    const { question, progress } = Route.useLoaderData()
    return (
      <Workspace
        key={question.id}
        question={question}
        initialProgress={progress}
      />
    )
  },
})

const difficultyColor = {
  easy: 'text-emerald-500',
  medium: 'text-amber-500',
  hard: 'text-red-500',
} as const

function Workspace({
  question,
  initialProgress,
}: {
  question: Question
  initialProgress: QuestionProgress
}) {
  const { data } = Route.useRouteContext()
  const { settings, update } = useSettings()
  const runner = getRunner(LANGUAGE)
  const langData = question.languages[LANGUAGE]

  const [code, setCode] = useState(
    initialProgress.drafts[LANGUAGE] ?? langData.starterCode,
  )
  const [customCases, setCustomCases] = useState(initialProgress.customCases)
  const [submissions, setSubmissions] = useState(initialProgress.submissions)
  const [status, setStatus] = useState(initialProgress.status)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [running, setRunning] = useState(false)
  const [leftTab, setLeftTab] = useState<
    'description' | 'hints' | 'solution' | 'submissions'
  >('description')
  const [bottomTab, setBottomTab] = useState<'testcase' | 'result'>('testcase')
  const [collapsed, setCollapsed] = useState(false)
  const [solutionRevealed, setSolutionRevealed] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const codeRef = useRef(code)
  codeRef.current = code

  // Debounced draft autosave.
  useEffect(() => {
    const t = setTimeout(
      () => void data.progress.saveDraft(question.id, LANGUAGE, code),
      400,
    )
    return () => clearTimeout(t)
  }, [code, data, question.id])

  useEffect(() => {
    void data.progress.saveCustomCases(question.id, customCases)
  }, [customCases, data, question.id])

  /** Replace editor content via an edit so undo history survives. */
  const replaceCode = useCallback((next: string) => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (editor && model)
      editor.executeEdits('algo-dork', [
        { range: model.getFullModelRange(), text: next },
      ])
    else setCode(next)
  }, [])

  const format = useCallback(async () => {
    try {
      const formatted = await runner.format(codeRef.current, {
        tabSize: settings.tabSize,
      })
      if (formatted !== codeRef.current) replaceCode(formatted)
    } catch {
      // Syntax errors: leave the code untouched; the compile error shows on Run.
    }
  }, [runner, settings.tabSize, replaceCode])

  const saveOrBlur = useCallback(() => {
    if (settings.formatOnSave) void format()
  }, [settings.formatOnSave, format])

  const execute = async (kind: 'run' | 'submit') => {
    try {
      await executeInner(kind)
    } catch (e) {
      setOutcome({
        kind,
        inputError: `Unexpected error: ${e instanceof Error ? e.message : String(e)}`,
        result: { status: 'ok', cases: [], logs: [], runtimeMs: 0 },
      })
    } finally {
      setRunning(false)
    }
  }

  const executeInner = async (kind: 'run' | 'submit') => {
    setRunning(true)
    setBottomTab('result')
    setCollapsed(false)
    const base: RunnerCase[] = question.testCases
      .filter((c) => kind === 'submit' || !c.hidden)
      .map((c) => ({
        input: c.input,
        expected: c.expected,
        hasExpected: true,
        hidden: c.hidden,
      }))

    const custom: RunnerCase[] = []
    if (kind === 'run') {
      for (const [i, c] of customCases.entries()) {
        const parsed = parseCustomInput(c.input)
        const expected = parseCustomExpected(c.expected)
        const error = !parsed.ok
          ? parsed.error
          : !expected.ok
            ? expected.error
            : undefined
        if (error || !parsed.ok || !expected.ok) {
          setOutcome({
            kind,
            inputError: `Custom ${i + 1}: ${error}`,
            result: { status: 'ok', cases: [], logs: [], runtimeMs: 0 },
          })
          return
        }
        custom.push({
          input: parsed.input,
          custom: true,
          hasExpected: expected.hasExpected,
          expected: expected.hasExpected ? expected.expected : undefined,
        })
      }
    }

    const result = await runner.run({
      code: codeRef.current,
      spec: buildSpec(question, LANGUAGE),
      comparison: question.comparison,
      cases: [...base, ...custom],
    })

    if (kind === 'submit') {
      const st = submissionStatus(result.status, result.cases)
      const submission: Submission = {
        id: crypto.randomUUID(),
        language: LANGUAGE,
        code: codeRef.current,
        passed: result.cases.filter((c) => c.passed === true).length,
        total: result.cases.length,
        status: st,
        runtimeMs: result.runtimeMs,
        submittedAt: Date.now(),
        results: result.cases,
      }
      const next = await data.progress.recordSubmission(question.id, submission)
      setSubmissions(next.submissions)
      setStatus(next.status)
      setOutcome({ kind, result, status: st })
    } else {
      setOutcome({ kind, result })
    }
  }

  const visibleCases = question.testCases.filter((c) => !c.hidden)

  const left = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        {(['description', 'hints', 'solution', 'submissions'] as const).map(
          (t) => (
            <Tab key={t} active={leftTab === t} onClick={() => setLeftTab(t)}>
              <span className="capitalize">{t}</span>
            </Tab>
          ),
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {leftTab === 'description' && (
          <>
            <h1 className="text-xl font-semibold">{question.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span
                className={
                  'font-medium capitalize ' +
                  difficultyColor[question.difficulty]
                }
              >
                {question.difficulty}
              </span>
              {status === 'solved' && (
                <span className="text-emerald-500">✔ Solved</span>
              )}
              {question.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-200 px-2 py-0.5 dark:bg-zinc-700"
                >
                  {t}
                </span>
              ))}
            </div>
            <Markdown>{question.description}</Markdown>
            {question.examples.map((ex, i) => (
              <div key={i} className="mt-4 text-sm">
                <p className="font-semibold">Example {i + 1}:</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-800">
                  {`Input: ${ex.input}\nOutput: ${ex.output}`}
                  {ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}
                </pre>
              </div>
            ))}
            {question.constraints.length > 0 && (
              <div className="mt-4 text-sm">
                <p className="font-semibold">Constraints:</p>
                <ul className="mt-1 list-disc pl-6 font-mono text-xs">
                  {question.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {leftTab === 'hints' &&
          (question.hints.length ? (
            <ol className="list-decimal space-y-3 pl-6 text-sm">
              {question.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-500">No hints for this question.</p>
          ))}
        {leftTab === 'solution' &&
          (solutionRevealed ? (
            <pre className="overflow-auto rounded bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-800">
              {langData.solution}
            </pre>
          ) : (
            <button
              type="button"
              className="rounded border border-dashed border-zinc-400 px-4 py-6 text-sm text-zinc-500 hover:border-amber-500 hover:text-amber-500"
              onClick={() => setSolutionRevealed(true)}
            >
              Spoiler — click to reveal the reference solution
            </button>
          ))}
        {leftTab === 'submissions' && (
          <SubmissionsTab submissions={submissions} onRestore={replaceCode} />
        )}
      </div>
    </div>
  )

  const editorPane = (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 px-3 text-xs dark:border-zinc-700">
        <span className="text-zinc-500">{runner.label}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.formatOnSave}
              onChange={(e) => update({ formatOnSave: e.target.checked })}
            />
            Auto-format
          </label>
          <button
            type="button"
            className="rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => void format()}
          >
            Format
          </button>
          <button
            type="button"
            disabled={running}
            className="rounded bg-zinc-200 px-3 py-1 font-medium hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            onClick={() => void execute('run')}
          >
            Run
          </button>
          <button
            type="button"
            disabled={running}
            className="rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            onClick={() => void execute('submit')}
          >
            Submit
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense
          fallback={
            <p className="p-3 text-sm text-zinc-500">Loading editor…</p>
          }
        >
          <CodeEditor
            value={code}
            language={runner.monacoLanguage}
            theme={settings.theme}
            tabSize={settings.tabSize}
            onChange={setCode}
            onFormatRequest={() => void format()}
            onSaveOrBlur={saveOrBlur}
            onRun={() => void execute('run')}
            editorRef={editorRef}
          />
        </Suspense>
      </div>
    </div>
  )

  const bottom = (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-700">
        <div className="flex gap-1">
          <Tab
            active={bottomTab === 'testcase'}
            onClick={() => {
              setBottomTab('testcase')
              setCollapsed(false)
            }}
          >
            Testcase
          </Tab>
          <Tab
            active={bottomTab === 'result'}
            onClick={() => {
              setBottomTab('result')
              setCollapsed(false)
            }}
          >
            Result
          </Tab>
        </div>
        <button
          type="button"
          className="text-xs text-zinc-500"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-auto">
          {bottomTab === 'testcase' ? (
            <TestcasePanel
              visibleCases={visibleCases}
              customCases={customCases}
              onCustomChange={setCustomCases}
            />
          ) : (
            <ResultPanel outcome={outcome} running={running} />
          )}
        </div>
      )}
    </div>
  )

  return (
    <SplitPane
      direction="horizontal"
      initial={45}
      first={left}
      second={
        <SplitPane
          direction="vertical"
          initial={60}
          first={editorPane}
          second={bottom}
          collapseSecondTo={collapsed ? 36 : undefined}
        />
      }
    />
  )
}
