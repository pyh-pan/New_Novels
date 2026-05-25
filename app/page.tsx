import CaseExperience from "../components/CaseExperience";
import { getDefaultCase } from "../lib/case/default-case";
import { toStoryChapters } from "../lib/game/story";

export default function Page() {
  const caseFile = getDefaultCase();

  return (
    <CaseExperience
      caseTitle={caseFile.title}
      sourceTitle={caseFile.source.title}
      chapters={toStoryChapters(caseFile.chapters)}
    />
  );
}
