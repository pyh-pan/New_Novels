"use client";

import InvestigationDesk from "./InvestigationDesk";
import StoryReader from "./StoryReader";
import type { CaseAgent } from "../lib/case/schema";
import type { StoryChapter } from "../lib/game/story";

type CaseExperienceProps = {
  caseId: string;
  caseTitle: string;
  sourceTitle: string;
  agents: Pick<CaseAgent, "id" | "name" | "role" | "type">[];
  chapters: StoryChapter[];
};

export default function CaseExperience({
  caseId,
  caseTitle,
  sourceTitle,
  agents,
  chapters
}: CaseExperienceProps) {
  return (
    <InvestigationDesk
      caseId={caseId}
      caseTitle={caseTitle}
      agents={agents}
      entryChapterId={chapters[0]?.id ?? "chapter-1"}
      storySlot={(storyProps) => (
        <StoryReader
          {...storyProps}
          sourceTitle={sourceTitle}
          storyTitle={caseTitle}
          chapters={chapters}
        />
      )}
    />
  );
}
