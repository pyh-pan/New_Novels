---
name: new-novels-case-adapter
description: "Use when transforming an uploaded detective or mystery novel into a New Novels interactive fair-play case package. Produces the project-ready case architecture: manifest, caseFile, chapters, facts, clues, scenes, NPC agents, reveal rules, contradictions, and final accusation questions."
---

# New Novels Case Adapter

## Purpose

Turn a detective story source file into a complete New Novels case package that can be validated against this repository's case schema and run as an interactive fair-play mystery.

Use this skill when the user uploads, pastes, or points to a mystery story and asks to parse, adapt, rewrite, structure, import, or make it playable in New Novels.

## First Reads

Before generating or editing a case, inspect the current repository version of:

- `readme.md` and `roadmap.md` for product direction.
- `lib/case/schema.ts` for the canonical runtime `CaseFile` contract.
- `lib/case-package/schema.ts` for the package wrapper contract.
- `lib/case/hammer-of-god.ts` and `lib/case-package/hammer-of-god-package.ts` for local examples.

For detailed field guidance, read `references/case-package-v1.md`. For the conversion process, read `references/novel-to-case-workflow.md`.

## Output Contract

Prefer producing both forms when the target app does not yet have a directory loader:

1. A single canonical package object:
   - `manifest`
   - `caseFile`
2. A directory-ready layout matching the roadmap:
   - `manifest.json`
   - `case.json`
   - `story/chapters.json`
   - `story/*.md`
   - `agents/*.json`
   - `clues/clues.json`
   - `accusation/questions.json`
   - `assets/` only when actual assets are needed

The single object is the source of truth for validation today. The split files are for creator-facing package authoring and future loader work.

## Adaptation Rules

- Preserve a fixed truth. Never let agent prompts or model behavior invent the culprit, method, motive, timeline, evidence, or final answer.
- Make the mystery fair-play: every final answer must be inferable from explicit facts, clues, testimony, or contradictions.
- Separate reading text from investigation data. Chapters should read like prose; facts and clues should carry the machine-checkable case logic.
- Treat all model-facing NPC content as untrusted performance around structured facts. Put product rules in `facts`, `clues`, `truth`, `revealRules`, `boundaries`, and `accusation`.
- Keep spoilers gated. `truth` facts can exist in the package, but ordinary NPCs should not reveal them before the accusation stage.
- Make every id stable, lowercase, hyphenated, and meaningful: `fact-bell-tower-shadow`, `clue-light-hammer`, `act-opening`.
- Prefer fewer, stronger clues over many vague clues. Each clue should help a player ask a better question, notice a contradiction, or answer the final accusation.

## Workflow

1. **Ingest the source**
   - Identify title, author, language, rights note, narrator, setting, victim, suspects, timeline, and final solution.
   - If the source is copyrighted or unclear, ask for confirmation that the user has rights to adapt it before generating distributable prose.

2. **Extract the mystery spine**
   - Culprit, victim, motive, method, decisive evidence.
   - False solution and why it is tempting.
   - The minimum clue chain needed for a fair player to solve the case.
   - Testimony that is true, false, evasive, partial, or misleading.

3. **Design the playable structure**
   - Create acts that represent investigation phases.
   - Create scenes with observable facts and interactable objects.
   - Create chapters as prose context available to the reader.
   - Create NPC agents and one required general agent with `id: "general"`.

4. **Build the fact ledger**
   - Public facts: safe opening information.
   - Unlocked facts: fair clues revealed by investigation.
   - Private facts: NPC-specific knowledge, motives, secrets, and lies.
   - Truth facts: final answer components and spoiler-only logic.

5. **Build clue and reveal logic**
   - Every clue should have unlock hints and optional structured unlock metadata.
   - Every reveal rule must reference existing `factId`, `clueId`, `actId`, and contradiction ids.
   - Reveal modes should match the dramatic behavior: `direct`, `reluctant`, `evasive`, or `partial`.

6. **Build NPCs**
   - Each NPC needs aliases, role, personality, knowledge, boundaries, lie strategies, and reveal rules.
   - NPCs should know only what their role allows.
   - Use `forbiddenClaims` to prevent cross-NPC omniscience and premature truth leakage.

7. **Build final accusation**
   - Include questions that cover culprit, method, decisive contradiction/evidence, and motive.
   - Accepted answers should include likely variants, aliases, and concise paraphrases.
   - Explanations should reveal the canonical truth after success or failure handling.

8. **Validate and repair**
   - Run the repository's tests when the package is wired into code.
   - For standalone package JSON, run `scripts/check_case_package_refs.mjs` from this skill as a quick reference-integrity pass.
   - Repair duplicate ids, missing references, missing general agent, uncovered truth, and spoiler leaks before handing off.

## Quality Bar

The generated case is not complete until:

- `caseFile` can satisfy `caseSchema`.
- `manifest.caseId` matches `caseFile.id`.
- `manifest.entryChapterId` exists in `caseFile.chapters`.
- All referenced ids exist.
- There is exactly one general investigation agent with `id: "general"` and `type: "general"`.
- The accusation questions cover every essential truth component.
- No ordinary NPC can reveal the full solution through normal conversation.
- The story can be read without UI instructions embedded in the prose.

## Common Failure Modes

- Putting the entire mystery solution in `storyText` or early chapter prose.
- Creating clue ids in `revealRules` that do not exist in `clues`.
- Giving all NPCs omniscient knowledge because the source story narrator knows the truth.
- Making accepted answers too strict, causing a correct human answer to fail.
- Treating atmosphere as evidence. Only structured facts and clues should drive final judgment.
