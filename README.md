# algo-dork

A LeetCode-style practice app. Fully client-side for now: questions are JSON files, progress lives in `localStorage`, code runs in a Web Worker. See [.plan/plan.md](.plan/plan.md) for the design.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run typecheck
npm run build
```

## Architecture

- `src/domain` — Zod schemas/types for questions and progress.
- `src/data` — **ports** (`QuestionStore`, `ProgressStore`) and the alpha **adapters** (`JsonFileQuestionStore`, `LocalStorageProgressStore`). `src/data/index.ts` is the single composition root; swap adapters there when a backend exists.
- `src/runner` — the `LanguageRunner` interface plus the TypeScript implementation (transpile with `typescript`, run in a Worker, 5s timeout, 10k-char log cap, Prettier formatting).
- `src/routes` — TanStack Router file routes: `/problems` (list + filters in the URL) and `/problems/$slug` (workspace).

## Adding a question

Drop a JSON file in `src/data/questions/` (see `two-sum.json`); it is validated with Zod at startup. A test checks that every reference solution passes its own test cases.

## Adding a language

Implement `LanguageRunner` (`src/runner/types.ts`), register it in `src/runner/index.ts`, and add the language's `starterCode`/`functionName`/`solution` under `languages.<id>` in question JSON.
