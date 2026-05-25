# Novel To Case Workflow

Use this workflow to transform source fiction into a playable New Novels case without losing fair-play structure.

## 1. Source Pass

Create a private working brief:

- Source title, author, rights status, language.
- Setting, era, central location, narrative voice.
- Victim and suspects.
- Final truth: culprit, motive, method, decisive evidence.
- False solution: who looks guilty and why.
- Original clue order.
- Any clue that depends on prose subtlety rather than explicit evidence.

If the story is still under copyright and the user has not said they have rights, do not reproduce large adapted passages. Offer a structural extraction workflow instead.

## 2. Fair-Play Spine

Reduce the source to a solvable chain:

1. Opening situation.
2. Obvious evidence.
3. Misleading suspect or false explanation.
4. Odd detail that does not fit.
5. Testimony that creates pressure.
6. Contradiction that points at the method.
7. Motive or identity lock.
8. Final accusation requirements.

Every final answer must be supported by at least one structured clue or contradiction.

## 3. Rewrite Chapters

Write chapters as literary case context:

- Keep the story column quiet and novel-like.
- Do not insert UI instructions or checklist language.
- Do not reveal the final culprit, method, or motive unless that chapter is intended to unlock after solving.
- Make sure the opening chapter includes enough atmosphere and initial evidence to begin investigation.

Recommended chapter ids:

- `chapter-1`
- `chapter-2`
- `chapter-solution` only if a post-solve reveal chapter is needed

## 3.5 设计剧本杀式多幕结构

不要把多幕剧情理解成普通章节分页。Act 是玩家的信息状态和调查阶段。

为每一幕定义：

- 玩家当前知道什么。
- 这一幕能问哪些 NPC。
- 这一幕能调查哪些 scene 和 object。
- 这一幕必须发现哪些 facts、clues、contradictions。
- 这一幕必须完成哪些 NPC interactions 或 scene interactions。
- 进入下一幕的 ActGate。
- 解锁下一幕时给玩家看的 non-spoiler unlockNarrative。

常见结构：

1. `act-opening`: 案发现场，发现表层物证和 false solution。
2. `act-testimony`: 证词阶段，发现人物关系和前后矛盾。
3. `act-confrontation`: 对质阶段，用已发现矛盾逼问关键 NPC。
4. `act-accusation`: 指认或真相阶段。

每一幕都要有 required discoveries。玩家进入下一幕时应该感觉自己完成了一个阶段性谜题，而不是只是翻到下一章。

## 4. Build Facts Before Agents

Write all facts before writing NPCs. This prevents agents from inventing details.

Useful categories:

- Scene facts: body position, objects, weather, sightlines, sounds, timings.
- Testimony facts: what each character says happened.
- Character facts: relationships, motives, fears, secrets.
- Forensic or logical facts: physical constraints, timing impossibilities, missing traces.
- Truth facts: culprit, method, motive, staged evidence, decisive explanation.

Then connect:

- scenes to observable facts
- clues to facts
- contradictions to facts
- reveal rules to facts
- accusation to truth facts

## 5. Design NPCs From Knowledge Boundaries

For each NPC, write:

- What they publicly know.
- What they privately know.
- What they believe but may be wrong about.
- What they hide.
- What they lie about.
- What they must never claim.
- How they speak when calm.
- How they respond under pressure.

Then generate runtime behavior:

- `pressureProfile`: baseline, guarded/cornered thresholds, and increase rules from source-specific triggers.
- `emotionalArc`: how the NPC changes from calm to guarded to cornered.
- `confrontationTriggers`: source-derived topics, clues, facts, or contradictions that make this NPC defensive.
- `confessionBoundary`: what the NPC cannot directly admit even when cornered.
- `styleAnchors`: short in-character lines that guide tone.

Do not use one fixed pressure model for every NPC. A proud suspect, frightened witness, protective spouse, and culprit should have different thresholds and pressure deltas.

Do not let an NPC know the narrator's full solution unless they are the culprit or a character who canonically knows it. Even the culprit should be blocked from confessing through ordinary reveal rules.

## 6. General Agent

The `general` agent is the investigation desk, not an omniscient detective.

It can:

- Describe unlocked scene information.
- Help compare known facts.
- Point the player toward related NPCs or objects.
- Explain that evidence is insufficient.

It must not:

- Solve the case for the player.
- Reveal truth facts before final accusation.
- Create new facts or evidence.

## 7. Reveal Rule Design

Use reveal rules to make questioning feel alive:

- `direct`: factual information that can be given plainly.
- `partial`: useful but incomplete hints or observations.
- `reluctant`: information revealed after social or evidentiary pressure.
- `evasive`: deflection that still updates suspicion or exposes behavior.

Good reveal rules reference:

- clue possession
- topic words
- act
- pressure level
- contradictions

Avoid reveal rules that unlock the full answer in one step.

## 8. Accusation Design

Questions should test the player's deduction, not their exact wording.

For accepted answers:

- Include names and aliases.
- Include concise paraphrases of method and motive.
- Include source-language names if the case has translated names.
- Avoid requiring a full sentence.

A good accusation can fail fairly. If a player misses the method or decisive contradiction, they should know they need to investigate more without being handed the solution too early.

## 9. Self-Review Checklist

Before handoff:

- Does every id use lowercase hyphen-case?
- Does `general` exist and have `type: "general"`?
- Does every referenced agent, clue, fact, act, scene, victim, and question id exist?
- Are `truth.culprit` and `truth.victim` valid ids?
- Does each truth component have supporting clue/fact coverage?
- Can any NPC reveal a truth fact too early?
- Are false clues misleading but not unfair?
- Are chapters readable as prose?
- Are final accepted answers broad enough for natural human input?

## 10. Package Assembly

Assemble both the aggregate snapshot and the split import package:

- `case.json` contains the full `CaseFile` for review and diffing.
- `story/chapters.json` contains chapter metadata; each `body` points to a markdown file in `story/`.
- `agents/global-context.json` contains shared behavior rules.
- `agents/<agent-id>.json` contains exactly one configured agent, including runtime behavior fields.
- `acts/gates.json` contains ActGates with concrete required discoveries.
- `truth/`, `victims/`, `relationships/`, `propagation/`, and `contradictions/` are separate directories even when their arrays are small or empty.

Run the skill checker against the directory:

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/<case-id>
```

Then run the repository loader tests if the package is added to the app.
