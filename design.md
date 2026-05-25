# New Novels Design

## Product Feel

New Novels should feel like reading an elegant detective novella while keeping a
real investigation desk beside the text. It is not a marketing page, a generic
chat app, or a heavy game dashboard.

The interface should be:

- literary, quiet, and text-first;
- modern, precise, and uncluttered;
- focused on player deduction rather than system guidance;
- explicit about high-risk actions such as restart or deletion;
- restrained enough that the story and investigation remain the center.

## Layout

The primary desktop layout has three work areas:

- Story reader.
- Investigation desk.
- Detective notebook drawer.

Default desktop state:

- Story reader on the left.
- Investigation desk on the right.
- Notebook closed, represented only by a small top-right drawer entry.

Notebook-open state:

- Story and investigation columns compress.
- Notebook appears as a third work area.
- The notebook must not leave a full-height rail when closed.

Mobile state:

- Three bottom tabs: Story, Investigation, Notebook.
- Tabs share one play state.
- No desktop-only sidebars should leak into mobile.

## Story Reader

The story reader is pure prose.

Do:

- show title, source title, chapter subtitle, and chapter text;
- render one chapter as a continuous scrollable reading page;
- provide previous/next chapter controls at the bottom;
- show lightweight floating chapter controls when the user clicks the story
  area;
- use Pretext only as a reading/layout support layer, with DOM text remaining
  accessible.

Do not:

- put investigation actions, hints, or status chips inside the story pane;
- explain the UI inside the story text;
- expose hidden case state in the reading area.

## Investigation Desk

The investigation desk is where all user action starts.

Structure:

- A status header.
- Collapsible conversation modules.
- One global input for new questions.

Default module:

- The first expanded module is the general investigation assistant.
- The general assistant can answer unlocked scene/fact questions and route the
  player toward relevant NPCs.

NPC modules:

- Each configured NPC has its own module.
- If routing detects that a question belongs to an NPC, the answer is written to
  that NPC module.
- Modules should support scanning history without forcing every conversation to
  stay open.

The player should never need to choose from artificial action buttons to ask a
question. Natural language is the main interaction.

## Detective Notebook

The notebook is player-owned.

Required behaviors:

- Opened from a compact top-right entry.
- Supports manual note creation.
- Supports saving excerpts from agent replies.
- Notes can be edited.
- Notes can be filtered by tag.
- Notes sort newest first.
- Deleting notes requires confirmation.

Tags:

- clue
- testimony
- doubt
- contradiction

The system should not decide which notes are important. Importance and meaning
belong to the player's reasoning process.

## Final Accusation

The final accusation page stays deliberately simple:

- A centered dialogue surface.
- The system asks one question at a time.
- The user answers in natural language.
- A wrong answer clears the accusation attempt and offers a return to
  investigation.
- All correct answers reveal the solved state.

Final accusation checking is deterministic and based on case data. The model may
frame the experience, but it must not decide whether the player solved the case.

## Visual Language

Use a restrained editorial palette:

- warm paper background;
- near-black body text;
- soft gray dividers;
- muted accent color for active controls;
- tag colors that help scanning without dominating the page.

Interaction details:

- Buttons should have clear focus and hover states.
- Icon-only or compact controls need accessible labels.
- Cards are only for repeated items, conversation modules, notes, and modals.
- Avoid nested cards and decorative backgrounds.
- Text should fit cleanly at desktop and mobile widths.

## AI Interaction Principles

AI NPCs should feel alive, but the UI should never pretend the model is the
source of truth.

The product should communicate through behavior:

- the user asks freely;
- the runtime routes the question;
- the NPC answers in character;
- guardrails keep the answer inside the case facts;
- the player decides what matters and records notes manually.

No UI copy should expose prompt mechanics, hidden rules, private facts, or
internal runtime state.
