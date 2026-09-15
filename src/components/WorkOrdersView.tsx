"use client";

import type { RecordRow, StoredRecord } from "@/schemas";
import { features } from "@/features";
import { RecordsView } from "@/components/records/RecordsView";
import { ExtractFromDocument } from "@/components/extract/ExtractFromDocument";
import { workOrderSampleDocuments } from "@/components/extract/sample-documents";

/**
 * `/work-orders`: the shared records page, plus the way in from paper, and in
 * editions that print one, the way back onto it.
 */
export function WorkOrdersView({
  title,
  description,
  initialRows,
  initialRecord,
}: {
  title: string;
  description: string;
  /** Read on the server by the page, so the first paint is complete. */
  initialRows: readonly RecordRow[];
  initialRecord: StoredRecord | undefined;
}) {
  // The full edition plugs in the job sheet printer: the record, printed onto the
  // company's own sheet - not a picture of the questionnaire. Undefined here, so
  // neither the button nor the note below renders.
  const exportPdf = features.exportWorkOrderPdf;

  return (
    <RecordsView
      collectionId="workOrders"
      title={title}
      description={description}
      initialRows={initialRows}
      initialRecord={initialRecord}
      // The parts table is five columns wide; see `layout` on RecordsView.
      layout="stacked"
      exportPdf={exportPdf}
      listFooter={({ createFrom }) => (
        <ExtractFromDocument
          formId="work-order"
          noun="work order"
          documentName="job sheet"
          samples={workOrderSampleDocuments}
          onExtracted={createFrom}
        />
      )}
      formNote={
        exportPdf && (
          <>
            <span className="font-medium">Save as PDF</span> prints this work order onto
            the company&apos;s own job sheet, box by box - the same sheet a technician fills
            in on site, not a picture of this questionnaire.
          </>
        )
      }
    />
  );
}
