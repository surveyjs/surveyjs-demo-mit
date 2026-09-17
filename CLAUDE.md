# SurveyJS + Next.js template

A Next.js App Router application that shows the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) inside a product rather than on its own: an admin shell with real pages, three demos of a survey embedded in somebody else's website, seven form definitions, and one editor for all of them. Forms are JSON, rendered on the server, themed with shadcn/ui through the SurveyJS theme adapter.

This repository is MIT-licensed and depends on `survey-core` and `survey-react-ui` only. See **Extension points** below for how the commercial features attach.

## Layout

| Path | What lives there |
|---|---|
| `src/app` | Routes. The `(shell)` group is the admin chrome (`/leads`, `/work-orders`, `/starter`, `/definition`, plus each records page's `[id]` route for one record and `/work-orders/from-document` for the import panel); `/embedded/*` is deliberately outside it, and so is `/`, which forwards to `/leads`; `/configure` is the per-form editor every form's editor button opens; legacy paths redirect in `next.config.mjs`; `/api/extract` reads answers off a document; `/api/lint` runs static analysis on a definition; `/api/storage/*` are the storage routes the browser calls (see **Storage**); `robots.ts` serves `/robots.txt`. |
| `src/components` | React. `AdminShell`, `TopBar` and `Sidebar` are the chrome, `how-built/` the "How this page is built" toggle's state and the panel it opens, `SurveyForm` the one way a survey is rendered in the shell, `records/` the shared records page (`RecordsView`; the rail beside the form, `RecordRail` and `RecordRailItem`, and `RecordPicker`, the dropdown that replaces it below `xl`; `ColumnValue`, how a column's value renders; and the header's user switcher), `survey-outline/` the "SurveyJS renders this" outline the embedded demos and the records pages draw around a form, `WorkOrdersView` a thin wrapper over `RecordsView` that adds the import panel, and the job sheet export where the edition has one, `extract/` the extraction panel and its sample documents, `NotImplemented` the panel of a page not built yet (unused since `/leads` was built), `configure/` the editor (also rendered inside the shell on `/definition`), `embedded/` the three host sites and their shared toolbar, `ui/` the shadcn primitives. |
| `src/schemas` | The form definitions and everything about them: one file per form, seed answers under `data/`, test cases under `tests/`, the `createSurveyModel` factory, the nav table, the registry that maps a schema id to a definition, and the records pages' collections (`records.ts`, one module per collection under `collections/`), and `custom-properties.ts`, the properties this template registers with SurveyJS (`aiHint`). Depends on `survey-core` only — no UI framework here. |
| `src/features` | The edition config: which editor, brand and optional commercial actions this edition has. See **Extension points**. |
| `src/lib` | Helpers with no React: route builders (`routes.ts`, including the other-edition link and a page's source file), the demo's name and site links (`site.ts`), page titles and social tags (`metadata.ts`), the "How this page is built" content (`how-built.ts`), the survey-core linter adapter, the license-key loader. |
| `src/storage` | The seams to your storage, the one backend they share (`backend/sqlite.ts`, `backend/visitor.ts`), and the browser's handshake (`access.ts`). See below. |
| `src/archive` | Code kept but not wired: the CMS-1500 claim, with a README on re-registering it. It type-checks with the build, and nothing outside it imports it. |
| `src/styles` | App-local CSS on top of the theme adapter. |
| `e2e` | Playwright. `initial.spec.ts` walks every route, `storage.spec.ts` covers per-visitor storage end to end (cookies, server rendering, resets, caps, uploads, a browser that blocks cookies) and `storage-backend.spec.ts` the backend without a server, `records.spec.ts` covers the shared records page (the rail, record URLs and Back, the import panel, the outline) and the how-built panel on `/work-orders`, with what a work order adds, `work-order-sheet.spec.ts` the job sheet's data without a browser (seed totals, the sample documents), `custom-properties.spec.ts` the registered `aiHint`, `leads.spec.ts` the CRM record on `/leads` (totals, the economic-buyer rule, roles, row ids), the others cover the editor, the linter (its front end and `/api/lint`) and the extractor. |
| `scripts` | `check-mit-pure.mjs`, which fails if a commercial SurveyJS package is referenced; `storage-gc.mjs`, which removes idle visitors (`npm run storage:gc`); `render-work-order-assets.mjs`, which renders the job sheet's samples and signatures, and in the full edition the blank and box table its printer reads (`npm run assets:work-order`). |
| `assets/work-order` | The job sheet's source: `job-sheet.html`, its OFL fonts, invented signatures as pen strokes, and the values written on each sample sheet. |

## Storage: a sandbox per visitor, in four files and one backend

Nothing in `src/` reads or writes stored data except `src/storage/survey-json.ts` (the form definitions), `src/storage/survey-results.ts` (records, submissions and Reset demo data), `src/storage/session.ts` (who the page is rendered for) and `src/storage/documents.ts` (the originals records are read from). All four are `async`, so pointing them at a real API changes no call site. Three of them store data, and they share one backend, `src/storage/backend/sqlite.ts`: one SQLite file through Node's built-in `node:sqlite`, at `DATABASE_PATH` (default `.data/demo.db`).

- **Where the seams run.** On the server (`typeof window === "undefined"`) they call the backend directly, for the visitor the request's cookie names, through `readAsVisitor` in `backend/visitor.ts`. In the browser they call the routes under `src/app/api/storage/`. Next.js replaces `typeof window` at build time, so the client bundle carries no server branch; keep the check inline in each function, and keep `next/headers` a dynamic import inside `readVisitor`, or the build refuses it in client components' module graph. The server never writes: `saveResult`, `deleteResult` and the others throw there.
- **The template visitor.** The definitions in `schemaRegistry` and the seed of every collection in `recordCollections` are rows under `TEMPLATE_UID`, rewritten from `src/schemas` every time the database opens. A request with no visitor row, cookie or not, reads the template, and a read never creates a row. A visitor's first write copies every template row under their id, in one statement per table, inside the same transaction as the write; from then on their rows are the truth, an emptied collection included. Columns are never stored: `survey-results.ts` derives them with the collection's `toColumns` on every read, and the record route assigns row ids on every write.
- **The cookie.** `demo_uid`, a random UUID, set by `POST /api/storage/session` (the handshake `src/storage/access.ts` runs once per page load, from `StorageAccessProvider` in the root layout) and by `POST /api/storage/reset`, never by anything else. A second `ok: false` from the handshake means the browser blocks cookies: `useStorageAccess()` then says `readOnly`, the shell shows a banner under the top bar, and every write control is disabled. Every client-side write in the seams awaits the handshake first (`beforeWrite`), and a write route without a valid cookie answers 403.
- **Definitions are rendered on the server.** Every form page reads the visitor's definition with `loadSurveyJson` and passes it down (`schema` to `SurveyForm` and `RecordsView`, `survey.json` to the embedded demos), so every form page renders per request and there is no client-side swap. The two editors still load on mount, into the Monaco text or Creator.
- **Records.** `listResults(collectionId)` returns `{ id, columns }`, `getResult` the whole response as `data`. `listResults`, and `getResult` for the first row, run in the records pages' server components; opening another row and the mutations run in the browser. `RecordsView` shows a refused or failed storage call under the form's heading and leaves the form as it was.
- **Documents.** `keepSourceDocument(file, readAt, collectionId)`: a sample keeps its public `/samples/...` URL; an upload is stored as a blob and linked as `/api/storage/documents/<uuid>`, served to whoever has the URL under `Content-Security-Policy: sandbox` and `nosniff`. Only PDF, PNG, JPEG and WebP are stored, decided by the bytes.
- **Writes, caps and cleanup.** Every write route goes through `writeAsVisitor`: in one `BEGIN IMMEDIATE` transaction, the first-write copy, the write, `touchVisitor` and the total. The caps are 1 MB per JSON value (bytes, not characters), 8 MB per document (`MAX_DOCUMENT_BYTES`, which `/api/extract` uses too) and 50 MB per visitor; over one, 413 with the message the UI shows. Reset demo data deletes the visitor row (everything cascades) and issues a new id. Visitors idle for `STORAGE_TTL_DAYS` (14) are removed after a committed write, at most once an hour, or by `npm run storage:gc`. `SCHEMA_VERSION` in `sqlite.ts`: bump it when the tables change, and a database at another version is dropped and recreated.
- **Session users** are `listSessionUsers(scope)`: the users a page may be rendered for, first one signed in, keyed by collection id. In your app it is `getSession()` and returns one. A page passes them to `RecordsView` as `users`, and the form gets the active one as `user_…` variables, one per field, through `toVariables`. One scope has users: `leads`, a sales rep in USD and a manager in EUR (`LEADS_USERS`, declared in `src/schemas/variables/leads.ts` beside the presets built from the same list, and re-exported by `session.ts`).
- **Tests.** Playwright's configs point `DATABASE_PATH` at one temp file per run, shared by the server and the test process, so specs read with SQL what the browser stored; `e2e/session.ts` gives a request context its cookie before it writes. A dev server left running is reused and brings its own database.

## Adding a schema

1. Write `src/schemas/<id>.ts` exporting the JSON and a `SchemaDefinition` (`id`, `title`, `description`, `json`).
2. Export both from `src/schemas/index.ts` and add the definition to `schemaRegistry`.
3. Optional: seed answers in `src/schemas/data/<id>-seed.ts`, exported the same way.
4. Add it to `src/components/configure/forms.ts` so the editor can open it.
5. If documents are read into it, give the survey and each question an `aiHint`. It is a registered property, on `survey` and `question` only, because those are the two places the extractor reads it; on a page, a panel or a matrix column the linter reports it as `property/unknown`. The next custom property goes in `src/schemas/custom-properties.ts`, which every model, the linter and the full edition's Creator import.

## Adding a page

1. Add a row to one of the groups in `navGroups` in `src/schemas/navigation.ts`, and its icon to `ICONS` in `Sidebar.tsx`. A **page** (`NavPage`) has a `path`, a `layout` and, if it renders one form, the `schemaId`: `"shell"` for a page inside the admin chrome, `"embedded"` for one that pretends to be somebody else's site. A **link** (`NavLink`) to another site has an `href` instead, kept in `src/lib/site.ts`. The sidebar renders every group from that list, and the top bar's "Source of this page" link finds a page's file from `navPages`. A row opens in a new tab, and shows ↗, exactly when `opensInNewTab` says so — a link or an embedded page; never special-case a row in the component. A row for a commercial product's demo sets `edition: "full"` (Edit together, which is Survey Creator), and `navGroups` drops it in the MIT edition.
2. Create `src/app/(shell)/<route>/page.tsx`. For a form, read the nav entry with `getFormNavItem`, the visitor's definition with `loadSurveyJson` (falling back to `getSchemaDefinition`), then render `PageHeader` and `SurveyForm`; `starter/page.tsx` is about fifteen lines, so copy it. A page that is not built yet renders `NotImplemented` with the row's label and description; no page does today. Every page exports `metadata = pageMetadata(nav.id)`; give it a title and description in `PAGE_COPY` in `src/lib/metadata.ts`, or it falls back to the sidebar label and description.
3. An `"embedded"` page must not wear the admin chrome, so it goes outside the `(shell)` group, as `/embedded/*` does. `layout` only describes the page — the folder is what Next.js obeys — and `e2e/top-bar.spec.ts` fails when the two disagree.
4. Add the route to `e2e/initial.spec.ts`, which asserts that the survey markup is in the HTML the server sent, and the row to the expected list in `e2e/sidebar.spec.ts`.
5. Renaming a route? Add the old path to `redirects()` in `next.config.mjs`, and to the `legacy redirects` block of `e2e/sidebar.spec.ts`.

## Adding a records page

A records page is a rail of stored records and one form that views, edits and adds them. `/work-orders` is the example; copy it.

1. **The schema**, as in **Adding a schema**.
2. **The seed**, `src/schemas/data/<id>-seed.ts`: a `SurveyResult[]` of `{ id, data }`. Write documents only; the columns are derived.
3. **The collection**, `src/schemas/collections/<id>.ts`, a `RecordCollection`: its storage `id`, `schemaId`, `noun`, the list `columns` (`id`, `text`, `badge` with tones, `money` with an optional `currencyKey`, `date`), `rail` (which columns the rail shows: a `primary` key for the first line and `secondary` keys for the second; every column is still derived and stored), `titleKey`, `toColumns(id, data)`, `newId(existing)`, `newRecord(id, user)` for the defaults of a new record, an optional `compare` for list order, and the `seed`. A collection that documents are read into can add `fromDocument`; see **From a document** below. Defaults a new record takes from the signed-in user belong in `newRecord`, not in `defaultValueExpression`, so opening an existing record never re-derives an answer.
4. **Register it** in `recordCollections` in `src/schemas/records.ts`.
5. **Describe it** in `HOW_BUILT` in `src/lib/how-built.ts`: the data in, the data out and the feature chips. The variables are not written there: the panel takes their names from the form's variable presets and lists the references it finds. A chip is `status: "shown"` or `"coming"`, and one only an edition has sets `edition`.
6. **The pages**, about fifteen lines each: `src/app/(shell)/<route>/page.tsx` and `src/app/(shell)/<route>/[id]/page.tsx`. Both read `listResults(id)`, the visitor's definition with `loadSurveyJson(collection.schemaId)`, and, if the page has users, `listSessionUsers(id)` on the server, and render `RecordsView` with them, `schema` and `basePath={nav.path}`. The index page reads `getResult` for the first row and renders it in place; the URL stays the base path, with no redirect. The `[id]` page reads `getResult` for its id and, when the server holds no such record, for the first row instead: never `notFound()`, and `RecordsView` then replaces the URL with that record's. Both export `pageMetadata(nav.id)`, so a record's URL is canonical to the page. `RecordsView` renders the page header too. `work-orders/page.tsx` and `WorkOrdersView.tsx` show the optional props: `exportPdf` to replace the generic PDF export (Work orders passes `features.exportWorkOrderPdf`), `documentImport` for adding a record from a document (below), `formNote` under the form's heading. `leads/page.tsx` shows `users`.

**Layout.** From `xl` (1280px) the rail is a 260px column beside the form; below `xl` it is `RecordPicker`, a dropdown above the form. Both are in the server HTML and CSS hides one. The breakpoint is the shadcn adapter's `--sd-mobile-width` (640px): beside a rail at `lg` the form would be 420px wide and every matrix would turn into stacked cards, while at 1280px it is 676px. The rail shows `rail.primary` and `rail.secondary` and holds links only; Edit and Delete sit in the form's header, for the open record. Only the form is inside the "SurveyJS renders this" outline (`survey-outline/`); the heading, the actions and the note are the application's.

**The URL is where the selection lives.** `basePath` shows the first record, `basePath/<id>` one record (`recordHref` in `src/lib/routes.ts`). `RecordsView` moves between records with `window.history.pushState` and `replaceState`, which Next.js syncs into `usePathname`, and **never with `next/link` or `router.push`**: those re-render the server component on every click, and the form, the rail and the unsaved-changes guard would all start over. Before every write the app records what the URL names, so its own writes never trigger a transition; Back and Forward do, through the same unsaved-changes guard as a click, and dismissing that dialog pushes back the URL of what is still on screen. A Back target that is gone replaces the URL with the open record's.

**From a document.** `documentImport` is `{ label, segment, render }`. `label` is the header's filled button ("Add from document"); `segment` is the panel's URL under the page (`/work-orders/from-document`, a static route that renders the index page's data with `initialImport`); `render` receives `createFrom(data, source?)`, which stores a new record made from answers read off `source` and opens it for editing at its own URL, and `onBusyChange(busy)`. The panel takes the form column's place and unmounts the form. While a reading is in flight nothing in the page leaves the panel: Close, New and the dropdown are disabled, rail links are `aria-disabled`, and Back puts the panel's URL back. Close returns to the record and the exact URL the panel was opened from. Empty answers are dropped first. Without `fromDocument` on the collection, `newId` names the record and `newRecord` wins over every answer. With it, the id is `fromDocument.id(data, existing)` when the document carries a usable one, else `newId`, and the record is `{ ...newRecord(id, user), ...answers, ...fromDocument.pinned(id, source) }`: the defaults fill only what the document left blank, and `pinned` (the id, the draft status, `sourceDocument` and `importedAt`) wins over everything, so a document can neither complete a record nor forge where it came from. Work orders keep a sheet's printed job number and labor rate this way.

`RecordsView` subscribes to no SurveyJS event. It snapshots `model.data` when the form loads and asks before discarding a change. Switching user rebuilds the form with the answers on screen, saved or not. The header's Save validates every page before completing. Switching user keeps the page the viewer was on.

**Row identity.** A collection that lists `rowIdContainers` (Leads: `contacts`, `lineItems`, `competitors`, `securityReview`, `activities`) has every item of those arrays given a UUID `id` by `saveResult`, through the pure `assignRowIds`; the definition declares a hidden `id` column or field in each, so the model carries the value through edits. A row added in the form has no id until the record is saved. Never derive an id from an index, never enable `copyDefaultValueFromLastEntry` on such a container, and use no SurveyJS event for it.

**Calculated values settle before the mode is set.** `createSurveyModel` loads the data, builds every matrix's rows, and only then sets `mode`: survey-core runs no `expression` question in display mode, and a matrix computes its cell expressions only once its rows exist. Without that, a record opened for viewing shows 0 for every total, and one opened for editing changes its own data when the viewer reaches the matrix page.

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
| `exportWorkOrderPdf?(data)` | Work orders' "Save as PDF": the record printed onto the job sheet, and the note under the form about it | undefined — neither renders |
| `analyticsHref?(formId)` | "View analytics" in the page header and "Analytics" in the demo toolbar | undefined — no link renders |

**It contains no React, no JSX and no CSS imports**, and statically imports nothing heavy, because Playwright imports it from `e2e/` outside any bundler. A function an edition adds loads its libraries with a dynamic `import()` when it is called.

What reads it:

- `src/components/TopBar.tsx` — the edition pill, the switch link, "Source of this page", `data-edition`. The demo's name and the site links are the same in every edition, so they live in `src/lib/site.ts`, not here.
- `src/components/PageHeader.tsx` — the editor button, and the analytics button when a page passes `analyticsHref`
- `src/app/(shell)/starter/page.tsx` — passes `analyticsHref={features.analyticsHref?.(nav.schemaId)}`
- `src/components/records/RecordsView.tsx` — `analyticsHref` for its page header, and `exportPdf` for the header's "Save as PDF" when the page passes no export of its own
- `src/components/WorkOrdersView.tsx` — `exportWorkOrderPdf`, passed to `RecordsView` as its `exportPdf`
- `src/schemas/navigation.ts` — `edition`, which drops the rows marked for the other edition from `navGroups`
- `src/lib/how-built.ts` — `itemsInEdition`, the data-in and data-out items the panel lists
- `src/components/SurveyForm.tsx` — `usePdfAction`, switched off per form with `pdfInNavigation={false}`, as every records page does: there the PDF is the record's, in the header
- `src/components/embedded/shared/useDemo.ts` — `trackAnswers`, and `onExportPdf` / `analyticsHref` in `dockProps`
- `src/components/embedded/shared/DemoDock.tsx` — the editor link, and the PDF and Analytics buttons when those props are set
- `src/components/configure/forms.ts` — `SOURCE_ROOT`, from `brand.sourceUrl`
- `src/lib/metadata.ts` — `edition`, which picks the title suffix and the copy that differs per edition. See **Page metadata**.
- `e2e/warm-dev-routes.ts` — adds the analytics route only when `analyticsHref` is defined
- `e2e/initial.spec.ts` — the editor link's name and the editor's ready selector; `e2e/configure.spec.ts` and `e2e/lint.spec.ts` skip themselves unless `edition` is `"mit"`

`src/lib/routes.ts` holds `configureHref`, `recordHref`, `otherEditionHref` and `pageSourcePath` (which maps a record's URL to its page's file); the analytics link belongs to the config.

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
- **Template suppressions.** `templateSuppressions(json)` silences one thing this template writes on purpose, at its own path, through the linter's own `suppress` option: an `autocomplete` with an HTML `shipping`/`billing` section token whose field name is valid. `aiHint` needs no suppression: it is a registered property (`src/schemas/custom-properties.ts`, imported by `lint-survey.ts`), so a hint where the extractor never reads it is reported. A misspelled one is still reported. Add to it only for something deliberate, never to make a real finding go away.
- **On the client, this edition** draws `src/components/lint/StaticAnalysisBar.tsx` under the Monaco editor on `/configure`. `src/lib/lint/monaco-adapter.ts` maps a finding's JSON path to a line.
- **On the server, `/api/lint`** (`src/app/api/lint/route.ts`) runs the same call. It is `POST { json, variablePresets? }` → `{ ok, findings }`, where `ok` means no finding at all. That is the same test that makes the status bar say "all checks passed". `src/storage/survey-json.ts` shows a real `saveSurveyJson` calling it before storing. `e2e/lint-api.spec.ts` covers it and runs in both editions.
- **`src/lib/lint/try-breaking-it.ts`** makes a finding appear on demand. It is pure JSON mutation with no imports. The editor's "Try breaking it" buttons use it, and so does the API spec.
- **The full edition** lints through the same `/api/lint` route today, which is shared code. Survey Creator 3.1 has no lint UI; it gets these rules inside Creator when that release ships, and will need the same presets and `templateSuppressions`. The Monaco front end is copied there and used on `/definition` only.

The variable context travels with the definition. A personalized form reads variables nothing in its JSON declares, so the caller sends the form's variable presets beside it: the status bar passes `getVariablePresets(form.id)` to `lintSurveyJson`, and a client of `/api/lint` posts the same object as `variablePresets`. Without it a personalized definition reports unknown `{user_…}` references. `e2e/lint-api.spec.ts` posts every form in `FORMS` with its presets and expects no finding, in both editions.

### Variable presets

`src/schemas/variables/` says what the host injects into each personalized form, as an `ISurveyVariablePresets` of `survey-core`: a **definition**, one ordinary survey JSON, and named **presets** of values for it. `getVariablePresets(schemaId)` finds a form's presets the way `getSchemaDefinition` finds its JSON; they are constants. `cadence.ts` serves the feedback form, `patient.ts` both clinic forms (derived from `patientRecordJson` and `CLINIC_PATIENTS` with `toVariableDefinition` and `toVariables`, not copied), `leads.ts` the lead record.

- **A variable is a top-level question of the definition**, named by its data key. The linter, the preset selector on `/configure`, the demos' "Login as" list and "Edit the user" popup (which renders the definition), and the full edition's Survey Creator all read that one object.
- **The user is flattened, with a prefix.** One variable per field, `user_<field>`, because a variable read by path (`{user.firstName}`) would be one opaque entry to every consumer. The prefix keeps a variable from colliding with a question: the clinic form has its own `firstName`. `prefix.ts` holds `toVariables` and `fromVariables`; a plain account (a `SessionUser`, a stored patient) is converted exactly once, where it is published or where a preset is built, and a preset's `variables` are published as they are. A key reading `user_user_…` is that mistake.
- **A label is not a variable.** An account carries `plan: "business"`; a form that shows "Business" declares a calculated value with `includeIntoResult: false` and `labelExpression(...)`, a chain of `iif` over the choices (`planLabel`, `languageLabel`, `healthPlanLabel`). Its fallback must not be empty: survey-core renders an empty calculated value as the raw `{name}`.
- **The runtime values still come from the session.** A page gets who it is rendered for from `listSessionUsers` and publishes it with `setVariable`; the presets declare the variables and give test values, nothing more.
- **The tester** takes the same object (`ISurveyTests.variablePresets`), so a personalized suite in `src/schemas/tests/` can name a preset instead of repeating its values. None is written yet.
- `e2e/variable-presets.spec.ts` runs without a browser, in both editions: every preset validates against its definition, every key carries the prefix once, and every personalized definition is clean with its presets and not without them.

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
npm run assets:work-order        # re-render the job sheet's signatures and samples
npm run storage:gc               # remove visitors idle for STORAGE_TTL_DAYS
node scripts/check-mit-pure.mjs  # no commercial SurveyJS packages
```

There is deliberately no `package-lock.json`. Every SurveyJS package is pinned to `latest` so the template always shows the current library, and a lock file would freeze what that means. `.npmrc` sets `package-lock=false`, so `npm install` neither reads nor writes one, and `/package-lock.json` is in `.gitignore`. The cost is accepted: installs are not reproducible, and a bad upstream release breaks a fresh clone until it is fixed upstream.

## Environment

Copy `.env.example` to `.env.local`. It documents nine variables, in four groups.

**Page metadata, both editions.** `NEXT_PUBLIC_SITE_URL` is this host. Set it on every deployment: canonicals and `og:url` are built from it, and without it they say `http://localhost:3000`. `NEXT_PUBLIC_CANONICAL_URL` and `NEXT_PUBLIC_INDEXABLE` are optional; see **Page metadata**. All three are inlined at build time, so a change needs a rebuild. The edition is not among them: it is `features.edition`, a constant, so a build cannot call itself the other edition.

**Server-side, for `/api/extract`, in both editions.** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — set one, not both — enables the route that reads answers off an uploaded document; whichever is present picks the provider. `EXTRACTOR_MODEL` optionally overrides the model; without it the route uses its per-provider default (see `src/app/api/extract/route.ts`). Leave it commented out rather than empty: an empty string survives the route's `??` fallback and asks the provider for a model named `""`. With neither key set the route answers 501 and the buttons on `/work-orders` say so. A successful reading also returns `readAt`, the server's clock in UTC (`YYYY-MM-DDTHH:mm`), which the record stores as `importedAt`. None of these reach the browser.

**Server-side, for storage, in both editions.** `DATABASE_PATH` is the SQLite file, default `.data/demo.db` (the directory is created; `:memory:` for a throwaway run). `STORAGE_TTL_DAYS` is how many idle days a visitor's sandbox survives, default 14. Node 24.16 or later is required, and `.npmrc` sets `engine-strict`: earlier 24.x `node:sqlite` truncates stored text at a NUL character, and `sqlite.ts` refuses to open on it. The template runs in a docker container whose writable layer holds the database, so a new container starts empty; see the README's **Deployment**.

**`SURVEYJS_KEY` — the SurveyJS license key.** When it is set, `src/lib/surveyjs-license.ts` applies it with `slk` from `survey-core`; unset or blank, nothing is applied. `SurveyForm` and `EmbeddedSurvey` import that file for its side effect, so the key is applied on every page that renders a form, on the server and in the browser; any other module that renders SurveyJS (the full edition's Creator, Dashboard and PDF export) imports it the same way. It reaches the browser, forwarded by the `env` block in `next.config.mjs` rather than by a `NEXT_PUBLIC_` prefix, so the two must be renamed together. `slk` is exported by `survey-core` itself, so the code is MIT-clean, and the two editions differ by a key rather than by code.
