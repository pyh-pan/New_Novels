import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CasePackage } from "./schema";
import type { CaseFile, StoryChapter } from "../case/schema";

function writeJson(filePath: string, value: unknown) {
  writeFileSync(/* turbopackIgnore: true */ filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureDirectory(directory: string) {
  mkdirSync(/* turbopackIgnore: true */ directory, { recursive: true });
}

function chapterFileName(chapter: StoryChapter, index: number) {
  const safeId = chapter.id
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");

  return `story/${safeId || `chapter-${index + 1}`}.md`;
}

function createChapterIndex(chapters: StoryChapter[]) {
  return chapters.map((chapter, index) => ({
    ...chapter,
    body: chapterFileName(chapter, index)
  }));
}

function writeSplitCaseFile(caseFile: CaseFile, directory: string) {
  const chapterIndex = createChapterIndex(caseFile.chapters);

  writeJson(join(/* turbopackIgnore: true */ directory, "case.json"), caseFile);
  writeJson(join(/* turbopackIgnore: true */ directory, "story", "chapters.json"), chapterIndex);
  caseFile.chapters.forEach((chapter, index) => {
    writeFileSync(
      join(/* turbopackIgnore: true */ directory, chapterFileName(chapter, index)),
      `${chapter.body.trim()}\n`,
      "utf8"
    );
  });
  writeJson(join(/* turbopackIgnore: true */ directory, "agents", "global-context.json"), caseFile.globalContext);
  caseFile.agents.forEach((agent) => {
    writeJson(join(/* turbopackIgnore: true */ directory, "agents", `${agent.id}.json`), agent);
  });
  writeJson(join(/* turbopackIgnore: true */ directory, "facts", "facts.json"), caseFile.facts);
  writeJson(join(/* turbopackIgnore: true */ directory, "acts", "acts.json"), caseFile.acts);
  writeJson(join(/* turbopackIgnore: true */ directory, "acts", "gates.json"), caseFile.actGates);
  writeJson(join(/* turbopackIgnore: true */ directory, "scenes", "scenes.json"), caseFile.scenes);
  writeJson(join(/* turbopackIgnore: true */ directory, "clues", "clues.json"), caseFile.clues);
  writeJson(join(/* turbopackIgnore: true */ directory, "relationships", "relationships.json"), caseFile.relationships);
  writeJson(join(/* turbopackIgnore: true */ directory, "propagation", "rules.json"), caseFile.propagationRules);
  writeJson(join(/* turbopackIgnore: true */ directory, "contradictions", "contradictions.json"), caseFile.contradictions);
  writeJson(join(/* turbopackIgnore: true */ directory, "truth", "truth.json"), caseFile.truth);
  writeJson(join(/* turbopackIgnore: true */ directory, "victims", "victims.json"), caseFile.victims);
  writeJson(join(/* turbopackIgnore: true */ directory, "accusation", "questions.json"), caseFile.accusation.questions);
}

export function writeCasePackageToDirectorySync(pkg: CasePackage, directory: string) {
  rmSync(/* turbopackIgnore: true */ directory, { recursive: true, force: true });
  [
    "story",
    "agents",
    "facts",
    "acts",
    "scenes",
    "clues",
    "relationships",
    "propagation",
    "contradictions",
    "truth",
    "victims",
    "accusation"
  ].forEach((subdirectory) => ensureDirectory(join(/* turbopackIgnore: true */ directory, subdirectory)));

  writeJson(join(/* turbopackIgnore: true */ directory, "manifest.json"), pkg.manifest);
  writeSplitCaseFile(pkg.caseFile, directory);
}
