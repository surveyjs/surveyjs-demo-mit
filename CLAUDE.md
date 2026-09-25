# SurveyJS + Next.js template

A Next.js App Router application that shows the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) inside a product rather than on its own: an admin shell with real pages, three demos of a survey embedded in somebody else's website, seven form definitions, and one editor for all of them. Forms are JSON, rendered on the server, themed with shadcn/ui through the SurveyJS theme adapter.

This repository is MIT-licensed and depends on `survey-core` and `survey-react-ui` only. See **Extension points** below for how the commercial features attach.

## Layout

| Path | What lives there |
|---|---|
| `src/app` | Routes. The `(shell)` group is the admin chrome (`/leads`, `/work-orders`, `/starter`, `/definition`, `/mysurveys` in the full edition, plus each records page's `[id]` route for one record and `/work-orders/from-document` for the import panel; plus `/how` and one `/x/how` per example, the "how it's built" explainers, which are in the shell even for an embedded demo); `/embedded/*` is deliberately outside it (and `/embedded/clinic` renders in the language its patient's chart asks for — see **Two languages on the clinic page**), and so is `/`, which forwards to `/leads`; `/configure` is the per-form editor every form's editor button opens; legacy paths redirect in `next.config.mjs`; `/api/extract` reads answers off a document; `/api/lint` runs static analysis on a definition; `/api/storage/*` are the storage routes the browser calls (see **Storage**); `robots.ts` serves `/robots.txt`. |
| `src/components` | React. `AdminShell`, `TopBar` and `Sidebar` are the chrome, `how-built/` the two server components that render the "how it's built" explainers (`HowPage`, which renders one example's Markdown, and `HowIndex`), `SurveyForm` the one way a survey is rendered in the shell, `records/` the shared records page (`RecordsView`; the rail beside the form, `RecordRail` and `RecordRailItem`, and `RecordPicker`, the dropdown that replaces it below `xl`; `ColumnValue`, how a column's value renders; and the header's user switcher), `survey-outline/` the "SurveyJS renders this" outline the embedded demos and the records pages draw around a form, `WorkOrdersView` a thin wrapper over `RecordsView` that adds the import panel, and the job sheet export where the edition has one, `extract/` the extraction panel and its sample documents, `NotImplemented` the panel of a page not built yet (unused since `/leads` was built), `configure/` the editor (also rendered inside the shell on `/definition`), `embedded/` the three host sites and their shared toolbar, `ui/` the shadcn primitives. |
| `src/schemas` | The form definitions and everything about them: one file per form, seed answers under `data/`, test cases under `tests/`, the `createSurveyModel` factory, the registry of test suites (`tests/index.ts`), the nav table, the registry that maps a schema id to a definition, and the records pages' collections (`records.ts`, one module per collection under `collections/`), and `custom-properties.ts`, the properties this template registers with SurveyJS (`aiHint`). Depends on `survey-core` only — no UI framework here. |
| `src/features` | The edition config: which editor, brand and optional commercial actions this edition has. See **Extension points**. |
| `src/lib` | Helpers with no React: route builders (`routes.ts`, including the other-edition link and a page's source file), the demo's name and site links (`site.ts`), page titles and social tags (`metadata.ts`), the explainers' Markdown loader (`how-content.ts`) and the fixed wording and definition walk it and the specs share (`how-built.ts`), the survey-core linter adapter (`lint/`), the checks every write route runs before it stores anything (`checks/`, see **Validation**), the license-key loader. |
| `src/storage` | The seams to your storage, the one backend they share (`backend/sqlite.ts`, `backend/visitor.ts`), and the browser's handshake (`access.ts`). See below. |
| `src/archive` | Code kept but not wired: the CMS-1500 claim, with a README on re-registering it. It type-checks with the build, and nothing outside it imports it. |
| `src/styles` | App-local CSS on top of the theme adapter. |
| `how` | One Markdown file per example: everything a `/x/how` page says about it, editable without knowing TypeScript. `how/README.md` is the conventions. See **How it's built**. |
| `e2e` | Playwright. `initial.spec.ts` walks every route, `storage.spec.ts` covers per-visitor storage end to end (cookies, server rendering, resets, caps, uploads, a browser that blocks cookies) and `storage-backend.spec.ts` the backend without a server, `records.spec.ts` covers the shared records page (the rail, record URLs and Back, the import panel, the outline), with what a work order adds, `work-order-sheet.spec.ts` the job sheet's data without a browser (seed totals, the sample documents, the ids a record may not have), `how-integrity.spec.ts` the "how it's built" Markdown without a browser (every repository link on disk, every quoted block equal to what the definition says, every route a route, the front matter, the TODOs) and `how-built.spec.ts` the explainers in one, `custom-properties.spec.ts` the registered `aiHint`, `clinic-locale.spec.ts` the clinic page in two languages (the switch, the personas, the fold) and, without a browser, that no shipped definition renders a localized object into a string, `leads.spec.ts` the CRM record on `/leads` (totals, the economic-buyer rule, roles, row ids), `server-checks.spec.ts` what the write routes refuse and that a refusal stores nothing, the others cover the editor, the linter (its front end and `/api/lint`) and the extractor. |
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
- **Writes are checked first.** Every write route checks what it is asked to store before it stores it, in `src/lib/checks/`: a response against the definition it answers (`checkResponse`), a definition against the linter and the form's test suite (`checkDefinition`). A refusal is **422** with `{ error, check, first, count }`, and nothing is written — no record, no definition, and no visitor row for a visitor who had none. The order inside a route is by cost: `assertWithinValueLimit` first, so an oversized body is a 413 that no check ever ran on, then the checks, then the write. See **Validation**.
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

1. Add a row to one of the groups in `navGroups` in `src/schemas/navigation.ts`, and its icon to `ICONS` in `Sidebar.tsx`. A **page** (`NavPage`) has a `path`, a `layout` and, if it renders one form, the `schemaId`: `"shell"` for a page inside the admin chrome, `"embedded"` for one that pretends to be somebody else's site. A **link** (`NavLink`) to another site has an `href` instead, kept in `src/lib/site.ts`. The sidebar renders every group from that list, and the top bar's "Source of this page" link finds a page's file from `navPages`. A row opens in a new tab, and shows ↗, exactly when `opensInNewTab` says so — a link or an embedded page; never special-case a row in the component. A row for a commercial product's demo sets `edition: "full"` (Edit together, which is Survey Creator; MySurveys, an application built with Creator and Dashboard), and `navGroups` drops it in the MIT edition. A page behind such a row is still shared code, so it must survive the edition that has no row: `mysurveys/page.tsx` looks its row up in `navPages` instead of calling `getNavItem`, which throws, exports empty metadata without it and answers `notFound()`. A page that renders no form leaves `schemaId` out (`/definition`, `/mysurveys`); its copy lives in `src/lib` with no React (`mysurveys.ts`) so its spec asserts what it renders.
2. Create `src/app/(shell)/<route>/page.tsx`. For a form, read the nav entry with `getFormNavItem`, the visitor's definition with `loadSurveyJson` (falling back to `getSchemaDefinition`), then render `PageHeader` and `SurveyForm`; `starter/page.tsx` is about fifteen lines, so copy it. A page that is not built yet renders `NotImplemented` with the row's label and description; no page does today. Every page exports `metadata = pageMetadata(nav.id)`; give it a title and description in `PAGE_COPY` in `src/lib/metadata.ts`, or it falls back to the sidebar label and description.
3. An `"embedded"` page must not wear the admin chrome, so it goes outside the `(shell)` group, as `/embedded/*` does. `layout` only describes the page — the folder is what Next.js obeys — and `e2e/top-bar.spec.ts` fails when the two disagree.
4. **Describe it** in `how/<route-with-dashes>.md`, and add `src/app/(shell)/<route>/how/page.tsx` — three lines around `HowPage`. Every page has a file and every file a page, and `e2e/how-integrity.spec.ts` fails without one. See **How it's built**, and `how/README.md` for the conventions.
5. Add the route to `e2e/initial.spec.ts`, which asserts that the survey markup is in the HTML the server sent, and the row to the expected list in `e2e/sidebar.spec.ts`. The explainers come from `navPages` there, so they need no line of their own.
6. Renaming a route? Add the old path to `redirects()` in `next.config.mjs`, and to the `legacy redirects` block of `e2e/sidebar.spec.ts`.

## Adding a records page

A records page is a rail of stored records and one form that views, edits and adds them. `/work-orders` is the example; copy it.

1. **The schema**, as in **Adding a schema**.
2. **The seed**, `src/schemas/data/<id>-seed.ts`: a `SurveyResult[]` of `{ id, data }`. Write documents only; the columns are derived.
3. **The collection**, `src/schemas/collections/<id>.ts`, a `RecordCollection`: its storage `id`, `schemaId`, `noun`, the list `columns` (`id`, `text`, `badge` with tones, `money` with an optional `currencyKey`, `date`), `rail` (which columns the rail shows: a `primary` key for the first line and `secondary` keys for the second; every column is still derived and stored), `titleKey`, `toColumns(id, data)`, `newId(existing)`, `newRecord(id, user)` for the defaults of a new record, an optional `compare` for list order, and the `seed`. A collection that documents are read into can add `fromDocument`; see **From a document** below. Defaults a new record takes from the signed-in user belong in `newRecord`, not in `defaultValueExpression`, so opening an existing record never re-derives an answer.
4. **Register it** in `recordCollections` in `src/schemas/records.ts`.
5. **Describe it** in `how/<route-with-dashes>.md`. See **How it's built** below; a records page opens its file with the sentence about the list beside the form, which is this application's own React component rather than a SurveyJS one.
6. **The pages**, about fifteen lines each: `src/app/(shell)/<route>/page.tsx` and `src/app/(shell)/<route>/[id]/page.tsx`. Both read `listResults(id)`, the visitor's definition with `loadSurveyJson(collection.schemaId)`, and, if the page has users, `listSessionUsers(id)` on the server, and render `RecordsView` with them, `schema` and `basePath={nav.path}`. The index page reads `getResult` for the first row and renders it in place; the URL stays the base path, with no redirect. The `[id]` page reads `getResult` for its id and, when the server holds no such record, for the first row instead: never `notFound()`, and `RecordsView` then replaces the URL with that record's. Both export `pageMetadata(nav.id)`, so a record's URL is canonical to the page. `RecordsView` renders the page header too. `work-orders/page.tsx` and `WorkOrdersView.tsx` show the optional props: `exportPdf` to replace the generic PDF export (Work orders passes `features.exportWorkOrderPdf`), `documentImport` for adding a record from a document (below), `formNote` under the form's heading. `leads/page.tsx` shows `users`.

**Layout.** From `xl` (1280px) the rail is a 260px column beside the form; below `xl` it is `RecordPicker`, a dropdown above the form. Both are in the server HTML and CSS hides one. The breakpoint is the shadcn adapter's `--sd-mobile-width` (640px): beside a rail at `lg` the form would be 420px wide and every matrix would turn into stacked cards, while at 1280px it is 676px. The rail shows `rail.primary` and `rail.secondary` and holds links only; Edit and Delete sit in the form's header, for the open record. Only the form is inside the "SurveyJS renders this" outline (`survey-outline/`); the heading, the actions and the note are the application's.

**A record id is a path segment.** Static routes live under a records page — `/work-orders/how` is the explainer and `/work-orders/from-document` the import panel — so `RESERVED_RECORD_IDS` in `src/schemas/records.ts` lists what a record may not be called. No `newId` can produce one, and `fromDocument.id` refuses one: a document must not be able to name a record after a route. `e2e/work-order-sheet.spec.ts` covers it.

**The URL is where the selection lives.** `basePath` shows the first record, `basePath/<id>` one record (`recordHref` in `src/lib/routes.ts`). `RecordsView` moves between records with `window.history.pushState` and `replaceState`, which Next.js syncs into `usePathname`, and **never with `next/link` or `router.push`**: those re-render the server component on every click, and the form, the rail and the unsaved-changes guard would all start over. Before every write the app records what the URL names, so its own writes never trigger a transition; Back and Forward do, through the same unsaved-changes guard as a click, and dismissing that dialog pushes back the URL of what is still on screen. A Back target that is gone replaces the URL with the open record's.

**From a document.** `documentImport` is `{ label, segment, render }`. `label` is the header's filled button ("Add from document"); `segment` is the panel's URL under the page (`/work-orders/from-document`, a static route that renders the index page's data with `initialImport`); `render` receives `createFrom(data, source?)`, which stores a new record made from answers read off `source` and opens it for editing at its own URL, and `onBusyChange(busy)`. The panel takes the form column's place and unmounts the form. While a reading is in flight nothing in the page leaves the panel: Close, New and the dropdown are disabled, rail links are `aria-disabled`, and Back puts the panel's URL back. Close returns to the record and the exact URL the panel was opened from. Empty answers are dropped first. Without `fromDocument` on the collection, `newId` names the record and `newRecord` wins over every answer. With it, the id is `fromDocument.id(data, existing)` when the document carries a usable one, else `newId`, and the record is `{ ...newRecord(id, user), ...answers, ...fromDocument.pinned(id, source) }`: the defaults fill only what the document left blank, and `pinned` (the id, the draft status, `sourceDocument` and `importedAt`) wins over everything, so a document can neither complete a record nor forge where it came from. Work orders keep a sheet's printed job number and labor rate this way.

`RecordsView` subscribes to no SurveyJS event. It snapshots `model.data` when the form loads and asks before discarding a change. Switching user rebuilds the form with the answers on screen, saved or not. The header's Save validates every page before completing. Switching user keeps the page the viewer was on.

**Row identity.** A collection that lists `rowIdContainers` (Leads: `contacts`, `lineItems`, `competitors`, `securityReview`, `activities`) has every item of those arrays given a UUID `id` by `saveResult`, through the pure `assignRowIds`; the definition declares a hidden `id` column or field in each, so the model carries the value through edits. A row added in the form has no id until the record is saved. Never derive an id from an index, never enable `copyDefaultValueFromLastEntry` on such a container, and use no SurveyJS event for it.

**Calculated values settle before the mode is set.** `createSurveyModel` loads the data, builds every matrix's rows, and only then sets `mode`: survey-core runs no `expression` question in display mode, and a matrix computes its cell expressions only once its rows exist. Without that, a record opened for viewing shows 0 for every total, and one opened for editing changes its own data when the viewer reaches the matrix page.

## How it's built

Everything this template says about how an example is built is in **one Markdown file** per example, in `how/` at the repository root, named after the route: `/leads` → `how/leads.md`, `/embedded/chart` → `how/embedded-chart.md`. No prose about an example lives anywhere else, so nothing can drift from anything — and a person can open the file, read it top to bottom and edit it without knowing TypeScript, on GitHub's own Markdown preview included. `how/README.md` states the conventions in half a page; read it before editing a file.

There is no drawer. The top bar carries a link instead, and never more than two page actions at once (`isHowRoute` in `routes.ts` decides, and `pageSourcePath` asks it first):

| Where | What the top bar offers |
|---|---|
| an example | "Source of this page" and **"How this page is built"**, straight to that page's explainer in this tab — a record's URL links its page's, `/leads/LEAD-0001` → `/leads/how` |
| an explainer | **"How every page is built"** alone: this page is what the link above would open, and its route file is three lines, so "Source of this page" would point at the wrong thing — what a reader wants is `how/<route>.md`, which every repository link on the page already reaches |
| `/how` | nothing; it is what the second link opens |

The two are worded in parallel on purpose, because the only thing that differs between them is *this page* against *every page*. The index is offered on an explainer only: beside "How this page is built" on the example it would be a second, vaguer version of it.

- **the loader**, `src/lib/how-content.ts` — reads the file with `fs`, splits the two-key front matter off it, applies the edition rule and hands back `{ nav, summary, body }`. React-free, and it must stay out of every client bundle: `server-only` is not importable from Playwright, so the rule is kept by hand — never import it from a `"use client"` file. Files are read at **build time**, so an edit needs a rebuild, like every other page here, and the production image needs no `how/` directory at runtime.
- **the page**, `/x/how` (`HowPage`) — a server component that renders the body with `react-markdown` and `remark-gfm` and a small components map. "Open this example" is the one control at the top; previous / next / "All examples" sit at the foot, where a long page deserves a way out. The route file is three lines. It lives in the shell even for an embedded demo, whose dock links it in a new tab rather than drawing anything over somebody else's website.
- **the index**, `/how` (`HowIndex`) — every example with its `summary`, read straight from the front matter. It has no Markdown file of its own, because it says nothing about any one example, and **no sidebar row**: it is the top bar's second link, on every page of the shell.

### The rules the files keep

`e2e/how-integrity.spec.ts` enforces all of them, without a browser, in both editions. The guarantee the typed modules bought is now this file's: a how page cannot quote a definition that no longer says that, link a file that is not there, or link a route that does not exist.

- **Front matter is two keys.** `nav` is the sidebar row's id; `summary` is one sentence, 200 characters at most, and it is the meta description, the lead paragraph and the index card at once. The `<h1>` is not in the file — the page writes `<Label> — how it's built` from the row — so renaming the row renames the page.
- **The body is ordinary GitHub-flavoured Markdown.** Headings start at `##`; no raw HTML is rendered. The conventional sections are Data in, What the definition reads, Data out, Features, Source files and What your server does — a convention the README states, not something the parser enforces, and the two examples that render no form say "What the code reads" instead.
- **A relative link is a repository file, written relative to the Markdown file** (`../src/schemas/leads.ts`), so the same link works in GitHub's preview; the loader resolves it and the renderer rewrites it with `sourceHref`. A link starting with `/` is a route in this application. Anything else must be `https://` on the allow-list in the spec — `surveyjs.io` today; extend it there, with the reason.
- **A quoted block says what the repository says.** A fenced block whose info string carries `definition=budgetAmount.visibleIf` quotes the shipped definition of the page's `schemaId`, element and property as `collectProperties` prints them, splitting at the first dot. The text is written out in the file, so the file reads whole on GitHub, and the test fails when the definition no longer says that. For the two examples with no fixed form it is `file=<repo path>` instead, and the test fails unless the block occurs verbatim in that file.
- **Editions.** `<!-- edition: full -->` … `<!-- /edition -->` (and `mit`) wraps what only one edition ships — invisible in a Markdown preview, which is the point. In the other edition the loader keeps the block, de-links every repository link inside it (those files are not in this repository) and appends the badge "available in the …", linking the same explainer on that host. A feature the reader cannot have is a link across, never a gap. Blocks do not nest and wrap whole paragraphs or sections.
- **`<!-- TODO: what is missing -->` instead of filler**, on a line of its own where a sentence nobody has written would go. It renders as nothing; the test counts and prints each one and **passes**. A missing link is simply an absent link: no URL is invented, and none is keyed anywhere.
- **`*(coming)*` after a feature heading** is the whole of the status vocabulary. It is prose; nothing parses it. A feature heading used with two spellings is printed as a test annotation, not failed — consistency across files is a human's job.

`/mysurveys` is shared like everything else: `how/mysurveys.md` is in both editions, `/mysurveys/how` answers `notFound()` in this one exactly where its page does, and this edition's `/how` lists it as the Full edition's and links across.

## Two languages on the clinic page

`/embedded/clinic` is the one page here that is not English-only, and the language is not the page's choice: `preferredLanguage` on the patient's chart picks it (`chartLocale` in `src/schemas/clinic-locale.ts`, which maps `es` to Spanish and everything else — `vi`, `ru`, `zh` included — to English, because no other translation exists). The `EN | ES` switch in the header overrides that, and the override is keyed to the patient **and** to the chart's language: change either and it is deleted, so the data wins again. Spanish is therefore rendered on the server, from preset 0, before any JavaScript runs.

Three string tables, and every one of them has a reason to be where it is:

- **the definition**, `src/schemas/clinic-visit.ts` — every title, description, choice text and `html` is a `{ default, es }` object, which is what survey-core stores a localized string as. Inline, not in a side-car file: the definition is one JSON document, it is what `/configure` edits and what a visitor's storage holds, and the linter and Survey Creator both read localized strings natively. Values are never translated, so a request answered in Spanish reads back the same as one answered in English;
- **the shared lists**, `src/schemas/clinic-info.ts` — the reasons, days, times, specialties, conditions and medications the form's choices are generated from, plus the strings `visitSummaryFor` derives (the estimate line, the what-to-bring list). Translating the lists translates the form and the panel at once. `encounter-note.ts` and `patient-record.ts` read the same lists and resolve them with `textFor(…, "en")`: the clinician's workspace and the back office's chart stay English;
- **the host page**, `src/components/embedded/clinic/ridgeline-strings.ts` — the utility bar, header, banner, panel chrome and footer, typed as `Record<ClinicLocale, RidgelineStrings>` so a key translated in one language and forgotten in the other does not compile. Not in the definition, because a visitor who edits that JSON would otherwise be able to blank the page around the form.

survey-core's own strings (Next, Previous, "Response required.") come from `survey-core/i18n/spanish`, imported once in `createSurveyModel.ts` — it is a subpath of `survey-core`, so the MIT edition stays MIT.

The demo's own furniture is exempt and stays English in every locale: `DemoDock`, `DemoUserDialog` and `SurveyOutlineLabel` are the reviewer talking about the page, not the clinic talking to a patient. Each carries `lang="en"` so a screen reader does not read them with Spanish phonetics.

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
- `src/lib/how-content.ts` — `edition`, which decides whether a how file's `<!-- edition: … -->` block keeps its repository links or is de-linked and badged with a link to the same explainer on the other host
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

### What is enforced, and where

The browser checks first because that is where somebody is typing. The server checks again because that is where a rule is enforced: the form is one client of these endpoints, not their gatekeeper, and a request that never went through the form meets the same rules as one that did. Everything below is in `src/lib/checks/`, which imports `survey-core` and nothing else — no React, no Next.js — so a route, a script and a spec all call the same functions.

| Where | What it enforces | A refusal |
|---|---|---|
| `PUT /api/storage/results/:collection/:id` | `checkResponse`: the answers fit the definition, and are complete unless the collection calls the record a draft | 422 `{ error, check: "response", first, count }` |
| `POST /api/storage/submissions/:schema` | the same, for a form no records page owns | 422, the same shape |
| `PUT /api/storage/definitions/:schema` | `checkDefinition`: the linter, then the form's suite from `src/schemas/tests/` | 422 `{ error, check: "lint" | "tests", first, count }` |
| `POST /api/extract` | `sanitizeResponse`: a reading is dropped field by field, and the dropped fields are listed in `rejected` | 200, with less data |
| `POST /api/lint` | nothing. It advises; see below | — |

- **A response is checked in two layers, and only the second one uses a model.** `sanitizeResponse` walks the **raw payload** against the definition: for each key the question that owns it, and for each question type the JSON type and container shape its value may have. It has to be the payload rather than `model.data`, because assigning data to a model coerces and rebuilds it — a `ranking` given an unknown choice comes back as a full ranking nobody gave — and it has to come first, because `clearIncorrectValues` throws on a dynamic matrix whose rows are not objects. Only then is a model built (`createSurveyModel`, so variables, matrix rows and calculated values settle as they do in the page) and `validate` run for completeness. What survey-core does and does not check for itself is written up in `prompts/server-checks-survey-core-bugs.md`.
- **A rejection names the cell**, not the question: `lineItems[2].quantity`, `satisfaction.row1`. One bad choice in the third row of a matrix costs that cell; the other rows are stored.
- **Validation can be asynchronous, so the check is.** A validator that calls an async function is awaited, not refused — a definition a visitor's page can render must be one their answers can be stored under. The wait has a deadline (5 s), and **an unresolved verdict never permits a write**: survey-core calls the callback only when the function answers, so a validator that never does would otherwise hold the request open for ever.
- **The definition that decides is the visitor's own**, through `definitionFor` in `backend/visitor.ts`. The record route, the submissions route and `/api/extract` all call it, so extraction and storage can never disagree about a choice list: a visitor who added a choice on `/configure` has a page that offers it, a document read against a definition that knows it, and a write route that accepts it.
- **The values of `{user_…}` never come from the client.** `saveResult` sends the active session user's **id**; the route looks it up in `listSessionUsers(collectionId)` and converts it with `toVariables`. An unknown id is a 400, none means the first user, a collection with no users gets no variables. In your app this is `getSession()` and the body carries nothing about who is asking.
- **Only an `error` finding blocks a definition.** An author who has just added an empty panel has not broken the form, and `page/empty` is a `warning`. `/api/lint` keeps its stricter `ok` — "no finding at all", which is what makes the status bar say "all checks passed" — because it advises and the write route decides. The tests are not added to `/api/lint`.
- **A refused autosave is not a lost edit.** Survey Creator autosaves in the full edition and some of those saves are refused on purpose: the editor keeps the author's work, the definition on the server stays the last good one, and the next clean autosave stores it. Creator's condition editor never commits an expression it cannot parse, so in practice only its JSON tab produces such a save.
- **One sentence, everywhere.** `src/lib/checks/messages.ts` builds it — `Not saved: <first> (<where>). <n> more.`, or `Not stored:` for a response — and the API's `error`, the MIT editor's line, the records page's message and the Creator's toast are all that string. `storageError` in `src/storage/access.ts` turns a 422 into a `StorageRefusal`, a typed error carrying `check` and `first`, so the editor can select the finding rather than parse the sentence.
- `e2e/server-checks.spec.ts` covers all of it and runs in both editions: the shipped data, the sanitizer without a browser, and every route through the API with SQL underneath to prove that a refusal wrote nothing.

- **The engine is `survey-core/linter`**, a subpath export of `survey-core` and MIT-licensed. `lintSurvey(json)` and `getRules()` are headless, with no DOM and no renderer.
- **One entry point: `lintSurveyJson` in `src/lib/lint/lint-survey.ts`.** It is a framework-free wrapper that both front ends and the route call. Call `lintSurvey` directly nowhere else, or the editor and the server can disagree.
- **Template suppressions.** `templateSuppressions(json)` silences one thing this template writes on purpose, at its own path, through the linter's own `suppress` option: an `autocomplete` with an HTML `shipping`/`billing` section token whose field name is valid. `aiHint` needs no suppression: it is a registered property (`src/schemas/custom-properties.ts`, imported by `lint-survey.ts`), so a hint where the extractor never reads it is reported. A misspelled one is still reported. Add to it only for something deliberate, never to make a real finding go away.
- **On the client, this edition** draws `src/components/lint/StaticAnalysisBar.tsx` under the Monaco editor on `/configure`. `src/lib/lint/monaco-adapter.ts` maps a finding's JSON path to a line.
- **On the server, `/api/lint`** (`src/app/api/lint/route.ts`) runs the same call. It is `POST { json, variablePresets? }` → `{ ok, findings }`, where `ok` means no finding at all. That is the same test that makes the status bar say "all checks passed". It **advises**: it lints what it is sent and answers, and nothing has to call it before a save, because the write route checks for itself. `e2e/lint-api.spec.ts` covers it and runs in both editions.
- **`src/lib/lint/try-breaking-it.ts`** makes a finding appear on demand. It is pure JSON mutation with no imports. The editor's "Try breaking it" buttons use it, and so does the API spec.
- **The full edition** lints through the same `/api/lint` route today, which is shared code. Survey Creator 3.1 has no lint UI; it gets these rules inside Creator when that release ships, and will need the same presets and `templateSuppressions`. Until then the toast a refused save raises is where an author in that edition first meets a finding. The Monaco front end is copied there and used on `/definition` only.

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

`survey-core/tester` is the linter's sibling. It is headless too, and it runs behaviour tests against a real `SurveyModel`: answer this, then expect that to be visible or hold that value. It was published in `survey-core` 3.0.4, so every version the `^3.1.1` range installs has it.

**Where the suites run.** `checkDefinition` runs a form's suite against the definition a visitor is trying to store, after the linter and before the write: a definition that lints clean but no longer does what the form does is a 422 with `check: "tests"` and the test's name in the message. `e2e/server-checks.spec.ts` runs every suite against the definition that ships. Nothing else calls the tester, and `/api/lint` deliberately does not.

- Cases live beside the schemas, one file per schema, as `src/schemas/tests/<schema-id>.tests.json`. There is one so far, `checkout.tests.json`. See `src/schemas/tests/README.md`.
- **A form gets a suite by having a file there.** `src/schemas/tests/index.ts` is the registry: add the import and the entry, the way `schemaRegistry` maps an id to a definition. `getSurveyTests(schemaId)` is what `checkDefinition` asks, and a form with no suite passes that step — six of the seven do today.
- One call runs a suite, with the definition passed separately from the cases:
  `await runSurveyTests(getSchemaDefinition("checkout").json, checkoutTests)`. `checkDefinition` adds the run configuration: the form's variable presets when the suite declares none, the pinned clock, `asyncTimeout` for one operation and an `AbortSignal` for the run as a whole.
- The format is specified in the SurveyJS library source, `packages/survey-core/src/tester/README.md`. Read it before editing a case file. Do not guess the grammar.
- A suite is part of a form's contract, so a fixture that replaces a definition has to keep it. `e2e/short-checkout.ts` is the smallest checkout that still passes `checkout.tests.json`, and it is what the specs write when they need a short one.

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

There is deliberately no `package-lock.json`. Every SurveyJS package takes the caret range `^3.1.1`, so the template always shows the current 3.x release without crossing into a new major, and a lock file would freeze what that means. `.npmrc` sets `package-lock=false`, so `npm install` neither reads nor writes one, and `/package-lock.json` is in `.gitignore`. The cost is accepted: installs are not reproducible, and a bad upstream release breaks a fresh clone until it is fixed upstream.

## Environment

Copy `.env.example` to `.env.local`. It documents nine variables, in four groups.

**Page metadata, both editions.** `NEXT_PUBLIC_SITE_URL` is this host. Set it on every deployment: canonicals and `og:url` are built from it, and without it they say `http://localhost:3000`. `NEXT_PUBLIC_CANONICAL_URL` and `NEXT_PUBLIC_INDEXABLE` are optional; see **Page metadata**. All three are inlined at build time, so a change needs a rebuild. The edition is not among them: it is `features.edition`, a constant, so a build cannot call itself the other edition.

**Server-side, for `/api/extract`, in both editions.** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — set one, not both — enables the route that reads answers off an uploaded document; whichever is present picks the provider. `EXTRACTOR_MODEL` optionally overrides the model; without it the route uses its per-provider default (see `src/app/api/extract/route.ts`). Leave it commented out rather than empty: an empty string survives the route's `??` fallback and asks the provider for a model named `""`. With neither key set the route answers 501 and the buttons on `/work-orders` say so. A successful reading also returns `readAt`, the server's clock in UTC (`YYYY-MM-DDTHH:mm`), which the record stores as `importedAt`. None of these reach the browser.

**Server-side, for storage, in both editions.** `DATABASE_PATH` is the SQLite file, default `.data/demo.db` (the directory is created; `:memory:` for a throwaway run). `STORAGE_TTL_DAYS` is how many idle days a visitor's sandbox survives, default 14. Node 24.16 or later is required, and `.npmrc` sets `engine-strict`: earlier 24.x `node:sqlite` truncates stored text at a NUL character, and `sqlite.ts` refuses to open on it. The template runs in a docker container whose writable layer holds the database, so a new container starts empty; see the README's **Deployment**.

**`SURVEYJS_KEY` — the SurveyJS license key.** When it is set, `src/lib/surveyjs-license.ts` applies it with `slk` from `survey-core`; unset or blank, nothing is applied. `SurveyForm` and `EmbeddedSurvey` import that file for its side effect, so the key is applied on every page that renders a form, on the server and in the browser; any other module that renders SurveyJS (the full edition's Creator, Dashboard and PDF export) imports it the same way. It reaches the browser, forwarded by the `env` block in `next.config.mjs` rather than by a `NEXT_PUBLIC_` prefix, so the two must be renamed together. `slk` is exported by `survey-core` itself, so the code is MIT-clean, and the two editions differ by a key rather than by code.
