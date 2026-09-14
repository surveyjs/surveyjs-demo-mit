# SurveyJS + Next.js template

A Next.js App Router application that shows the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) inside a product rather than on its own: an admin shell with real pages, three demos of a survey embedded in somebody else's website, six form definitions, and one editor for all of them. Forms are JSON, rendered on the server, themed with shadcn/ui through the SurveyJS theme adapter.

This repository is MIT-licensed and depends on `survey-core` and `survey-react-ui` only. See **Extension points** below for how the commercial features attach.

## Layout

| Path | What lives there |
|---|---|
| `src/app` | Routes. The `(shell)` group is the admin chrome (`/leads`, `/claims`, `/starter`, `/definition`); `/embedded/*` is deliberately outside it, and so is `/`, which forwards to `/leads`; `/configure` is the per-form editor every form's editor button opens; legacy paths redirect in `next.config.mjs`; `/api/extract` reads answers off a document; `/api/lint` runs static analysis on a definition; `robots.ts` serves `/robots.txt`. |
| `src/components` | React. `AdminShell`, `TopBar` and `Sidebar` are the chrome, `how-built/` the "How this page is built" toggle's state and the panel it opens, `SurveyForm` the one way a survey is rendered in the shell, `records/` the shared records page (`RecordsView`, and the header's record and user switchers), `ClaimsView` a thin wrapper over `RecordsView` that adds extraction and the CMS-1500 export, `NotImplemented` the panel of a page not built yet, `configure/` the editor (also rendered inside the shell on `/definition`), `embedded/` the three host sites and their shared toolbar, `ui/` the shadcn primitives. |
| `src/schemas` | The form definitions and everything about them: one file per form, seed answers under `data/`, test cases under `tests/`, the `createSurveyModel` factory, the nav table, the registry that maps a schema id to a definition, and the records pages' collections (`records.ts`, one module per collection under `collections/`). Depends on `survey-core` only — no UI framework here. |
| `src/features` | The edition config: which editor, brand and optional commercial actions this edition has. See **Extension points**. |
| `src/lib` | Helpers with no React: route builders (`routes.ts`, including the other-edition link and a page's source file), the demo's name and site links (`site.ts`), page titles and social tags (`metadata.ts`), the "How this page is built" content (`how-built.ts`), the CMS-1500 printer, the survey-core linter adapter, the license-key loader. |
| `src/storage` | The three seams to your storage. See below. |
| `src/styles` | App-local CSS on top of the theme adapter. |
| `e2e` | Playwright. `initial.spec.ts` walks every route, `records.spec.ts` covers the shared records page and the how-built panel on `/claims`, the others cover the editor, the linter (its front end and `/api/lint`) and the extractor. |
| `scripts` | `check-mit-pure.mjs`, which fails if a commercial SurveyJS package is referenced. |

## Storage is mocked, in three files and nowhere else

Nothing in `src/` reads or writes stored data except `src/storage/survey-json.ts` (the form definitions), `src/storage/survey-results.ts` (the answers people submit) and `src/storage/session.ts` (who the page is rendered for). All three are already `async`, so pointing them at a real API changes no call site.

- **Definitions** are kept per browser in `localStorage`, under `sjs-demo-schema:<id>`. The server always renders the definition that ships with the template, so the prerendered HTML stays canonical and one visitor's experiment never reaches anybody else.
- **Results** are kept in memory per collection, created from each collection's seed. Nothing persists, on purpose: a template should not look like it is storing someone's data when it is not. A record is stored as **columns plus document**: `listResults(collectionId)` returns `{ id, columns }` only, `getResult(collectionId, id)` returns the whole response as `data`, and `saveResult` stores the document and derives the columns from it with the collection's `toColumns`, seed records included. `listResults`, and `getResult` for the first row, run in the records pages' server components; opening another row and the mutations run in the browser, the way they would hit your API.
- **Session users** are `listSessionUsers(scope)`: the users a page may be rendered for, first one signed in, keyed by collection id. In your app it is `getSession()` and returns one. A page passes them to `RecordsView` as `users`, and the form gets the active one as the `user` variable. No scope has users yet.

## Adding a schema

1. Write `src/schemas/<id>.ts` exporting the JSON and a `SchemaDefinition` (`id`, `title`, `description`, `json`).
2. Export both from `src/schemas/index.ts` and add the definition to `schemaRegistry`.
3. Optional: seed answers in `src/schemas/data/<id>-seed.ts`, exported the same way.
4. Add it to `src/components/configure/forms.ts` so the editor can open it.

## Adding a page

1. Add a row to one of the groups in `navGroups` in `src/schemas/navigation.ts`, and its icon to `ICONS` in `Sidebar.tsx`. A **page** (`NavPage`) has a `path`, a `layout` and, if it renders one form, the `schemaId`: `"shell"` for a page inside the admin chrome, `"embedded"` for one that pretends to be somebody else's site. A **link** (`NavLink`) to another site has an `href` instead, kept in `src/lib/site.ts`. The sidebar renders every group from that list, and the top bar's "Source of this page" link finds a page's file from `navPages`. A row opens in a new tab, and shows ↗, exactly when `opensInNewTab` says so — a link or an embedded page; never special-case a row in the component.
2. Create `src/app/(shell)/<route>/page.tsx`. For a form, read the nav entry with `getFormNavItem`, the definition with `getSchemaDefinition`, then render `PageHeader` and `SurveyForm`; `starter/page.tsx` is about fifteen lines, so copy it. A page that is not built yet renders `NotImplemented` with the row's label and description, as `leads/page.tsx` does. Every page exports `metadata = pageMetadata(nav.id)`; give it a title and description in `PAGE_COPY` in `src/lib/metadata.ts`, or it falls back to the sidebar label and description.
3. An `"embedded"` page must not wear the admin chrome, so it goes outside the `(shell)` group, as `/embedded/*` does. `layout` only describes the page — the folder is what Next.js obeys — and `e2e/top-bar.spec.ts` fails when the two disagree.
4. Add the route to `e2e/initial.spec.ts`, which asserts that the survey markup is in the HTML the server sent, and the row to the expected list in `e2e/sidebar.spec.ts`.
5. Renaming a route? Add the old path to `redirects()` in `next.config.mjs`, and to the `legacy redirects` block of `e2e/sidebar.spec.ts`.

## Adding a records page

A records page is a list of stored records and one form that views, edits and adds them. `/claims` is the example; copy it.

1. **The schema**, as in **Adding a schema**.
2. **The seed**, `src/schemas/data/<id>-seed.ts`: a `SurveyResult[]` of `{ id, data }`. Write documents only; the columns are derived.
3. **The collection**, `src/schemas/collections/<id>.ts`, a `RecordCollection`: its storage `id`, `schemaId`, `noun`, the list `columns` (`id`, `text`, `badge` with tones, `money` with an optional `currencyKey`, `date`), `titleKey`, `toColumns(id, data)`, `newId(existing)`, `newRecord(id, user)` for the defaults of a new record, an optional `compare` for list order, and the `seed`. Defaults a new record takes from the signed-in user belong in `newRecord`, not in `defaultValueExpression`, so opening an existing record never re-derives an answer.
4. **Register it** in `recordCollections` in `src/schemas/records.ts`.
5. **Describe it** in `HOW_BUILT` in `src/lib/how-built.ts`: the data in, the data out, the variable names the panel lists references to, and the feature chips. A chip is `status: "shown"` or `"coming"`, and one only an edition has sets `edition`.
6. **The page**, about fifteen lines: read `listResults(id)`, `getResult` for the first row and, if the page has users, `listSessionUsers(id)` on the server, and render `RecordsView` with them. `RecordsView` renders the page header too. `claims/page.tsx` and `ClaimsView.tsx` show the optional props: `exportPdf` to replace the generic PDF export, `listFooter` under the list, `formNote` under the form's heading.

`RecordsView` subscribes to no SurveyJS event. It snapshots `model.data` when the form loads and asks before discarding a change. Switching user rebuilds the form with the answers on screen, saved or not. The header's Save validates every page before completing.

## Extension points

The commercial SurveyJS products — the **form designer** (Survey Creator), **PDF export** (PDF Generator) and **analytics** (Dashboard) — are not part of this repository. They are added by a downstream edition, [surveyjs-demo](https://github.com/surveyjs/surveyjs-demo), that carries this same application plus those three packages. Every file here except the two named below is copied into that edition byte for byte, so a component never branches on which edition it is in by editing it — it reads the edition config.

The seam is `src/features`, in two files:

- **`src/features/types.ts`** — the `Features` interface. Shared code: the downstream edition carries it unchanged.
- **`src/features/index.ts`** — this edition's values, exported as `features`. **The one file an edition replaces.** An edition's own implementations live beside it, in `src/features/<edition>/`.

The config holds:

| Field | What it drives | Here |
|---|---|---|
| `edition` | `"mit"` or `"full"`; `data-edition` on the top bar, and which e2e specs run | `"mit"` |
| `brand.editionLabel` | The edition pill beside the demo's name in the top bar | `MIT` |
| `brand.sourceUrl` | The top bar's "Source of this page" link, and the source links on `/configure` | this repository |
| `brand.otherEdition` | `label` and `baseUrl` of the top bar's switch link, which opens the same pathname on the other edition's host | `Full edition`, `https://app.demos.surveyjs.io` |
| `designer.label`, `designer.hint`, `designer.icon` | Text, tooltip and icon (`json` or `designer`, mapped to a lucide icon inside the component) of every button that opens a form in its editor | `Configure Form JSON`, `json` |
| `designer.readySelector` | What Playwright waits for once `/configure` has loaded its editor | `.monaco-editor` |
| `exportPdf?(json, { label, data })` | "Save as PDF" in the survey's navigation bar and "Save to PDF" in the demo toolbar | undefined — no button renders |
| `analyticsHref?(formId)` | "View analytics" in the page header and "Analytics" in the demo toolbar | undefined — no link renders |

**It contains no React, no JSX and no CSS imports**, and statically imports nothing heavy, because Playwright imports it from `e2e/` outside any bundler. A function an edition adds loads its libraries with a dynamic `import()` when it is called.

What reads it:

- `src/components/TopBar.tsx` — the edition pill, the switch link, "Source of this page", `data-edition`. The demo's name and the site links are the same in every edition, so they live in `src/lib/site.ts`, not here.
- `src/components/PageHeader.tsx` — the editor button, and the analytics button when a page passes `analyticsHref`
- `src/app/(shell)/starter/page.tsx` — passes `analyticsHref={features.analyticsHref?.(nav.schemaId)}`
- `src/components/records/RecordsView.tsx` — `analyticsHref` for its page header, and `exportPdf` for the header's "Save as PDF" when the page passes no export of its own
- `src/components/SurveyForm.tsx` — `usePdfAction`, switched off per form with `pdfInNavigation={false}`, as every records page does: there the PDF is the record's, in the header
- `src/components/embedded/shared/useDemo.ts` — `trackAnswers`, and `onExportPdf` / `analyticsHref` in `dockProps`
- `src/components/embedded/shared/DemoDock.tsx` — the editor link, and the PDF and Analytics buttons when those props are set
- `src/components/configure/forms.ts` — `SOURCE_ROOT`, from `brand.sourceUrl`
- `src/lib/metadata.ts` — `edition`, which picks the title suffix and the copy that differs per edition. See **Page metadata**.
- `e2e/warm-dev-routes.ts` — adds the analytics route only when `analyticsHref` is defined
- `e2e/initial.spec.ts` — the editor link's name and the editor's ready selector; `e2e/configure.spec.ts` and `e2e/lint.spec.ts` skip themselves unless `edition` is `"mit"`

`src/lib/routes.ts` holds `configureHref`, `otherEditionHref` and `pageSourcePath`; the analytics link belongs to the config.

**`src/app/configure/page.tsx` is the one route an edition replaces outright.** Here it renders the JSON workbench; the full edition renders Survey Creator. Both build their metadata with the shared `formToolMetadata`, so the copy is not duplicated. Selecting the component through the config would drag the route's metadata into it for no gain.

To add a feature that needs a commercial package: add an optional field to `types.ts`, leave it undefined in `index.ts`, and make the call site render nothing without it, with a comment saying what an edition plugs in. Keep `npm run lint`, `npm run build` and `node scripts/check-mit-pure.mjs` green.

## Page metadata

All of it is in `src/lib/metadata.ts`, which is shared code. Route files only call it.

- **Where it is set.** The root layout exports `siteMetadata`, which holds the title template, `metadataBase`, `robots` and a fallback for pages with no metadata of their own (the 404). A sidebar page exports `pageMetadata(navId)`. `/` exports `rootMetadata`. `/configure`, and `/analytics` in the full edition, use `generateMetadata` with `formToolMetadata`, which titles the page after the chosen form's page: "Starter — the smallest page — Customize".
- **Editions.** The copy is written once. `features.edition` picks the title suffix, `· SurveyJS in your app` or `· SurveyJS in your app (MIT)`, and any text that has a `{ mit, full }` pair. A description that names a commercial product needs an `mit` variant that does not.
- **Social tags.** `openGraph` and `twitter` mirror the rendered title and description on every page, because a child segment replaces them rather than merging them. No OG image exists, so `twitter:card` is `summary`.
- **The root is a 200, not a redirect.** `src/app/page.tsx` forwards with a zero-second meta refresh. A 307 would make every link preview show Leads.
- **Metadata in the head.** `htmlLimitedBots: /.*/` in `next.config.mjs` puts metadata in the `<head>` for every client. Without it, Next.js streams metadata into the body on the per-request routes (`/configure`).

### Canonicals and indexing: an open decision

Both hosts serve the same routes. Every page is canonical to itself on `NEXT_PUBLIC_CANONICAL_URL`, which defaults to `NEXT_PUBLIC_SITE_URL`. `NEXT_PUBLIC_INDEXABLE=false` adds `noindex, follow` and a `robots.txt` that disallows crawling. Nothing sets it to `false` today.

**The site owner has not decided between two options.** The code supports both, and choosing one is a deployment setting, not a code change:

1. **Both editions indexed** (current). Each host is canonical to itself. The descriptions differ meaningfully, and "SurveyJS MIT" is a real query.
2. **Full wins every query.** On the MIT host, set `NEXT_PUBLIC_CANONICAL_URL=https://app.demos.surveyjs.io`. Its canonicals and `og:url` then point at the full edition's equivalents. `/configure` differs between the two, the JSON editor here and Creator there, and would still point across.

## Validation

There is one lint engine, two front ends and one server route. The rules that flag a broken expression while somebody edits a form are the rules that reject it at the API.

- **The engine is `survey-core/linter`**, a subpath export of `survey-core` and MIT-licensed. `lintSurvey(json)` and `getRules()` are headless, with no DOM and no renderer.
- **One entry point: `lintSurveyJson` in `src/lib/lint/lint-survey.ts`.** It is a framework-free wrapper that both front ends and the route call. Call `lintSurvey` directly nowhere else, or the editor and the server can disagree.
- **Template suppressions.** `templateSuppressions(json)` silences two things this template writes on purpose, each at its own path, through the linter's own `suppress` option: `aiHint` (read from the raw JSON by `/api/extract`, never registered as a property), and an `autocomplete` with an HTML `shipping`/`billing` section token whose field name is valid. A misspelled one is still reported. Add to it only for something deliberate, never to make a real finding go away.
- **On the client, this edition** draws `src/components/lint/StaticAnalysisBar.tsx` under the Monaco editor on `/configure`. `src/lib/lint/monaco-adapter.ts` maps a finding's JSON path to a line.
- **On the server, `/api/lint`** (`src/app/api/lint/route.ts`) runs the same call. It is `POST { json }` → `{ ok, findings }`, where `ok` means no finding at all. That is the same test that makes the status bar say "all checks passed". `src/storage/survey-json.ts` shows a real `saveSurveyJson` calling it before storing. `e2e/lint-api.spec.ts` covers it and runs in both editions.
- **`src/lib/lint/try-breaking-it.ts`** makes a finding appear on demand. It is pure JSON mutation with no imports. The editor's "Try breaking it" buttons use it, and so does the API spec.
- **The full edition** gets the same rules inside Survey Creator's built-in UI, and the same `/api/lint` route, which is shared code. The Monaco front end is copied there but not used.

The route lints with no options. The editor tells the linter about the runtime variable `user` for the personalized forms, and the route does not, so a personalized definition that passes in the editor reports unknown `{user.…}` references at `/api/lint`. Variable context is out of scope until Survey Core's variable presets arrive.

### Testing

`survey-core/tester` is the linter's sibling. It is headless too, and it runs behaviour tests against a real `SurveyModel`: answer this, then expect that to be visible or hold that value. It was published in `survey-core` 3.0.4, which `latest` now installs. **Nothing here is wired up yet**: no script, route or spec calls it, and adding one is its own task.

- Cases live beside the schemas, one file per schema, as `src/schemas/tests/<schema-id>.tests.json`. There is one so far, `checkout.tests.json`. See `src/schemas/tests/README.md`.
- One call runs a suite, with the definition passed separately from the cases:
  `await runSurveyTests(getSchemaDefinition("checkout").json, checkoutTests)`.
- The format is specified in the SurveyJS library source, `packages/survey-core/src/tester/README.md`. Read it before editing a case file. Do not guess the grammar.

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

Copy `.env.example` to `.env.local`. It documents seven variables, in three groups.

**Page metadata, both editions.** `NEXT_PUBLIC_SITE_URL` is this host. Set it on every deployment: canonicals and `og:url` are built from it, and without it they say `http://localhost:3000`. `NEXT_PUBLIC_CANONICAL_URL` and `NEXT_PUBLIC_INDEXABLE` are optional; see **Page metadata**. All three are inlined at build time, so a change needs a rebuild. The edition is not among them: it is `features.edition`, a constant, so a build cannot call itself the other edition.

**Server-side, for `/api/extract`, in both editions.** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — set one, not both — enables the route that reads answers off an uploaded document; whichever is present picks the provider. `EXTRACTOR_MODEL` optionally overrides the model; without it the route uses its per-provider default (see `src/app/api/extract/route.ts`). Leave it commented out rather than empty: an empty string survives the route's `??` fallback and asks the provider for a model named `""`. With neither key set the route answers 501 and the button on `/claims` says so. None of these reach the browser.

**`SURVEYJS_KEY` — the SurveyJS license key.** When it is set, `src/lib/surveyjs-license.ts` applies it with `slk` from `survey-core`; unset or blank, nothing is applied. `SurveyForm` and `EmbeddedSurvey` import that file for its side effect, so the key is applied on every page that renders a form, on the server and in the browser; any other module that renders SurveyJS (the full edition's Creator, Dashboard and PDF export) imports it the same way. It reaches the browser, forwarded by the `env` block in `next.config.mjs` rather than by a `NEXT_PUBLIC_` prefix, so the two must be renamed together. `slk` is exported by `survey-core` itself, so the code is MIT-clean, and the two editions differ by a key rather than by code.
