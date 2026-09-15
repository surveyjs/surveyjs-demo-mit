/**
 * The edition config — the MIT edition's values.
 *
 * This is the one file a downstream edition replaces. The full edition ships
 * its own copy with the commercial actions filled in; every component that
 * reads this object is shared code and stays byte-identical between editions.
 * The shape lives in `./types.ts`, which is shared too.
 *
 * Hard rules, for this file and for any edition's replacement of it:
 *
 *  - no React, no JSX, no CSS imports — Playwright imports this module from
 *    `e2e/`, outside any bundler;
 *  - no static import of anything heavy;
 *  - a function an edition adds (`exportPdf`, say) loads its libraries with a
 *    dynamic `import()` when it is called, never at the top of the file.
 *
 * It holds the edition's name and pill, its repository, where the other edition
 * is hosted (for the top bar's switch link), which editor opens a form, and the
 * optional commercial actions. Here every optional action is left undefined, so
 * the buttons for them do not render at all.
 */
import type { Features } from "./types";

export type { Edition, Features } from "./types";

export const features: Features = {
  edition: "mit",
  brand: {
    editionLabel: "MIT",
    sourceUrl: "https://github.com/surveyjs/surveyjs-demo-mit",
    // The full edition's host; the switch link appends the current pathname.
    otherEdition: { label: "Full edition", baseUrl: "https://app.demos.surveyjs.io" },
  },
  designer: {
    label: "Configure Form JSON",
    hint: "Open this form's JSON — the one page every form in the template is edited on",
    icon: "json",
    readySelector: ".monaco-editor",
  },
};
