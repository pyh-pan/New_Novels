# Web Design Direction

This document records the current visual and interaction direction for the AI NPC fair-play detective prototype. It is intentionally focused on product shape, layout, and UX style. Implementation details should live in a separate technical plan.

## Product Feel

The product should feel like an interactive detective novella, not a chat app and not a conventional game dashboard.

The first impression should be:

- I am reading a mystery story.
- I can interrupt the story world by investigating freely.
- My notes and deductions matter.
- The final accusation is earned through reasoning, not guessing.

The interface should stay quiet, literary, and focused. Avoid decorative game UI, oversized visual effects, and heavy dashboards. The strongest visual signal should be text, structure, and evidence.

## Page Structure

The main page uses a two-column layout.

### Left Column: Story

The left column is only for story text.

It should contain:

- Case title
- Chapter or scene label
- Novel-style narrative text
- Scrollable story history so the user can reread context

It should not contain:

- Action buttons
- Investigation prompts
- Location/status chips
- System hints
- Suggested next steps

The player should infer information from the prose and choose what to ask in the investigation panel.

### Right Column: Investigation Desk

The right column is the active investigation space.

It contains collapsible conversation modules:

- General scene investigation agent
- Individual NPC conversations
- Any newly created conversation module routed from user input

The bottom of the investigation desk has one global input area for starting a new question. The system routes the input:

- If the question concerns observable scene facts, it goes to the scene investigation agent.
- If the question addresses an existing NPC, it is appended to that NPC module.
- If the question starts a new topic or target, a new module can be created.

The user should not need to manually choose the correct agent every time. The routing should feel natural.

## Detective Notebook

The detective notebook is hidden by default.

When collapsed:

- Do not show a full vertical sidebar.
- Do not show a large "open notebook" button.
- Show only a small button in the top-right corner, similar to a browser sidebar control.

When expanded:

- The notebook compresses the story and investigation columns.
- It does not overlay the content.
- It becomes a third column on the right.

The notebook has tag filters at the top:

- All
- Clue
- Testimony
- Doubt
- Contradiction

Each note has a visible tag and a distinct background color. Initial color direction:

- Clue: pale yellow
- Testimony: pale blue
- Doubt: pale violet
- Contradiction: pale red

Users can save text from investigation replies into the notebook. Notes should be editable and taggable.

The final accusation button lives at the bottom of the expanded notebook. It should adapt to the notebook width and feel like the next natural step after reviewing evidence.

## Final Accusation Page

The final accusation page should be simple.

It contains one centered conversation box.

Flow:

1. The AI asks the first question.
2. The user answers.
3. The AI asks the next question only if the answer is correct.
4. If any answer is wrong, the system shows an error dialog.
5. The error dialog has a "continue investigation" button that returns to the main page.
6. When the user returns later, the accusation page starts fresh with no prior accusation history.
7. If all answers are correct, the system shows a "truth revealed" state and ends the game.

The accusation page should not show a large dashboard, progress panel, or multiple side sections. It should feel like a final cross-examination.

Correctness should be decided by structured case data, not by free-form AI judgment. The AI asks questions naturally, but the system owns the answer key.

## Visual Style

The current style direction:

- Quiet literary interface
- Warm paper-like background
- Clear borders instead of heavy cards
- Dense but readable text
- Minimal color except notebook tags and primary actions
- No decorative gradients, orbs, or game-like chrome

The story column should feel closest to a well-typeset reading surface.

The investigation column should feel like a restrained workbench.

The notebook should feel like a working detective notebook, not a sidebar menu.

## Typography

Typography should prioritize long-form reading and fast scanning.

Initial direction:

- Story text: readable serif or high-quality system serif
- Interface text: system sans-serif
- Avoid oversized headings inside tool panels
- Keep letter spacing normal
- Use line height generously in story text

## Interaction Principles

- The user should always know where to type next.
- The story should never tell the user what to click.
- Investigation happens through natural language.
- Notebook capture should be one click from any useful agent response.
- Tags should help the user think, not replace thinking.
- Wrong final accusations should not reveal the answer.
- The interface should support rereading, comparing, and revising assumptions.

## Current Prototype Layout Summary

Main page collapsed state:

```text
┌───────────────────────────────┬───────────────────────────────┐
│ Story text                    │ Investigation desk             │
│                               │ ┌ Scene investigation module ┐ │
│ Novel-style context only      │ └────────────────────────────┘ │
│ No action buttons             │ ┌ NPC module, collapsed       │ │
│ No hints                      │ └────────────────────────────┘ │
│                               │ New conversation input         │
│                         ✎ notebook button in top-right         │
└───────────────────────────────┴───────────────────────────────┘
```

Main page expanded notebook state:

```text
┌─────────────────────┬─────────────────────┬───────────────────┐
│ Story text          │ Investigation desk   │ Detective notebook │
│ compressed          │ compressed           │ tag filters        │
│                     │ conversation modules │ colored notes      │
│                     │ global input         │ final accusation   │
└─────────────────────┴─────────────────────┴───────────────────┘
```

Final accusation page:

```text
┌─────────────────────────────────────────────┐
│                                             │
│              Final accusation               │
│         centered AI/user dialogue box        │
│                                             │
│     wrong -> continue investigation          │
│     all correct -> truth revealed            │
│                                             │
└─────────────────────────────────────────────┘
```

## Open Design Questions

These can be refined later:

- Exact typography pair
- Final color palette
- Notebook open/close icon
- Mobile layout behavior
- Whether multiple investigation modules can stay expanded at once
- How much animation the notebook drawer should use
- Whether story text updates after discoveries or remains chapter-based
