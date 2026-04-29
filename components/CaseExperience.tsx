"use client";

import InvestigationDesk from "./InvestigationDesk";
import StoryReader from "./StoryReader";

export default function CaseExperience() {
  return (
    <InvestigationDesk
      storySlot={(storyProps) => <StoryReader {...storyProps} />}
    />
  );
}
