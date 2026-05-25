# Case Package v1 Reference

This reference summarizes the current New Novels schema as of this repository state. Always prefer the live TypeScript schema in `lib/case/schema.ts` and `lib/case-package/schema.ts` if they differ.

## Package Shape

```json
{
  "manifest": {},
  "caseFile": {}
}
```

The importable filesystem package must include:

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

`case.json` is the aggregate review snapshot. The directory loader reads the split files and uses `story/*.md` as the chapter body source, so copied or uploaded packages must keep these files in sync.

`manifest` must satisfy:

- `schemaVersion`: exactly `case-package/v1`
- `caseId`: same as `caseFile.id`
- `title`
- `language`, for example `zh-CN`
- `entryChapterId`: must match a chapter id
- `createdBy`
- `source.title`
- `source.author`
- `source.rightsNote`

`caseFile` is the runtime object consumed by the app.

## Required CaseFile Sections

- `id`, `title`
- `globalContext`
- `source`
- `storyText`
- `chapters`
- `acts`
- `actGates`
- `scenes`
- `facts`
- `relationships`
- `propagationRules`
- `contradictions`
- `truth`
- `victims`
- `agents`
- `clues`
- `accusation.questions`

## Global Context

Use short, concrete rules:

- `fairPlayRules`: how the mystery remains solvable and fixed.
- `conversationRules`: how agents answer.
- `spoilerRules`: what cannot be revealed before final accusation.
- `fabricationRules`: what agents must never invent.
- `toneRules`: language, length, and literary style.

## Chapters

Each chapter:

- `id`
- `title`
- optional `subtitle`
- `body`
- `availableFromStart`
- optional `previousChapterId`
- optional `nextChapterId`

Use chapters for readable prose, not system instructions. If the source is long, rewrite into playable chapters that preserve clue order and fair-play pacing.

## Acts

Each act:

- `id`
- `title`
- `availableAgentIds`
- `visibleClueIds`
- `lockedFactIds`
- optional `entryConditions`
- optional `exitConditions`

Use acts to gate information. Opening acts should expose suspects and obvious evidence, while later acts can unlock contradictions or deeper testimony.

## ActGates

Each act gate:

- `id`
- `fromActId`
- `toActId`
- `requiredClueIds`
- `requiredFactIds`
- `requiredContradictionIds`
- `requiredNpcInteractions`
- `requiredSceneInteractions`
- `unlockNarrative`

Use actGates to create 剧本杀式 progression. A gate should prove the player has completed a phase of reasoning before the next act opens. Do not unlock acts from vague topics alone.

## Scenes

Each scene:

- `id`
- `actId`
- `location`
- `observableFactIds`
- `interactableObjects`
- `ambientText`

Scenes are investigation surfaces. Observable facts must point to existing fact ids.

## Facts

Each fact:

- `id`
- `text`
- `visibility`: `public`, `private`, `truth`, or `unlocked`
- `ownerAgentIds`
- `relatedClueIds`
- optional `actId`
- `keywords`

Use facts as the ledger. Every clue, reveal, contradiction, scene observation, and accusation should trace back to facts.

Visibility guidance:

- `public`: safe from the start.
- `unlocked`: found by investigation.
- `private`: known to one or more NPCs but not automatically revealed.
- `truth`: final solution or spoiler-level fact.

## Clues

Each clue:

- `id`
- `title`
- `text`
- `tag`: `clue`, `testimony`, `doubt`, or `contradiction`
- `source`
- `unlockHints`
- optional `unlock.type`: `agent-response`, `story`, `manual`, or `system`
- optional `unlock.agentId`
- optional `unlock.topics`
- optional `unlock.factIds`

A clue should be player-useful: it either changes suspicion, opens a new question, resolves a false solution, or supports final accusation.

## Agents

All agents share:

- `id`
- `type`
- `aliases`
- `name`
- `role`
- `promptVersion`
- `permissions`
- `lieStrategy`
- `pressureProfile`
- `emotionalArc`
- `confrontationTriggers`
- `confessionBoundary`
- `styleAnchors`
- `personality`
- `knowledge`
- `revealRules`

The case must include:

```json
{
  "id": "general",
  "type": "general",
  "knowledgeScope": "unlocked-only"
}
```

The general agent also needs `allowedTopics` and `forbiddenClaims`.

NPC agents need `boundaries`:

- `hides`
- `liesAbout`
- `forbiddenClaims`

Permissions usually keep agents bounded:

```json
{
  "canSeeTruth": false,
  "canSeeOtherAgentsPrivateFacts": false,
  "canRevealUnsolvedClues": false,
  "canCreateNewFacts": false,
  "canReferencePlayerNotes": false
}
```

Only the general agent commonly sets `canReferencePlayerNotes` to true.

## Runtime Behavior Fields

Each NPC should have a source-specific `pressureProfile`:

```json
{
  "baseline": 0,
  "thresholds": { "guarded": 2, "cornered": 5 },
  "increaseRules": [
    {
      "id": "wilfred-tower-contradiction",
      "topics": ["钟楼", "小锤", "伤口"],
      "clueIds": ["small-hammer", "tower-height"],
      "factIds": ["fact-small-hammer-weight"],
      "contradictionIds": ["contradiction-hammer-force"],
      "delta": 3,
      "reason": "玩家把钟楼高度、小锤重量和伤口力度放在一起逼问。"
    }
  ]
}
```

`emotionalArc` must define `calm`, `guarded`, and `cornered`. `confrontationTriggers` lists the topics that should increase pressure. `confessionBoundary` names what the NPC still cannot directly admit. `styleAnchors` gives short in-character examples for tone.

## Reveal Rules

Each reveal rule:

- `id`
- `factId`
- `fact`
- optional `requiresClues`
- optional `requiresAllClues`
- optional `requiresAnyClues`
- optional `requiresTopics`
- optional `requiresPressureAtLeast`
- optional `requiresAct`
- optional `requiresContradictions`
- `revealMode`: `direct`, `reluctant`, `evasive`, or `partial`

Every `factId`, clue id, act id, and contradiction id must exist.

## Relationships and Propagation

Relationships model attitudes between NPCs:

- `from`
- `to`
- `attitude`: `protective`, `hostile`, `fearful`, or `indifferent`
- `knownFactsAboutOther`

Propagation rules model how information can move:

- `fromAgentId`
- `toAgentId`
- `factId`
- `condition`
- `mode`: `rumor`, `direct`, or `observed`

Use these only when they clarify runtime behavior. Leave arrays empty when not needed.

## Contradictions

Each contradiction:

- `id`
- `title`
- `factIds`: at least two
- `clueIds`
- `agentIds`

Contradictions are ideal for fair-play locks and final accusation questions.

## Truth and Accusation

`truth`:

- `culprit`: must match an agent id
- `victim`: must match a victim id
- `motive`
- `method`
- `decisiveEvidence`

Each accusation question:

- `id`
- `prompt`
- `acceptedAnswers`
- `explanation`

Minimum useful final accusation set:

- culprit
- method
- decisive contradiction or evidence
- motive

Add victim, opportunity, or alibi questions only when the mystery needs them.
