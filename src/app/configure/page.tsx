import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonWorkbench } from "@/components/configure/JsonWorkbench";

export const metadata: Metadata = {
  title: "Form JSON — SurveyJS Library + Next.js",
  description:
    "Edit any form in the template as JSON, watch the form follow, and open the page it actually lives in.",
};

/**
 * The one editor in the template, for every form in it.
 *
 * `?form=` picks which one, so a link to a particular form is shareable; the
 * workbench reads it with `useSearchParams`, hence the Suspense boundary.
 */
export default function ConfigurePage() {
  return (
    <Suspense fallback={null}>
      <JsonWorkbench />
    </Suspense>
  );
}
