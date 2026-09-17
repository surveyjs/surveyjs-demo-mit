# SurveyJS in your app — MIT edition

A working application with SurveyJS forms inside it, built only with MIT-licensed packages. Not a form gallery: every page is a situation a product team recognises — records your staff edit, a survey embedded in somebody else's site, a clinician's workspace that is nothing but a form, paper job sheets turned into data by AI.

Clone it and start your own project from it. Nothing here needs a licence key.

**[Run the demo](https://mit.demos.surveyjs.io)** · [Full edition](https://demos.surveyjs.io) (adds Survey Creator, PDF Generator and Dashboard) · [What you can build](https://surveyjs.io/use-cases) · [Server integration](https://surveyjs.io/backend-integration/examples)

## Quick start

```bash
git clone https://github.com/surveyjs/surveyjs-demo-mit.git
cd surveyjs-demo-mit
npm i
npm run dev
```

Open http://localhost:3000. Or bootstrap it as a Next.js example:

```bash
npx create-next-app --example "https://github.com/surveyjs/surveyjs-demo-mit" my-app
```

Built with Next.js (App Router) and styled with [shadcn/ui](https://ui.shadcn.com) through the SurveyJS theme adapter — but the adapter is one import, and the same definitions run on any SurveyJS UI package.

## Pages

| Route | What it shows |
| --- | --- |
| `/leads` | A CRM opportunity record: contacts as a dynamic panel, line items and a security-review checklist as dynamic matrices, totals and a qualification score as expressions. One form views, edits and creates; saving writes both your columns and the full response. |
| `/work-orders` | Field service job sheets. Add a PDF, a scan or a phone photo of a filled sheet and the extractor returns a draft record to check on screen, linked to the original it was read from. (The [full edition](https://demos.surveyjs.io) also prints a record back onto the company's own job sheet as a PDF.) |
| `/feedback` | A satisfaction survey in the hero of a mock product site, rendered for the signed-in account: it greets them by name, arrives pre-answered where the account already knows something, and adds or drops whole pages by plan. |
| `/encounter-note` | A clinician's workspace that is only a survey — eight pages, a problem list with detail rows and duplicate detection, a medication matrix that totals daily dose, an exam grid whose rows are generated from what was flagged abnormal, calculated scores, camera capture, a signed attestation. The React component around it is a header bar. |
| `/appointment` | A mock clinic site whose appointment request arrives filled in from the patient's chart, derives the copay from the plan and the visit type, flags an HMO referral, and updates the summary beside it as the patient answers. English and Spanish from one definition. |
| `/starter` | A multi-step checkout form and nothing else. The smallest page here, and the place to start reading. |
| `/definition` | The form as a JSON document: a Monaco editor with survey-core's linter under it on the left, the form it produces on the right, following you as you type. `?form=…` chooses which form. |
| `/api/extract` | POST a document and a `formId`; answers come back keyed by question name. Needs an LLM key — see [Environment](#environment). |

The embedded pages (`/feedback`, `/encounter-note`, `/appointment`) render without the admin chrome, each in its own brand, and each outlines what SurveyJS drew with a dashed ring so there is no argument about which part of the page is the library. They share one toolbar: *Login as* switches between the preset users a demo ships with, and *Edit the user* opens that account in a popup — an editor that is itself a SurveyJS survey, so the library edits its own input. Each demo passes the account to survey-core as one variable, so the definition reads `{user.firstName}` in titles, in `defaultValueExpression` and in `visibleIf`.

## What to look at first

- **Forms are JSON, never React.** Definitions live in [src/schemas/](src/schemas/); no page hardcodes a field. [createSurveyModel](src/schemas/createSurveyModel.ts) turns a definition into a configured `survey-core` model and knows nothing about React.
- **Variables do the personalisation.** The host passes the signed-in user (or the patient chart) as variables, one per field (`{user_firstName}`, `{user_role}`); the definition reads them. What those variables are, and a few people to try each form as, is declared once per form as SurveyJS [variable presets](src/schemas/variables/). Sign in as somebody else and the greeting, the prefilled values and the number of pages all change, with no branching in the application code.
- **Paper in.** `/work-orders` reads a filled sheet with the MIT-licensed [AI Form Response Extractor](https://github.com/surveyjs/ai-form-response-extractor), handing it the file *and the form's own JSON*; each question carries an `aiHint`, a registered property appended to the prompt that no visitor sees. Tuning those lines, not code, is how extraction is made to land field for field. The sample sheets are rendered from the sheet's own HTML by `npm run assets:work-order`.
- **The linter runs everywhere.** `/definition` shows survey-core's static analysis under the editor, given the form's variable presets, so a `{user_role}` is known, a `{user_rol}` is reported with the fix suggested, and every preset is checked against its definition. The preview beside it has a preset selector. Every definition that ships passes it, and an e2e test keeps it that way.
- **Your own sandbox, rendered by the server.** Every visitor's edits live in their own rows of one SQLite file, and the pages render what they stored. See below.

## Storage: a sandbox per visitor, your database in production

Every visitor gets their own sandbox on the server, keyed by a random cookie: edit any form or record, upload a job sheet, reset it any time. The pages render what you stored. It is cleared on every release and after 14 idle days. Don't enter real personal data.

Everything this app stores goes through **three seam files in [src/storage/](src/storage/)**, plus the backend they share. Nothing else in `src/` reads or writes stored data.

| File | What it stores |
| --- | --- |
| [survey-json.ts](src/storage/survey-json.ts) | Form definitions, edited on `/definition` and `/configure` |
| [survey-results.ts](src/storage/survey-results.ts) | Lead and work-order records, `/starter` submissions, and Reset demo data |
| [documents.ts](src/storage/documents.ts) | The uploaded original a record was read from |
| [backend/sqlite.ts](src/storage/backend/sqlite.ts) | The database: one file, through Node's built-in `node:sqlite` |

`src/storage/backend/sqlite.ts` is the swap this section teaches, done against a real database; the files above call it on the server and reach it through `src/app/api/storage/` from the browser. Every function in the seams is `async`, so pointing them at your API instead changes no call site.

How the demo's storage works:

- **The template visitor.** The definitions and seed records that ship in `src/schemas/` are rows in the database too, under a reserved id, rewritten from the code at every start. A visitor who has stored nothing, a crawler included, reads those.
- **A cookie from a handshake.** After load the page calls `POST /api/storage/session` once, which sets `demo_uid` when there is none and stores nothing. On a visitor's first write every template row is copied under their id, and from then on their rows are the truth, an emptied list included.
- **Rendered on the server.** Every form page reads the visitor's definition and records while it renders, so a reload shows the edit with no loading state.
- **Reset demo data** on `/leads` and `/work-orders` deletes the visitor's rows and issues a new id. The editor's Reset puts back one form's shipped definition.
- **Read-only without cookies.** When the cookie does not stick, a banner says so, every write control is disabled, and the server refuses a write without a cookie rather than store it under an id nobody will present again.
- **Caps.** 1 MB per form or record, 8 MB per document, 50 MB per visitor. Uploads are PDF, PNG, JPEG or WebP, decided by the bytes, and served back under `Content-Security-Policy: sandbox`.
- **Idle visitors** are removed after `STORAGE_TTL_DAYS`: lazily, at most once an hour after a write, or on demand with `npm run storage:gc`.

### Moving to your own server and database

1. **Tables:** `survey_schemas (id, json, updated_at)` plus one per record type — `leads (id, data, updated_at)`, `work_orders (id, data, updated_at)`. Seed them from `src/schemas/`. [sqlite.ts](src/storage/backend/sqlite.ts) shows the same shape, keyed by visitor rather than by tenant.
2. **Route handlers** under `src/app/api/` for each: `GET`/`PUT`/`DELETE /api/schemas/[id]`, `GET`/`POST /api/leads`, `PUT`/`DELETE /api/leads/[id]`, and the same for work orders. Validate the incoming JSON and authorize the caller here: the definition editor is an admin surface, and it is only safe unauthenticated in this demo because every visitor edits nobody's data but their own. [src/app/api/storage/](src/app/api/storage/) is a working set to start from.
3. **Replace the bodies in [survey-json.ts](src/storage/survey-json.ts)** — `loadSurveyJson`, `saveSurveyJson`, `resetSurveyJson`. The file header shows the `fetch` shape, and where a real save lints.
4. **Replace the bodies in [survey-results.ts](src/storage/survey-results.ts)** — `listResults`, `getResult`, `saveResult`, `deleteResult`, `submitResult` — and `keepSourceDocument` in [documents.ts](src/storage/documents.ts), with object storage behind it.
5. **Mind the server-side reader.** `listResults()` and `loadSurveyJson()` are called from server components so the list and the form are in the server HTML; a relative `fetch("/api/leads")` does not resolve there. Query the database directly in that branch, as the demo's seams do, or use an absolute URL. The mutations run on the client and can use relative URLs.

[Server integration](https://surveyjs.io/backend-integration/examples) shows the same endpoints for Node.js, ASP.NET Core, PHP and Python.

### What happens to `src/schemas/`

| | |
| --- | --- |
| The form definitions | **Move to the database** — one row each in `survey_schemas`. Keep the files as the seed and as the fallback the pages use when a row is missing. |
| `data/*-seed.ts` records | **Move to the database** for the record types; the rest is demo data behind "Prefill demo data" — delete it. |
| `clinic-info.ts`, `patient-record.ts` | The demo clinic's directory, plans and chart — not survey definitions. Delete them with the demos or replace them with your own catalogue. |
| `types.ts`, `createSurveyModel.ts` | **Stay as they are.** Types and the model factory have nothing to do with storage. |
| `index.ts` | Stays, smaller. `getSchemaDefinition` becomes the fallback rather than the source of truth. |
| `navigation.ts` | **Stays** if your set of forms is fixed. If users create forms at runtime, this moves to the database too and the routes become a single dynamic `/[formId]`. |

### Deployment

This template runs in a docker container, on Node 24.16 or later. The database lives in that container's writable layer, and no volume is mounted over it, on purpose: **restarting the container keeps the data; creating a new container, from a new image or the same one, starts empty**. So a release is the reset button, and the template rows are rewritten from the shipped schemas at every start in any case. Mounting a volume at the database's directory brings long-lived data back, and with it the need to bump `SCHEMA_VERSION` in `sqlite.ts` whenever the tables change: a database at another version is dropped and recreated. Serverless hosts are not a target of this example.

A later step is shared rooms, where several visitors edit one form together. The door is open and nothing more: `sqlite.ts` has no Next.js import, so a socket server on the same host can open the same file (WAL makes two processes safe), and `demo_uid` is a plain cookie any server on this host can read.

## Extension points

Commercial SurveyJS components — Survey Creator, PDF Generator, Dashboard — are not in this repository and not in its dependency tree. They plug in through [src/features/](src/features/), which ships no-op defaults here: when a hook returns nothing, the button it belongs to is not rendered.

That is also how the [Full edition](https://github.com/surveyjs/surveyjs-demo) is built. It is a downstream of this repository: the same code, merged, plus its own implementations of these hooks. If you want the designer in your own copy, implement the same hooks against your licence.

## Project structure

```
src/
  app/
    (shell)/                    Pages inside the admin chrome
      leads/  work-orders/  starter/  definition/
    embedded/                   The embedded demos — no admin chrome
      feedback/  encounter-note/  appointment/
    api/extract/                Document → answers
    api/storage/                The storage routes the browser calls: session, definitions, results, submissions, documents, reset
  schemas/
    types.ts                    Shared types (survey-core only, no UI framework)
    createSurveyModel.ts        Model factory
    *.ts                        The form definitions
    clinic-info.ts              The demo clinic's directory, plans, derived visit summary
    patient-record.ts           The chart the appointment demo renders its form for
    data/                       Seed records and demo response data
    navigation.ts               Route ↔ schema mapping used by the sidebar
  components/
    SurveyForm.tsx              Renders a model with survey-react-ui
    JsonEditor.tsx              Monaco wrapper (client-only)
    AdminShell.tsx, Sidebar.tsx, TopBar.tsx, ThemeSwitcher.tsx
    definition/                 The editor: JSON + linter, and the live form
    records/                    The shared records page: list, form, user switcher
    extract/                    Extraction from paper: sample documents and upload
    WorkOrdersView.tsx          The records page plus extraction from a document
    lint/                       survey-core's linter as a status bar
    embedded/                   One folder per demo, plus what they share
    ui/                         shadcn/ui primitives
  features/                     Extension points; no-op defaults in this edition
  storage/                      The only files that touch stored data: the seams, access.ts, and backend/
  archive/insurance-claim/      The CMS-1500 claim, kept but not wired (see its README)
assets/work-order/              The job sheet's HTML, fonts, signatures and sample values
scripts/render-work-order-assets.mjs  Renders the blank, the box table and the samples
scripts/storage-gc.mjs          Removes idle visitors (npm run storage:gc)
  styles/                       App-local overrides on top of the SurveyJS adapter
```

To add a form: drop a definition into `src/schemas/`, register it in [index.ts](src/schemas/index.ts) and [navigation.ts](src/schemas/navigation.ts), and create a page that passes it to `SurveyForm`.

## Environment

Copy [.env.example](.env.example) to `.env` — `.env` is git-ignored, so your keys stay out of the repository.

| Variable | What it does |
| --- | --- |
| `OPENAI_API_KEY` | Enables `/api/extract` through OpenAI. |
| `ANTHROPIC_API_KEY` | Enables `/api/extract` through Anthropic. Used when no OpenAI key is set. |
| `EXTRACTOR_MODEL` | Overrides the model (defaults: `gpt-4o`, `claude-sonnet-5`). |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for canonical and Open Graph tags. |
| `DATABASE_PATH` | Where the SQLite file is. Defaults to `.data/demo.db`; `:memory:` for a throwaway run. |
| `STORAGE_TTL_DAYS` | Idle days before a visitor's sandbox is removed. Defaults to 14. |

Extraction needs one provider key, not both; if both are set, OpenAI is used. With no key the endpoint answers 501 and the buttons say so: the feature is wired and starts working the moment a key appears. Keys are read on the server only and never reach the browser.

`demo_uid` is a functional random id, not tracking, so there is no consent banner.

## Tests

Playwright end-to-end tests live in [e2e/](e2e/) and assert, among other things, that the survey markup is present in the server response.

```bash
npm run e2e:ci    # against a production build
npm run e2e:dev   # against `next dev`, where React reports more warnings
npm run e2e:ui    # interactive runner
```

## License

[MIT](LICENSE). The SurveyJS packages used here — `survey-core`, `survey-react-ui` and the AI Form Response Extractor — are MIT-licensed too.