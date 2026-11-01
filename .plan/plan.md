# algo-dork — LeetCode-style practice app (alpha)

Status: agreed with the user after a design interview. Single user, fully client-side, no auth, no external API calls.

## Stack

- Existing scaffold: TanStack Router SPA (file-based routes in `src/routes`), Vite, React 19, Tailwind v4, TypeScript.
- Package manager: **npm** (repo has `package-lock.json`).
- Added: Monaco (`@monaco-editor/react`), Prettier standalone, Vitest, Zod, `react-markdown` + `remark-gfm`.

## Architecture

### Ports and adapters (data)

- Two async ports: `QuestionStore` (`list`, `get by slug/id`) and `ProgressStore` (read/write progress + settings).
- Alpha adapters: `JsonFileQuestionStore` (Vite `import.meta.glob` over `src/data/questions/*.json`) and `LocalStorageProgressStore`.
- One composition root (`src/data/index.ts`) selects implementations; they are injected through TanStack Router context. Components never touch localStorage or JSON files directly.
- Future: `HttpQuestionStore` / document-DB `ProgressStore` become a one-line swap.
- localStorage keys are prefixed `algo-dork:` and carry a schema `version` for migration.

### Language runners (extensibility)

- `LanguageRunner` interface: `{ id, label, monacoLanguage, starterCode(question), run(code, cases, opts), format(code, opts) }`.
- TypeScript is the only implementation for now. Question JSON holds per-language data keyed by language id, so Python (Pyodide) or a server runner can plug in later.
- TS runner: `ts.transpileModule` in the browser, executed in a Web Worker. Type errors never block execution (Monaco shows squiggles); transpile/syntax failures are shown in the result panel.
- Limits: 5s total wall-clock per run (worker terminated -> "Time Limit Exceeded"), 10k-char console cap, runtime reported, no memory metric.
- Execution model: function call with JSON-serializable args, deep-equal comparison. Linked list / tree problems are deferred.

## Data

### Question JSON (Zod-validated at load)

`id`, `slug`, `title`, `difficulty` (easy|medium|hard), `tags[]`, `description` (markdown), `examples[]`, `constraints[]`, `hints[]`,
`testCases: [{ input: unknown[], expected: unknown, hidden?: boolean }]` (question-level, reusable across languages),
`languages: { typescript: { starterCode, functionName, solution } }`.

### Progress (localStorage)

- Per question (keyed by stable `id`): status (unsolved|attempted|solved), autosaved draft per language, custom test cases, submission history (code, language, pass counts, per-case results, runtime, timestamp) capped at 20.
- Settings stored separately: format-on-save toggle (default on), tab size (default 2), theme (default dark).

## UI

- Routes: `/` -> redirect to `/problems`; `/problems` (list); `/problems/$slug` (workspace). URL uses `slug`, storage uses `id`.
- List: table (status, title, difficulty, tags). Keyword box (title + description, case-insensitive), multi-select tag chips (AND), difficulty filter. Filter state in URL search params (`q`, `tags`, `difficulty`) via TanStack Router validated search.
- Workspace: LeetCode-style split pane, draggable divider.
  - Left tabs: Description, Hints, Solution (click-to-reveal spoiler), Submissions.
  - Right: Monaco editor on top; collapsible bottom panel with Testcase (editable + addable custom cases; custom cases show output only, no pass/fail) and Result (per-case results + console output).
- Run: visible + custom cases. Submit: all cases (incl. hidden), reports N/M passed, reveals first failing case, records submission and updates status.
- Formatting: Prettier standalone, `tabWidth: 2`, Format button + Shift+Alt+F, auto-format on save/blur when toggle is on (not per keystroke). Independent of the repo's own prettier config.
- Descriptions rendered with `react-markdown` + GFM, no raw HTML.
- Theme: dark by default, toggle adds `dark` class on `<html>`, Monaco switches `vs-dark` / `vs`.

## Seed content

~6 questions across several tags (e.g. Two Sum, Valid Parentheses, Reverse String, FizzBuzz, Climbing Stairs, ...).

## Testing

Vitest for unit tests: comparison, runner, formatter, stores, filtering. Playwright e2e deferred.

## Delivery

- Vertical slices, each verified in the browser before the next: scaffold cleanup + data layer -> list page with filters -> workspace -> runner -> formatter -> progress/submissions -> polish.
- Small, logically separate commits as work progresses. Commit messages end with the Claude co-author line.
