import { notFound } from "next/navigation";

import AccusationChat from "../../../../components/AccusationChat";
import { bundledCaseIds, isBundledCaseId } from "../../../../lib/case/catalog";
import { loadPlayableCase } from "../../../../lib/case/playable-case";

type CaseAccusePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export function generateStaticParams() {
  return bundledCaseIds.map((caseId) => ({ caseId }));
}

export const dynamic = "force-dynamic";

export default async function CaseAccusePage({ params }: CaseAccusePageProps) {
  const { caseId } = await params;

  if (!isBundledCaseId(caseId)) {
    try {
      loadPlayableCase(caseId);
    } catch {
      notFound();
    }
  }

  return (
    <AccusationChat
      caseId={caseId}
      continueHref={`/cases/${caseId}`}
      endHref="/"
    />
  );
}
