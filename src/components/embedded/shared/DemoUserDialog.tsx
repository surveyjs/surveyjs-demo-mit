"use client";

import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SurveyData, SurveyJSON } from "@/schemas";
import { EmbeddedSurvey } from "./EmbeddedSurvey";

/**
 * Nothing outside dismisses this popup — not the toolbar, and not the page.
 *
 * A dialog that closed on an outside click would close the moment a reviewer
 * touched the form it is driving, which is the one thing they are here to do. The
 * X, Escape and the toolbar button close it.
 */
function stayOpen(event: Event) {
  event.preventDefault();
}

/**
 * The signed-in user, editable — in a SurveyJS form.
 *
 * The demo's claim is that a survey arrives configured for whoever is looking at
 * it. This popup is where the reviewer plays the host application: change the
 * plan, the tenure, the chart, and the form on the page behind re-renders.
 *
 * Two deliberate choices:
 *
 *  - **the editor is a survey.** No bespoke form code exists for it — the JSON is
 *    in `demo-accounts.ts` and it goes through the same `EmbeddedSurvey` and the
 *    same shadcn adapter as the demo itself. It even uses the features it is
 *    demonstrating: the clinic's chart panel is `visibleIf`-gated on the "first
 *    visit" switch.
 *  - **the popup is not modal.** Radix keeps the page behind live and clickable,
 *    so the survey re-rendering as you type is visible rather than something you
 *    have to close a dialog to discover — and nothing outside it dismisses it.
 *
 * Beside it, the object actually handed to survey-core — answers in, context
 * out — so the translation is visible while it happens rather than after
 * scrolling. It is read-only on purpose: the form on the left is the way to
 * change it.
 */
export function DemoUserDialog({
  open,
  onOpenChange,
  json,
  defaults,
  formKey,
  onDataChange,
  account,
  edited,
  onRevert,
  configureHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The editor's own definition. */
  json: SurveyJSON;
  /** What the host app knew when the page opened. */
  defaults: SurveyData;
  /** Changes on Revert, so the editor remounts on the restored answers. */
  formKey: string;
  onDataChange: (data: SurveyData) => void;
  /** The object the demo's survey receives as `user`. */
  account: Record<string, unknown>;
  edited: boolean;
  onRevert: () => void;
  /** This form's JSON, for the reader who wants to see what reads these keys. */
  configureHref: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onInteractOutside={stayOpen}
      >
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle className="text-sm">The signed-in user</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            What the host application knows about this visitor. This editor is itself a
            SurveyJS form — change a field and the survey on the page behind re-renders.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-h-0 overflow-y-auto">
            <EmbeddedSurvey
              key={formKey}
              json={json}
              data={defaults}
              onDataChange={onDataChange}
            />
          </div>

          <section
            aria-label="Context passed to the form"
            className="bg-muted/30 flex min-h-0 flex-col border-t p-4 lg:border-t-0 lg:border-l"
          >
            <p className="text-muted-foreground text-xs">
              Handed to survey-core as one variable,{" "}
              <code className="text-foreground text-[11px]">user</code> — the definition
              reads it as <code className="text-foreground text-[11px]">{"{user.…}"}</code>.
            </p>
            <pre className="bg-background mt-2 min-h-0 flex-1 overflow-auto rounded-lg border p-3 text-[11px] leading-relaxed">
              {JSON.stringify(account, null, 2)}
            </pre>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-3">
          <p className="text-muted-foreground text-xs">
            {edited ? "Edited in this window only." : "Unchanged from the template."}{" "}
            <a
              href={configureHref}
              className="hover:text-foreground underline decoration-dotted"
            >
              See what the JSON does with it
            </a>
            .
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRevert}
            disabled={!edited}
          >
            <RotateCcwIcon />
            Revert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
