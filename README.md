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

## Run with Docker

```bash
docker build -t algo-dork .
docker run --rm -p 8080:80 algo-dork   # http://localhost:8080
```

The image builds the app and serves the static output with nginx.

## Architecture

- `src/domain` — Zod schemas/types for questions and progress.
- `src/data` — **ports** (`QuestionStore`, `ProgressStore`) and the alpha **adapters** (`JsonFileQuestionStore`, `LocalStorageProgressStore`). `src/data/index.ts` is the single composition root; swap adapters there when a backend exists.
- `src/runner` — the `LanguageRunner` interface plus the TypeScript implementation (transpile with `typescript`, run in a Worker, 5s timeout, 10k-char log cap, Prettier formatting).
- `src/routes` — TanStack Router file routes: `/problems` (list + filters in the URL) and `/problems/$slug` (workspace).

## Adding a question

Drop a JSON file in `src/data/questions/` (see `two-sum.json`); it is validated with Zod at startup. A test checks that every reference solution passes its own test cases.

Questions can use richer shapes than plain JSON in/out:

- `signature` — parameter/return types (`ListNode`, `TreeNode`, `GraphNode`, `CyclicList`, each optionally `[]`), `"returns": "inplace"` to judge a mutated argument, `requiresCopy` for graph cloning. Test data uses LeetCode's JSON formats (see `src/runner/structures.ts`). The classes are injected into user code; starters carry a `declare class` for editor types.
- `kind` — `function` (default), `class` (LeetCode-style `[operations, args]` → results) or `roundtrip` (`decode(encode(x))` must equal `x`, with `functionName` + `decoderName`).
- `comparison` — `exact` (default), `unordered` (outer array order ignored) or `unordered-deep` (inner arrays too).

The 75 questions tagged `blind-75` cover the Blind 75 list; each tag also carries its category (`array`, `dynamic-programming`, `graph`, ...).

## Adding a language

Implement `LanguageRunner` (`src/runner/types.ts`), register it in `src/runner/index.ts`, and add the language's `starterCode`/`functionName`/`solution` under `languages.<id>` in question JSON.
