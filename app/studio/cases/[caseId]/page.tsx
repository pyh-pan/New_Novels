import { notFound } from "next/navigation";

import StudioWorkbench from "../../../../components/StudioWorkbench";
import { bundledCaseIds, isBundledCaseId } from "../../../../lib/case/catalog";
import { loadBundledCase } from "../../../../lib/case/default-case";
import { createStudioDraftView } from "../../../../lib/studio/draft";

type StudioCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export function generateStaticParams() {
  return bundledCaseIds.map((caseId) => ({ caseId }));
}

export default async function StudioCasePage({ params }: StudioCasePageProps) {
  const { caseId } = await params;

  if (!isBundledCaseId(caseId)) {
    notFound();
  }

  return <StudioWorkbench draft={createStudioDraftView(loadBundledCase(caseId))} />;
}
