#!/usr/bin/env node
/**
 * Fail if anything commercial has crept into the MIT edition.
 *
 *   node scripts/check-mit-pure.mjs
 *
 * This template is MIT-licensed and must install and run with the MIT-licensed
 * SurveyJS packages alone: `survey-core` and `survey-react-ui`. Survey Creator,
 * PDF Generator and Dashboard belong to the other edition, which carries this
 * same application plus those three (see the "Extension points" section of
 * CLAUDE.md for how they plug in).
 *
 * A reference is easy to add by accident — an import copied from the other
 * edition, a dependency added while debugging — and impossible to spot in a
 * diff months later, so this runs in CI.
 *
 * No dependencies, so it runs right after checkout.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The packages this edition must not depend on. */
const FORBIDDEN_PACKAGES = [
  "survey-creator-core",
  "survey-creator-react",
  "survey-pdf",
  "survey-analytics",
];

/** Catches every spelling of them in source: imports, requires, CSS paths. */
const FORBIDDEN_SOURCE = /survey-(creator|pdf|analytics)/;

/** Where a reference would actually matter. */
const SCAN_DIRS = ["src", "e2e"];
const SCAN_FILES = ["next.config.mjs"];

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "test-results", "test-results-dev"]);

const findings = [];

// ------------------------------------------------------------- package.json

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));

for (const field of ["dependencies", "devDependencies"]) {
  for (const name of Object.keys(pkg[field] || {})) {
    if (FORBIDDEN_PACKAGES.includes(name)) {
      findings.push({ file: "package.json", line: field, text: `"${name}": "${pkg[field][name]}"` });
    }
  }
}

// ------------------------------------------------------------------- source

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

function scan(path) {
  const text = readFileSync(path, "utf8");
  if (!FORBIDDEN_SOURCE.test(text)) return;
  text.split("\n").forEach((line, index) => {
    if (FORBIDDEN_SOURCE.test(line)) {
      findings.push({
        file: relative(REPO_ROOT, path).replace(/\\/g, "/"),
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

for (const dir of SCAN_DIRS) {
  const root = join(REPO_ROOT, dir);
  if (existsSync(root)) for (const path of walk(root)) scan(path);
}

for (const file of SCAN_FILES) {
  const path = join(REPO_ROOT, file);
  if (existsSync(path)) scan(path);
}

// ------------------------------------------------------------------- report

if (findings.length === 0) {
  console.log("no commercial SurveyJS packages: " + FORBIDDEN_PACKAGES.join(", "));
  process.exit(0);
}

console.error(`\n${findings.length} reference(s) to commercial SurveyJS packages:\n`);
for (const { file, line, text } of findings) console.error(`  ${file}:${line}  ${text}`);
console.error(
  "\nThis edition is MIT-licensed and ships survey-core and survey-react-ui only.\n" +
    "A feature that needs one of these belongs in the full edition, plugged in\n" +
    "through src/features — see the Extension points section of CLAUDE.md.\n",
);
process.exit(1);
