"use client";

import {
  AppPreview,
  ClosingBand,
  EmbedNotes,
  Features,
  Hero,
  Pricing,
  SiteFooter,
  SiteHeader,
  Stats,
  Suite,
  Testimonials,
} from "./CadenceSite";
import { DemoDock } from "../shared/DemoDock";
import { EmbeddedSurvey, SurveyCard } from "../shared/EmbeddedSurvey";
import { DemoUserDialog } from "../shared/DemoUserDialog";
import { useDemo } from "../shared/useDemo";
import { CADENCE_ROSTER, CADENCE_USER } from "../shared/demo-accounts";
import type { DemoSurvey } from "../shared/demo-controls";

const ANCHOR = "feedback";
export const CADENCE_BRAND = "indigo";

/**
 * Embedded demo: an ordinary product marketing site with a survey in its hero.
 *
 * The page it lives on has no admin demo by design — see `src/app/layout.tsx`
 * and the `(shell)` route group — and the sidebar entry opens it in a new tab so
 * nothing of this template frames it.
 *
 * The survey is addressed to whoever is signed in: the header shows the account,
 * and the form greets them by name, works out how long they have been a customer,
 * asks a paying customer about plan fit and a three-week-old account about
 * onboarding, and never asks for an email it already has. All of that is in the
 * JSON, reading `{user.…}` — see `demo-accounts.ts`.
 */
export function CadenceDemo({ survey }: { survey: DemoSurvey }) {
  const demo = useDemo({
    survey,
    user: CADENCE_USER,
    anchorId: ANCHOR,
    brandId: CADENCE_BRAND,
    // Three accounts ship with the demo, so the toolbar can sign in as any of
    // them — the same definition, a different customer.
    roster: CADENCE_ROSTER,
  });

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <SiteHeader onFeedback={demo.requestSurvey} account={demo.account} />

      <main className="flex-1">
        <Hero>
          <SurveyCard>
            <EmbeddedSurvey
              key={demo.runKey}
              json={demo.json}
              data={demo.seed}
              variables={demo.variables}
              onDataChange={demo.trackAnswers}
            />
          </SurveyCard>
        </Hero>

        <EmbedNotes />
        <AppPreview />
        <Stats />
        <Features />
        <Suite />
        <Testimonials />
        <Pricing />
        <ClosingBand onFeedback={demo.requestSurvey} />
      </main>

      <SiteFooter />

      <DemoUserDialog {...demo.userDialogProps} />
      <DemoDock {...demo.dockProps} />
    </div>
  );
}
