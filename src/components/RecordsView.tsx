"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Model } from "survey-core";
import type { SurveyData, SurveyJSON, SurveyResult } from "@/schemas";
import { deleteResult, saveResult } from "@/storage/survey-results";
import { configureHref } from "@/lib/routes";
import { mergeTailwindClasses } from "@/lib/utils";
import { SurveyForm } from "@/components/SurveyForm";
import { ExtractFromDocument } from "@/components/records/ExtractFromDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EditorMode = "edit" | "view";

interface Editor {
  readonly mode: EditorMode;
  readonly record: SurveyResult;
  readonly key: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky-500/15 text-sky-700 dark:text-sky-300 dark:bg-sky-400/15",
  in_review:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-400/15",
  approved:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/15",
  denied: "bg-destructive/15 text-destructive dark:text-red-300 dark:bg-red-400/15",
};

function statusLabel(status: unknown): string {
  return String(status ?? "").replace(/_/g, " ") || "—";
}

function patientName(data: SurveyData): string {
  return (
    [data.patientFirstName, data.patientLastName].filter(Boolean).join(" ") || "—"
  );
}

/** The next free number in the `CLM-<year>-<n>` format the seed records use. */
function nextClaimId(records: readonly SurveyResult[]): string {
  const prefix = `CLM-${new Date().getFullYear()}-`;
  const highest = records.reduce((max, record) => {
    if (!record.id.startsWith(prefix)) return max;
    const number = Number(record.id.slice(prefix.length));
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

export function RecordsView({
  schema,
  schemaId,
  initialRecords,
}: {
  schema: SurveyJSON;
  schemaId: string;
  /** Read on the server by the page, so the first paint is complete. */
  initialRecords: readonly SurveyResult[];
}) {
  const [records, setRecords] = useState<SurveyResult[]>(() => [...initialRecords]);
  const [editor, setEditor] = useState<Editor | null>(() => {
    const first = initialRecords[0];
    return first ? { mode: "view", record: first, key: 0 } : null;
  });
  const [deleteTarget, setDeleteTarget] = useState<SurveyResult | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const open = useCallback(
    (mode: EditorMode, record: SurveyResult) =>
      setEditor((prev) => ({ mode, record, key: (prev?.key ?? 0) + 1 })),
    [],
  );

  // A document becomes a claim in one gesture: the answers are stored as a draft
  // straight away, so the row is in the list and open for correction rather than
  // waiting behind a Save. The boxes the model found empty come back as null,
  // and those are dropped rather than written over the record's own defaults.
  const applyExtracted = useCallback(
    async (extracted: SurveyData) => {
      const answers = Object.fromEntries(
        Object.entries(extracted).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        ),
      );
      const id = nextClaimId(records);
      const saved = await saveResult(id, {
        ...answers,
        claimNumber: id,
        status: "draft",
      });

      setRecords((prev) => [...prev, saved]);
      open("edit", saved);
      requestAnimationFrame(() =>
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    },
    [open, records],
  );

  const handleComplete = useCallback(
    async (data: SurveyData) => {
      if (!editor) return;
      const id = editor.record.id;
      const saved = await saveResult(id, { ...data, claimNumber: id });

      setRecords((prev) =>
        prev.some((r) => r.id === id)
          ? prev.map((r) => (r.id === id ? saved : r))
          : [...prev, saved],
      );
      setEditor((prev) => ({
        mode: "view",
        record: saved,
        key: (prev?.key ?? 0) + 1,
      }));
    },
    [editor],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteResult(deleteTarget.id);
    const remaining = records.filter((r) => r.id !== deleteTarget.id);
    setRecords(remaining);
    // The form is always open on some record, so deleting the open one falls
    // back to whatever is left.
    setEditor((prev) => {
      if (prev?.record.id !== deleteTarget.id) return prev;
      const next = remaining[0];
      return next
        ? { mode: "view", record: next, key: (prev?.key ?? 0) + 1 }
        : null;
    });
    setDeleteTarget(null);
  }, [deleteTarget, records]);

  const editorTitle = useMemo(() => {
    if (!editor) return "";
    return `${editor.mode === "edit" ? "Edit" : "View"} ${editor.record.id}`;
  }, [editor]);

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-semibold">
            {records.length} claim{records.length === 1 ? "" : "s"}
          </h2>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total charge</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-10 text-center"
                    >
                      No records left.
                    </TableCell>
                  </TableRow>
                )}
                {records.map((record) => {
                  const active = editor?.record?.id === record.id;
                  return (
                    <TableRow
                      key={record.id}
                      data-state={active ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => open("view", record)}
                    >
                      <TableCell className="font-mono">{record.id}</TableCell>
                      <TableCell>{patientName(record.data)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={mergeTailwindClasses(
                            "capitalize",
                            STATUS_BADGE[String(record.data.status)],
                          )}
                        >
                          {statusLabel(record.data.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof record.data.totalCharge === "number"
                          ? currency.format(record.data.totalCharge)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              open("edit", record);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(record);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <ExtractFromDocument formId={schemaId} onExtracted={applyExtracted} />
        </div>

        {editor && (
          <div ref={editorRef} className="lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{editorTitle}</h2>
              <div className="flex gap-2">
                {editor.mode === "view" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => open("edit", editor.record)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={configureHref(schemaId)}>Change Form</a>
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => model?.completeLastPage()}>
                    Save changes
                  </Button>
                )}
              </div>
            </div>
            <SurveyForm
              key={editor.key}
              schema={schema}
              schemaId={schemaId}
              data={editor.record.data}
              mode={editor.mode === "view" ? "display" : "edit"}
              onComplete={editor.mode === "view" ? undefined : handleComplete}
              onModelReady={setModel}
            />
          </div>
        )}
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete claim?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-mono">{deleteTarget?.id}</span>
              {deleteTarget ? ` (${patientName(deleteTarget.data)})` : ""}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
