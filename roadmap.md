# Product Roadmap

This roadmap records the current product direction for New Novels. It is expected
to change as the prototype is built, tested, and revised.

Roadmap items are not commitments to specific dates. They are a shared working
map for product iteration.

## Product North Star

Create a text-first detective experience where players feel they solved the case
themselves.

The player should:

- Read a mystery like a novella.
- Ask questions freely.
- Discover clues and contradictions through investigation.
- Keep their own notes.
- Make a final accusation that is judged fairly.

The creator should eventually be able to:

- Import or draft a detective story.
- Convert it into a structured interactive case.
- Define NPC knowledge, motives, secrets, and lie boundaries.
- Publish a playable mystery without hand-writing every dialogue path.

## Current State

Completed:

- Defined the product concept: an AI NPC fair-play detective experience.
- Chose a text-first web format instead of a visual game-first format.
- Selected G. K. Chesterton's "The Hammer of God" as the first validation story.
- Built a runnable Next.js prototype for the first case.
- Defined the main product layout:
  - Left column for story text only.
  - Right column for investigation conversations.
  - Collapsible detective notebook opened from a small top-right button.
  - Notebook expands as a third column and compresses the main two columns.
- Defined notebook tags:
  - Clue
  - Testimony
  - Doubt
  - Contradiction
- Defined the final accusation flow:
  - One centered dialogue box.
  - AI asks one question at a time.
  - Any wrong answer returns the player to investigation.
  - The accusation history resets after a failed attempt.
  - All correct answers reveal the truth and end the game.
- Implemented the first structured case data for "The Hammer of God":
  - Truth
  - Victim
  - Characters
  - NPC knowledge fields
  - Scene investigation facts
  - Clues
  - Final accusation questions
- Implemented semantic conversation routing from a single global input, with
  deterministic fallback when LLM routing is unavailable or low-confidence.
- Implemented OpenAI-backed investigation API routes.
- Implemented the first unified agent context architecture:
  - Shared global context
  - Default general investigation agent
  - Per-agent knowledge
  - Per-agent personality
  - Per-agent boundaries
  - Reveal rules
  - In-memory player knowledge state
- Implemented basic output guardrails against direct truth spoilers.
- Implemented editable, taggable detective notes.
- Implemented manual note creation, newest-first notes, and delete confirmation.
- Implemented local browser persistence for play state.
- Implemented a confirmation-protected reset flow.
- Implemented a Pretext-backed chapter reader:
  - One chapter is one scrollable reading page.
  - Chapter navigation appears at the bottom of the chapter.
  - Clicking the reading area reveals temporary previous/next chapter controls.
- Implemented mobile Story / Investigation / Notebook bottom tabs with shared
  state.
- Implemented deterministic final accusation answer checking.
- Captured visual direction in `design.md`.
- Created project documentation scaffolding:
  - `agents.md`
  - `readme.md`
  - `roadmap.md`

Not yet built:

- Hard state-machine enforcement for clue-gated NPC revelation.
- Multi-act story progression.
- Per-scene NPC context changes.
- Rich personality modeling based on the source text.
- Server-side save/resume.
- Creator-facing case authoring tools.
- Full story-to-case conversion workflow.

## Phase 1: Playable Single-Case Prototype

Goal: Build one complete playable case based on "The Hammer of God".

Planned work:

- Create the web application shell.
- Implement the two-column main page.
- Implement the collapsible detective notebook.
- Implement the simplified final accusation page.
- Define a structured case schema:
  - Truth
  - Timeline
  - Characters
  - NPC knowledge
  - Secrets
  - Lies
  - Clues
  - Contradictions
  - Final accusation questions and accepted answers
- Adapt "The Hammer of God" into the case schema.
- Add OpenAI-backed NPC conversations.
- Add a scene investigation agent that answers only observable facts.
- Add conversation routing from a single global input.
- Add note capture from agent responses.
- Add note editing and tag filtering.
- Add final accusation validation.

Success criteria:

- A player can finish the case from start to truth revealed.
- NPCs stay within their knowledge boundaries.
- The scene investigation agent does not invent new evidence.
- Final accusation correctness is determined by structured answers, not by
  free-form AI judgment.

## Phase 2: Fair-Play Guardrails

Goal: Make the prototype trustworthy for detective fiction readers.

Planned work:

- Upgrade NPC control from prompt-only rules to a hybrid architecture:
  - Soft prompt constraints for voice, attitude, hesitation, and improvisation.
  - Hard state-machine constraints for what facts may be revealed.
  - Structured clue gates that determine when an NPC can reveal more.
  - Programmatic checks that separate "the NPC knows this" from "the NPC may say this now".
- Convert `tellsIf` from natural-language hints into executable reveal rules.
- Track player-known information as first-class game state:
  - Discovered clues
  - Heard testimony
  - Recorded contradictions
  - Previously asked confrontation questions
  - Accusation attempts
- Pass relevant player-known state into NPC prompt generation.
- Let NPCs answer differently when the player has enough evidence to confront them.
- Add automated checks for forbidden claims.
- Add answer validation tests for final accusation questions.
- Add logs for model responses that mention facts outside the case schema.
- Add retry or correction behavior when an agent drifts outside allowed facts.
- Add a spoiler-safe hint system only if players repeatedly fail.

Success criteria:

- Players do not encounter invented evidence.
- NPCs can lie only within their configured lie boundaries.
- NPCs only reveal gated facts after the player has earned them.
- The system can explain why a final accusation answer is accepted or rejected.

## Phase 3: NPC Personality And Source-Text Fidelity

Goal: Make each NPC feel like a distinct person instead of a generic role.

Planned work:

- Extract richer personality traits from the original text and adaptation notes.
- Add structured personality fields to each NPC:
  - Speech style
  - Emotional baseline
  - Stress response
  - Social posture
  - Moral worldview
  - Relationship to the victim
  - Relationship to other NPCs
  - Typical evasive habits
- Separate personality from factual knowledge:
  - Personality controls tone and behavior.
  - Knowledge boundaries control what can be said.
  - Reveal rules control when hidden facts can surface.
- Add per-NPC response examples as style anchors.
- Add tests or review scripts that sample NPC answers and check for voice drift.
- Tune temperature and prompt structure per role if needed.

Success criteria:

- Players can tell which NPC is speaking from tone alone.
- NPCs respond to pressure in character.
- Different NPCs hide information in different ways.
- Personality never overrides fair-play fact boundaries.

## Phase 4: Dynamic Multi-Act Story Progression

Goal: Move from a static opening scene to a complete story that advances through multiple acts.

Planned work:

- Introduce a scene/act model:
  - Act title
  - Story text for that act
  - Available NPCs
  - Available locations or investigation topics
  - Act-specific allowed facts
  - Act-specific forbidden claims
  - Conditions for progressing to the next act
- Allow NPC context to change by act:
  - What the NPC currently knows.
  - What the NPC is willing to admit.
  - What the NPC is trying to hide at this stage.
  - Whether the NPC is calm, defensive, frightened, or cornered.
- Add confrontation states:
  - The player presents a contradiction.
  - The system checks whether the contradiction is valid.
  - The NPC updates from denial to partial admission, evasion, anger, or confession-like leakage.
- Support dynamic story inserts when important clues are found.
- Keep the left story column as readable prose while letting investigation results unlock new paragraphs or acts.
- Decide whether act progression is:
  - Player-triggered after enough clues.
  - System-triggered after key discoveries.
  - Hybrid, with explicit "continue story" moments.

Success criteria:

- The case feels like a developing investigation, not a static chat room.
- NPC answers evolve based on what the player has discovered.
- Players can pressure NPCs with evidence and see believable behavioral changes.
- Story progression remains fair: new acts do not require hidden or arbitrary triggers.

## Phase 5: Creator Case Authoring

Goal: Make case creation repeatable instead of hand-built.

Planned work:

- Create a case authoring format in JSON or YAML.
- Add schema validation.
- Add example cases.
- Add tools for breaking a story into:
  - Scenes
  - Characters
  - Timeline
  - Clues
  - Contradictions
  - NPC knowledge boundaries
- Explore AI-assisted story-to-case conversion.
- Add an internal preview mode for testing NPC behavior.

Success criteria:

- A creator can read the schema and understand how to author a small case.
- The first case can be modified without editing application code.
- New NPCs and clues can be added through structured data.

## Phase 6: Player Experience Refinement

Goal: Make the prototype feel polished, readable, and replayable.

Planned work:

- Refine typography and spacing.
- Continue using `chenglou/pretext` as a text layout layer for richer frontend interactions:
  - Chapter reading measurement and future reading-progress refinements.
  - Stable AI message bubble sizing during long or streaming NPC replies.
  - Virtualized long conversation histories with fewer layout jumps.
  - Notebook card height prediction for dense note browsing.
  - Development-time overflow checks for text-heavy controls.
- Use Pretext selectively for measurement and layout calculation, while keeping
  rendered text accessible through normal DOM wherever possible.
- Continue improving notebook interactions.
- Add smoother notebook open/close behavior.
- Add server-side save/resume.
- Add clearer end-game truth reveal.
- Run playtests with detective fiction readers.

Success criteria:

- Players can navigate the interface without instructions.
- Long text, dialogue, and notes remain stable without distracting reflow.
- Story reading feels intentionally designed rather than like a plain scroll area.
- Notes help reasoning without solving the case for the player.
- The final accusation feels earned.
- Players want to try another case.

## Phase 7: Multi-Case Platform Direction

Goal: Turn the prototype into a small platform for interactive detective fiction.

Possible work:

- Case library
- Creator upload flow
- Case validation tools
- Versioned case files
- Community playtesting
- Difficulty labels
- Public sharing links
- Multiple endings or post-case analysis

Open questions:

- Should creators publish cases directly, or should cases be reviewed first?
- Should AI help write missing NPC behavior, or only validate structured cases?
- How much freedom should players have before it harms fair-play mystery design?
- How should copyright and adaptation rights be handled for non-public-domain
  stories?

## Risks To Track

- AI may invent facts unless tightly constrained.
- Free-form conversation may make players miss necessary clues.
- Too much UI support may make the game feel like a guided quiz.
- Too little UI support may make the game feel like unstructured chat.
- Pretext may add layout complexity before text performance or pagination truly
  requires it.
- Creator tooling can become too broad before the first case proves the core
  experience.

## Next Immediate Step

Run playtests on the current single-case prototype and use the results to decide
whether the next iteration should focus on fair-play guardrails, richer NPC
personality, or multi-act story progression.

The next implementation should stay narrow:

- One story
- One case schema
- One chapter reader
- One investigation desk
- One notebook
- One final accusation flow

Do not build a general creator platform until the single-case experience feels
compelling to detective fiction readers.
