import { notFound } from "next/navigation";

import StudioWorkbench from "../../../../components/StudioWorkbench";
import { bundledCaseIds, isBundledCaseId } from "../../../../lib/case/catalog";
import { loadBundledCase } from "../../../../lib/case/default-case";
import { createStudioDraftView, createStudioDraftViewWithAdaptation } from "../../../../lib/studio/draft";
import { getGeneratedStudioCase } from "../../../../lib/studio/generated-cases";

type StudioCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export function generateStaticParams() {
  return bundledCaseIds.map((caseId) => ({ caseId }));
}

export const dynamic = "force-dynamic";

export default async function StudioCasePage({ params }: StudioCasePageProps) {
  const { caseId } = await params;

  if (!isBundledCaseId(caseId)) {
    const generated = getGeneratedStudioCase(caseId);

    if (!generated) {
      notFound();
    }

    return (
      <StudioWorkbench
        draft={createStudioDraftViewWithAdaptation(generated.caseFile, {
          lifecycleStatus: generated.status,
          sourceProfile: generated.sourceProfile,
          segmentation: generated.segmentation,
          qualityReport: generated.qualityReport
        })}
      />
    );
  }

  return <StudioWorkbench draft={createStudioDraftView(loadBundledCase(caseId))} />;
}
