import { notFound } from "next/navigation";

import AccusationChat from "../../../../components/AccusationChat";
import { bundledCaseIds, isBundledCaseId } from "../../../../lib/case/catalog";

type CaseAccusePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export function generateStaticParams() {
  return bundledCaseIds.map((caseId) => ({ caseId }));
}

export default async function CaseAccusePage({ params }: CaseAccusePageProps) {
  const { caseId } = await params;

  if (!isBundledCaseId(caseId)) {
    notFound();
  }

  return (
    <AccusationChat
      caseId={caseId}
      continueHref={`/cases/${caseId}`}
      endHref="/"
    />
  );
}
