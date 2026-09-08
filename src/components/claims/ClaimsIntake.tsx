"use client";

import { useCallback, useState } from "react";
import type { Model as SurveyModel } from "survey-core";
import { SurveyForm } from "@/components/SurveyForm";
import type { SchemaInput, SurveyData } from "@/schemas";
import { ExtractFromDocument } from "./ExtractFromDocument";

/**
 * The claims page's form, plus the one thing it has that the others do not: a
 * way in from paper.
 *
 * It exists only to hold the model, so what the extractor returns can be merged
 * into the survey that is already on screen — `mergeData` rather than a reload,
 * so a half-filled form is topped up rather than replaced.
 */
export function ClaimsIntake({
  schema,
  schemaId,
  completedMessage,
  prefillData,
}: {
  schema: SchemaInput;
  schemaId: string;
  completedMessage: string;
  prefillData: SurveyData;
}) {
  const [model, setModel] = useState<SurveyModel | null>(null);

  const applyExtracted = useCallback(
    (data: SurveyData) => {
      model?.mergeData(data);
    },
    [model],
  );

  return (
    <>
      <ExtractFromDocument formId={schemaId} onExtracted={applyExtracted} />
      <SurveyForm
        schema={schema}
        schemaId={schemaId}
        completedMessage={completedMessage}
        prefillData={prefillData}
        onModelReady={setModel}
      />
    </>
  );
}
