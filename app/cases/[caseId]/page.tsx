import { notFound } from "next/navigation";

import CaseExperience from "../../../components/CaseExperience";
import { bundledCaseIds, isBundledCaseId } from "../../../lib/case/catalog";
import { loadPlayableCase } from "../../../lib/case/playable-case";
import { toStoryChapters } from "../../../lib/game/story";

type CasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export function generateStaticParams() {
  return bundledCaseIds.map((caseId) => ({ caseId }));
}

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params;

  if (!isBundledCaseId(caseId)) {
    try {
      loadPlayableCase(caseId);
    } catch {
      notFound();
    }
  }

  const caseFile = loadPlayableCase(caseId);

  if (!isBundledCaseId(caseId) && caseFile.id !== caseId) {
    notFound();
  }

  return (
    <CaseExperience
      caseId={caseFile.id}
      caseTitle={caseFile.title}
      sourceTitle={caseFile.source.title}
      agents={caseFile.agents.map(({ id, name, role, type }) => ({ id, name, role, type }))}
      chapters={toStoryChapters(caseFile.chapters)}
    />
  );
}
