"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2Icon, ScanTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SurveyData } from "@/schemas";

/** The filled CMS-1500 that ships with the template, for trying it in one click. */
const SAMPLE_URL = "/samples/cms-1500-filled.pdf";

interface Outcome {
  readonly tone: "ok" | "error";
  readonly message: string;
}

/**
 * "Fill this in from a scanned form" — the paper half of the same definition.
 *
 * A claim still arrives on paper more often than anyone would like, and retyping
 * it is where the errors come from. This strip hands the document and the
 * schema to `/api/extract`, and merges what comes back into the form on the
 * page: the answers land in the real inputs, with the real validation and the
 * real conditional logic, for a person to check before submitting. Nothing is
 * accepted blindly, which is the whole design.
 *
 * The key lives on the server, so until one is configured the route answers 501
 * and that is what shows up here — wired, not pretending.
 */
export function ExtractFromDocument({
  formId,
  onExtracted,
}: {
  formId: string;
  /** Answers keyed by question name, straight into the model. */
  onExtracted: (data: SurveyData) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const extract = useCallback(
    async (file: File) => {
      setBusy(true);
      setOutcome(null);

      try {
        const body = new FormData();
        body.set("file", file);
        body.set("formId", formId);

        const response = await fetch("/api/extract", { method: "POST", body });
        const payload = (await response.json()) as {
          data?: SurveyData;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          setOutcome({
            tone: "error",
            message: payload.error ?? `Extraction failed (${response.status}).`,
          });
          return;
        }

        const filled = Object.keys(payload.data).length;
        onExtracted(payload.data);
        setOutcome({
          tone: "ok",
          message: `${filled} field${filled === 1 ? "" : "s"} filled from ${file.name}. Check them before submitting.`,
        });
      } catch (failure) {
        setOutcome({ tone: "error", message: (failure as Error).message });
      } finally {
        setBusy(false);
      }
    },
    [formId, onExtracted],
  );

  const useSample = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(SAMPLE_URL);
      const blob = await response.blob();
      await extract(new File([blob], "cms-1500-filled.pdf", { type: "application/pdf" }));
    } catch (failure) {
      setOutcome({ tone: "error", message: (failure as Error).message });
      setBusy(false);
    }
  }, [extract]);

  return (
    <div className="mb-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground min-w-0 flex-1 text-sm">
          Have the claim on paper? Upload a scan, a photo or a PDF and the answers
          are read into the form below for review.
        </span>

        <input
          ref={input}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void extract(file);
          }}
        />

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <ScanTextIcon />}
          Fill from a document
        </Button>

        <Button variant="ghost" size="sm" disabled={busy} onClick={useSample}>
          Try the sample CMS-1500
        </Button>
      </div>

      {outcome && (
        <p
          className={
            outcome.tone === "ok"
              ? "text-muted-foreground mt-2 text-xs"
              : "text-destructive mt-2 text-xs"
          }
        >
          {outcome.message}
        </p>
      )}
    </div>
  );
}
