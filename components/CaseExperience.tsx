"use client";

import InvestigationDesk from "./InvestigationDesk";
import StoryReader from "./StoryReader";
import type { StoryChapter } from "../lib/game/story";

type CaseExperienceProps = {
  caseTitle: string;
  sourceTitle: string;
  chapters: StoryChapter[];
};

export default function CaseExperience({
  caseTitle,
  sourceTitle,
  chapters
}: CaseExperienceProps) {
  return (
    <InvestigationDesk
      caseTitle={caseTitle}
      storySlot={(storyProps) => (
        <StoryReader
          {...storyProps}
          sourceTitle={sourceTitle}
          chapters={chapters}
        />
      )}
    />
  );
}
