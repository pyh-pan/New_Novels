# Case Package v1

Case packages are the content boundary between a mystery story and the New
Novels runtime. A package contains readable prose plus structured facts, NPCs,
rules, and final accusation data.

The authoritative schema is in:

- `lib/case/schema.ts`
- `lib/case-package/schema.ts`

The local skill reference is in:

- `skills/new-novels-case-adapter/references/case-package-v1.md`

## Filesystem Layout

A runnable package directory must include:

```text
manifest.json
case.json
story/chapters.json
story/*.md
agents/global-context.json
agents/<agent-id>.json
facts/facts.json
acts/acts.json
acts/gates.json
scenes/scenes.json
clues/clues.json
relationships/relationships.json
propagation/rules.json
contradictions/contradictions.json
truth/truth.json
victims/victims.json
accusation/questions.json
```

`case.json` is an aggregate review snapshot. The loader reads split files, and
chapter bodies come from `story/*.md`.

## Built-In Example

The built-in package is:

```text
cases/hammer-of-god/
```

It is loaded by `getDefaultCase()` and powers the default app experience.

## Important Sections

### Manifest

`manifest.json` identifies the package:

- `schemaVersion`: must be `case-package/v1`;
- `caseId`: must match `caseFile.id`;
- `title`;
- `language`;
- `entryChapterId`;
- source title, author, and rights note.

### Story

`story/chapters.json` contains chapter metadata. Each chapter `body` points to a
markdown file under `story/`.

Story prose should remain literary. Do not put UI instructions, hidden facts, or
final solution text into early chapters.

### Facts

`facts/facts.json` is the fact ledger. Facts are the stable source for:

- scene observations;
- clue support;
- NPC reveal rules;
- contradictions;
- accusation answers;
- hidden truth.

Fact visibility can be `public`, `unlocked`, `private`, or `truth`.

### Agents

Every case must include one general agent:

```json
{
  "id": "general",
  "type": "general"
}
```

NPC files define:

- aliases;
- personality;
- knowledge;
- boundaries;
- lie strategies;
- reveal rules;
- pressure profiles;
- emotional arcs;
- style anchors.

NPC private facts affect behavior but are not automatically allowed as spoken
facts.

### Acts and Act Gates

`acts/acts.json` defines playable investigation phases.

`acts/gates.json` defines how the player unlocks the next phase. Gates can
require:

- clue ids;
- fact ids;
- contradiction ids;
- NPC interactions;
- scene interactions.

Act gates should prove investigation progress. They should not depend on vague
keyword guessing alone.

### Accusation

`accusation/questions.json` defines final questions and accepted answers.

Final accusation checking is deterministic. Keep accepted answers broad enough
for reasonable human phrasing, but grounded in the canonical truth.

## Validation

Run:

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hammer-of-god
```

The same checker accepts aggregate package JSON, split package directories, and
zip files:

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs case-package.zip
```

The loader can also return structured validation reports:

```ts
validateCasePackageDirectory("cases/hammer-of-god")
```

Reports use:

- `severity`;
- `code`;
- `filePath`;
- optional `fieldPath`;
- `message`;
- `suggestion`.

## Content Adaptation

Use `skills/new-novels-case-adapter/` when converting a detective story into a
case package. The skill is responsible for producing runtime-ready data, not only
rewritten prose.

Minimum useful output:

- chapters;
- facts;
- clues;
- contradictions;
- agents;
- pressure profiles;
- reveal rules;
- acts and act gates;
- final accusation questions.

## Zip Preview

The web app exposes a preview-only import path:

```text
POST /api/cases/preview
```

Send a multipart `file` field containing a package zip. The endpoint accepts
both zips whose files live at the root and zips with one top-level folder. On
success it returns:

- manifest data;
- case id and title;
- counts for chapters, agents, acts, clues, and accusation questions;
- structured issues.

The toolbar import UI uses this endpoint to validate a package before a future
runtime activation flow.

## Quality Checks

`check_case_package_refs.mjs` now checks both reference integrity and minimum
runtime readiness:

- exactly one `general` agent;
- unique ids;
- valid references for facts, clues, acts, gates, scenes, relationships,
  propagation rules, contradictions, pressure rules, and reveal rules;
- at least three accusation questions;
- non-final acts have unlock gates;
- NPCs include source-specific pressure rules, emotional arcs, confrontation
  triggers, and style anchors.
