# SurveyJS + Next.js template

A Next.js App Router application that shows the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) inside a product rather than on its own: an admin shell with real pages, three demos of a survey embedded in somebody else's website, seven form definitions, and one editor for all of them. Forms are JSON, rendered on the server, themed with shadcn/ui through the SurveyJS theme adapter.

This repository is MIT-licensed and depends on `survey-core` and `survey-react-ui` only. See **Extension points** below for how the commercial features attach.

## Layout

| Path | What lives there |
|---|---|
| `src/app` | Routes. The `(shell)` group is the admin chrome (`/claims`, `/checkout`, `/records`); `/embedded/*` is deliberately outside it; `/configure` is the form editor; `/api/extract` reads answers off a document. |
| `src/components` | React. `AdminShell` and `Sidebar` are the chrome, `SurveyForm` and `RecordsView` the two ways a survey is rendered, `configure/` the editor, `embedded/` the three host sites and their shared toolbar, `ui/` the shadcn primitives. |
| `src/schemas` | The form definitions and everything about them: one file per form, seed answers under `data/`, the `createSurveyModel` factory, the nav table, and the registry that maps a schema id to a definition. Depends on `survey-core` only — no UI framework here. |
| `src/features` | The edition config: which editor, brand and optional commercial actions this edition has. See **Extension points**. |
| `src/lib` | Helpers with no React: route builders, the CMS-1500 printer, the survey-core linter adapter, the license-key loader. |
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

The commercial SurveyJS products — the **form designer** (Survey Creator), **PDF export** (PDF Generator) and **analytics** (Dashboard) — are not part of this repository. They are added by a downstream edition, [surveyjs-nextjs-demo](https://github.com/surveyjs/surveyjs-nextjs-demo), that carries this same application plus those three packages. Every file here except the two named below is copied into that edition byte for byte, so a component never branches on which edition it is in by editing it — it reads the edition config.

The seam is `src/features`, in two files:

- **`src/features/types.ts`** — the `Features` interface. Shared code: the downstream edition carries it unchanged.
- **`src/features/index.ts`** — this edition's values, exported as `features`. **The one file an edition replaces.** An edition's own implementations live beside it, in `src/features/<edition>/`.

The config holds:

| Field | What it drives | Here |
|---|---|---|
| `edition` | `"mit"` or `"full"`; `data-edition` on the top bar, and which e2e specs run | `"mit"` |
| `brand.title`, `brand.badge` | The top bar's title and the badge beside it | `SurveyJS Library + Next.js Template`, `MIT` |
| `brand.sourceUrl` | The top bar's Source button, and the source links on `/configure` | this repository |
| `brand.otherEdition` | The cross-link to the other edition in the top bar | the full edition |
| `designer.label`, `designer.hint`, `designer.icon` | Text, tooltip and icon (`json` or `designer`, mapped to a lucide icon inside the component) of every button that opens a form in its editor | `Configure Form JSON`, `json` |
| `designer.readySelector` | What Playwright waits for once `/configure` has loaded its editor | `.monaco-editor` |
| `exportPdf?(json, { label, data })` | "Save as PDF" in the survey's navigation bar and "Save to PDF" in the demo toolbar | undefined — no button renders |
| `analyticsHref?(formId)` | "View analytics" in the page header and "Analytics" in the demo toolbar | undefined — no link renders |

**It contains no React, no JSX and no CSS imports**, and statically imports nothing heavy, because Playwright imports it from `e2e/` outside any bundler. A function an edition adds loads its libraries with a dynamic `import()` when it is called.

What reads it:

- `src/components/AdminShell.tsx` — title, badge, Source, the cross-link, `data-edition`
- `src/components/PageHeader.tsx` — the editor button, and the analytics button when a page passes `analyticsHref`
- `src/app/(shell)/claims/page.tsx`, `checkout/page.tsx`, `records/page.tsx` — pass `analyticsHref={features.analyticsHref?.(nav.schemaId)}`
- `src/components/SurveyForm.tsx` — `usePdfAction`, switched off per form with `pdfInNavigation={false}` (as `RecordsView` does)
- `src/components/embedded/shared/useDemo.ts` — `trackAnswers`, and `onExportPdf` / `analyticsHref` in `dockProps`
- `src/components/embedded/shared/DemoDock.tsx` — the editor link, and the PDF and Analytics buttons when those props are set
- `src/components/configure/forms.ts` — `SOURCE_ROOT`, from `brand.sourceUrl`
- `e2e/warm-dev-routes.ts` — adds the analytics route only when `analyticsHref` is defined
- `e2e/initial.spec.ts` — the editor link's name and the editor's ready selector; `e2e/configure.spec.ts` and `e2e/lint.spec.ts` skip themselves unless `edition` is `"mit"`

`src/lib/routes.ts` keeps `configureHref` only; the analytics link belongs to the config.

**`src/app/configure/page.tsx` is the one route an edition replaces outright.** Here it renders the JSON workbench; the full edition renders Survey Creator, with its own page metadata. Selecting the component through the config would drag the route's metadata into it for no gain.

To add a feature that needs a commercial package: add an optional field to `types.ts`, leave it undefined in `index.ts`, and make the call site render nothing without it, with a comment saying what an edition plugs in. Keep `npm run lint`, `npm run build` and `node scripts/check-mit-pure.mjs` green.

## Commands

```
npm install                      # not `npm ci`: there is no lock file, see below
npm run dev                      # http://localhost:3000
npm run build
npm run lint
npm run e2e:ci                   # Playwright against a production build
npm run e2e:dev                  # the same suite against `next dev`
node scripts/check-mit-pure.mjs  # no commercial SurveyJS packages
```

There is deliberately no `package-lock.json`. Every SurveyJS package is pinned to `latest` so the template always shows the current library, and a lock file would freeze what that means. `.npmrc` sets `package-lock=false`, so `npm install` neither reads nor writes one, and `/package-lock.json` is in `.gitignore`. The cost is accepted: installs are not reproducible, and a bad upstream release breaks a fresh clone until it is fixed upstream.

## Environment

Copy `.env.example` to `.env.local`. It documents four variables, in two groups.

**Server-side, for `/api/extract`, in both editions.** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — set one, not both — enables the route that reads answers off an uploaded document; whichever is present picks the provider. `EXTRACTOR_MODEL` optionally overrides the model; without it the route uses its per-provider default (see `src/app/api/extract/route.ts`). Leave it commented out rather than empty: an empty string survives the route's `??` fallback and asks the provider for a model named `""`. With neither key set the route answers 501 and the button on `/records` says so. None of these reach the browser.

**`SURVEYJS_KEY` — the SurveyJS license key.** When it is set, `src/lib/surveyjs-license.ts` applies it with `slk` from `survey-core`; unset or blank, nothing is applied. `SurveyForm` and `EmbeddedSurvey` import that file for its side effect, so the key is applied on every page that renders a form, on the server and in the browser; any other module that renders SurveyJS (the full edition's Creator, Dashboard and PDF export) imports it the same way. It reaches the browser, forwarded by the `env` block in `next.config.mjs` rather than by a `NEXT_PUBLIC_` prefix, so the two must be renamed together. `slk` is exported by `survey-core` itself, so the code is MIT-clean, and the two editions differ by a key rather than by code.
