# SurveyJS + Next.js template

A Next.js App Router application that shows the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) inside a product rather than on its own: an admin shell with real pages, three demos of a survey embedded in somebody else's website, seven form definitions, and one editor for all of them. Forms are JSON, rendered on the server, themed with shadcn/ui through the SurveyJS theme adapter.

This repository is MIT-licensed and depends on `survey-core` and `survey-react-ui` only. See **Extension points** below for how the commercial features attach.

## Layout

| Path | What lives there |
|---|---|
| `src/app` | Routes. The `(shell)` group is the admin chrome (`/claims`, `/checkout`, `/records`); `/embedded/*` is deliberately outside it; `/configure` is the form editor; `/api/extract` reads answers off a document. |
| `src/components` | React. `AdminShell` and `Sidebar` are the chrome, `SurveyForm` and `RecordsView` the two ways a survey is rendered, `configure/` the editor, `embedded/` the three host sites and their shared toolbar, `ui/` the shadcn primitives. |
| `src/schemas` | The form definitions and everything about them: one file per form, seed answers under `data/`, the `createSurveyModel` factory, the nav table, and the registry that maps a schema id to a definition. Depends on `survey-core` only — no UI framework here. |
| `src/lib` | Helpers with no React: route builders, the CMS-1500 printer, the survey-core linter adapter. |
| `src/storage` | The two seams to your storage. See below. |
| `src/styles` | App-local CSS on top of the theme adapter. |
| `e2e` | Playwright. `initial.spec.ts` walks every route, the others cover the editor, the linter and the extractor. |
| `scripts` | `check-mit-pure.mjs`, which fails if a commercial SurveyJS package is referenced. |

## Storage is mocked, in two files and nowhere else

Nothing in `src/` reads or writes stored data except `src/storage/survey-json.ts` (the form definitions) and `src/storage/survey-results.ts` (the answers people submit). Both are already `async`, so pointing them at a real API changes no call site.

- **Definitions** are kept per browser in `localStorage`, under `sjs-demo-schema:<id>`. The server always renders the definition that ships with the template, so the prerendered HTML stays canonical and one visitor's experiment never reaches anybody else.
- **Results** are an in-memory array seeded from `insuranceClaimSeed`. Nothing persists, on purpose: a template should not look like it is storing someone's data when it is not. `listResults` runs in a server component; the mutations run in the browser, the way they would hit your API.

## Adding a schema

1. Write `src/schemas/<id>.ts` exporting the JSON and a `SchemaDefinition` (`id`, `title`, `description`, `json`).
2. Export both from `src/schemas/index.ts` and add the definition to `schemaRegistry`.
3. Optional: seed answers in `src/schemas/data/<id>-seed.ts`, exported the same way.
4. Add it to `src/components/configure/forms.ts` so the editor can open it.

## Adding a page

1. Add an entry to `navItems` in `src/schemas/navigation.ts`, with the `schemaId` it renders. The sidebar is built from that list.
2. Create `src/app/(shell)/<route>/page.tsx`. Read the nav entry with `getNavItem`, the definition with `getSchemaDefinition`, then render `PageHeader` and `SurveyForm`. The three existing pages are each about fifteen lines; copy one.
3. A page that must not wear the admin chrome goes outside the `(shell)` group, as `/embedded/*` does.
4. Add the route to `e2e/initial.spec.ts`, which asserts that the survey markup is in the HTML the server sent.

## Extension points

The commercial SurveyJS products — the **form designer** (Survey Creator), **PDF export** (PDF Generator) and **analytics** (Dashboard) — are not part of this repository. They are added by a downstream edition that carries this same application plus those three packages.

The seam is `src/features`: one dependency-free module exporting an edition config, which components read to decide what to render. This repository ships the defaults, where each commercial action is undefined and the button for it simply does not render.

**`src/features` does not exist yet.** Today the components have no such seam, and the downstream edition keeps its own edited copies of them, which is the problem the seam is meant to remove. When it is added, it holds: the edition name, the top-bar title, badge and cross-link; the label, tooltip and icon of the button that opens a form in its editor; an optional PDF export function; an optional analytics link builder. It must contain no React, no JSX and no CSS imports, because Playwright imports it too.

Until then, treat any commercial feature as out of scope for this repository, and keep `npm run lint`, `npm run build` and `node scripts/check-mit-pure.mjs` green.

## Commands

```
npm ci
npm run dev                      # http://localhost:3000
npm run build
npm run lint
npm run e2e:ci                   # Playwright against a production build
npm run e2e:dev                  # the same suite against `next dev`
node scripts/check-mit-pure.mjs  # no commercial SurveyJS packages
```

## Environment

`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` enables `/api/extract`, which reads answers off an uploaded document. With neither set the route answers 501 and the button says so. Copy `.env.example` to `.env.local`. Keys are server-side only.
