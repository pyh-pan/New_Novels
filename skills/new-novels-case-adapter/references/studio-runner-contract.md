# Studio Runner Contract

Studio runner is the productized execution path for `new-novels-case-adapter`. Users upload source prose in Studio; they do not run this skill manually.

## Invocation

Studio loads these skill files into the adaptation prompt:

- `skills/new-novels-case-adapter/SKILL.md`
- `skills/new-novels-case-adapter/references/case-package-v1.md`
- `skills/new-novels-case-adapter/references/novel-to-case-workflow.md`
- `skills/new-novels-case-adapter/references/studio-runner-contract.md`

The loaded file list must be recorded in generated metadata for audit and later review.

## AdaptationRequest

```ts
type AdaptationRequest = {
  source: {
    fileName: string;
    kind: "text" | "markdown" | "pdf";
    text: string;
    detectedLanguage?: string;
  };
  options: {
    targetLanguage: "zh-CN";
    adaptationGranularity: "publication-grade";
    investigationScope: "full-playable-investigation";
  };
  rights: {
    statement: string;
    requiresUserConfirmation: boolean;
  };
  skill: {
    name: "new-novels-case-adapter";
    version: string;
    loadedFiles: string[];
  };
};
```

First-version defaults:

- Target language is `zh-CN`.
- Adaptation granularity is `publication-grade`.
- Investigation scope is `full-playable-investigation`.
- Rights confirmation remains the uploader's responsibility and should produce at least a warning unless the source rights are explicit.

## AdaptationModelOutput

The platform AI must return one JSON object:

```ts
type AdaptationModelOutput = {
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  fairPlaySpine: {
    victim: string;
    culprit: string;
    motive: string;
    method: string;
    falseSolution: string;
    minimumClueChain: string[];
    decisiveContradictions: string[];
  };
  adaptationNotes: {
    summary: string;
    readingStrategy: string[];
    investigationStrategy: string[];
    npcStrategy: string[];
    actStructureStrategy: string[];
    unresolvedRisks: string[];
  };
  qualityReport: AdaptationQualityItem[];
  caseFile: CaseFile;
};
```

`caseFile` is the runtime source of truth. The other fields are Studio review metadata and must not be shown to players during gameplay.

## Draft Artifacts

Studio-generated and uploaded packages converge to the same draft shape:

```text
.data/studio-drafts/<draft-case-id>/
  draft.json
  studio.json
  package/
    manifest.json
    case.json
    story/chapters.json
    story/*.md
    agents/global-context.json
    agents/<agent-id>.json
    facts/facts.json
    acts/acts.json
    acts/gates.json
    events/story-events.json
    scenes/scenes.json
    clues/clues.json
    relationships/relationships.json
    propagation/rules.json
    contradictions/contradictions.json
    truth/truth.json
    victims/victims.json
    accusation/questions.json
  validation-report.json
  adaptation-notes.md
```

`package/` must remain a clean `case-package/v1` directory. `validation-report.json` and `adaptation-notes.md` are Studio artifacts outside the package.

Draft metadata must include:

- `origin: "generated-from-source"` for Studio-generated stories.
- `origin: "uploaded-package"` for imported package zips.
- skill name, skill version, and loaded files.

## Validation Report

```ts
type ValidationReport = {
  ok: boolean;
  generatedAt: string;
  skillName: "new-novels-case-adapter";
  skillVersion: string;
  caseId: string;
  title: string;
  summary: {
    chapters: number;
    agents: number;
    acts: number;
    actGates: number;
    storyEvents: number;
    facts: number;
    clues: number;
    contradictions: number;
    accusationQuestions: number;
  };
  issues: Array<{
    severity: "fatal" | "warning" | "suggestion";
    code: string;
    filePath: string;
    fieldPath?: string;
    message: string;
    suggestion: string;
  }>;
};
```

Fatal issues block ready status and publishing. Warnings and suggestions allow Studio review but must remain visible.

## Adaptation Notes

`adaptation-notes.md` is creator-facing. It should include:

- Source Profile
- Default Options
- Fair-Play Spine
- Segmentation Summary
- Reading Rewrite Strategy
- Investigation Conversion Strategy
- NPC Runtime Strategy
- Act Gates And Story Events
- Validation Summary
- Human Review Checklist

## Failure Policy

- Unparseable source file: fail before draft creation.
- Missing clear mystery truth: fatal.
- Non-JSON model output: fatal.
- Schema-invalid package: fatal.
- Fatal quality report item: fatal.
- Warning-only rights or editorial risks: create draft and show warnings.
