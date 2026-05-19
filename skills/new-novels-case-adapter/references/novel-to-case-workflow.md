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
