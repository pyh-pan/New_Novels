# General UX Iteration Design

Date: 2026-04-29

Status: Draft for user review

## Goal

This iteration improves the current playable detective-fiction prototype without
changing the core agent architecture. The goal is to make the prototype feel
more like a usable reading-and-investigation product:

- preserve the desktop two-column experience;
- make detective notes useful for repeated investigation;
- persist player progress locally;
- introduce a reset/restart flow with explicit confirmation;
- upgrade the story pane into a Pretext-based chapter reader;
- improve conversation ergonomics;
- add a mobile experience based on three focused tabs.

The iteration is intentionally split into small versions so each change can be
reviewed, tested, and committed cleanly.

## Confirmed Product Decisions

### Reading Model

The story area uses a chapter-based reading model.

- One chapter is shown as one continuous scrollable reading page.
- The app does not use page-number pagination for this stage.
- The bottom of each chapter includes previous-chapter and next-chapter buttons.
- During chapter reading, clicking the story area reveals a lightweight floating
  chapter navigation control.
- The floating navigation fades away automatically after a short delay.
- First chapter disables previous-chapter navigation.
- Last chapter disables next-chapter navigation, or may later expose the next
  product step such as final accusation.

### Pretext Usage

Pretext is introduced in V2, but it supports the chapter scrolling model rather
than replacing it with pagination.

Pretext is used as the story reader's text layout foundation:

- prepare chapter text for stable layout;
- measure and segment long-form text;
- support future typography, line, and reading-progress enhancements;
- reduce the chance of rewriting the story reader later.

The first Pretext integration should stay conservative:

- render normal readable DOM text;
- use Pretext for layout preparation or measurement where practical;
- fall back to plain paragraph rendering if Pretext fails or cannot measure;
- avoid virtualized story pages in this version.

### Notebook Interaction

The detective notebook is opened from a small top-right button on the main page.
When closed, it should not occupy a full sidebar rail.

Notebook behavior:

- notes are filterable by tag;
- tags include clue, testimony, doubt, and contradiction;
- notes can be manually added and edited;
- notes can be deleted only after confirmation;
- notes sort newest first by default;
- the system should not decide which notes are "important";
- any future "important" or "pinned" state should be user-controlled;
- final accusation entry stays at the bottom of the notebook.

### Reset Interaction

The app should provide a reset/restart entry near the top-right utility area,
close to the notebook button.

Reset behavior:

- reset always opens a custom confirmation modal;
- accidental reset must be hard to trigger;
- confirmed reset clears local play state;
- cancelled reset preserves everything.

### Persistence Scope

Local persistence should cover the complete first-version play state:

- current chapter;
- conversation history;
- expanded or active conversation module;
- detective notes;
- active notebook filter/search/sort where useful;
- player knowledge state;
- relevant UI state for the investigation desk.

This is localStorage-based only. No account system or server-side save/resume is
part of this iteration.

### Mobile Model

Desktop and mobile should have different layouts.

Desktop remains:

- left: story reader;
- right: investigation desk;
- top-right: notebook drawer button.

Mobile becomes a three-tab app:

- Story;
- Investigation;
- Notebook.

All tabs share the same underlying play state.

## Version Plan

### V0: Git Baseline

Initialize git before implementation so all future iterations can be reviewed
and reverted safely.

Tasks:

- run `git init` if the repository is not already initialized;
- inspect the working tree;
- create an initial baseline commit of the current prototype;
- do not include local-only artifacts or secrets.

Acceptance criteria:

- `git status` is clean after the baseline commit;
- current prototype files are preserved exactly unless ignored intentionally.

### V1: Notes, Persistence, and Reset

Improve the investigation loop without touching the story reader architecture.

Notebook tasks:

- add manual note creation;
- keep edit support for title, body, and tag;
- add note deletion with confirmation;
- sort notes newest first by default;
- optionally preserve created/updated timestamps in note data;
- keep tag filtering;
- add a clear empty state for no notes and no matching filter results.

Persistence tasks:

- introduce a typed localStorage save shape;
- persist conversations, notes, player state, current chapter, and key UI state;
- hydrate safely on load;
- tolerate missing or older saved fields;
- avoid crashing on invalid saved JSON.

Reset tasks:

- add a small reset/restart utility button near the top-right area;
- show a custom confirmation modal before clearing anything;
- clear localStorage only after confirmation;
- return the player to the initial chapter and initial investigation state.

Acceptance criteria:

- reloading the browser preserves investigation state;
- deleting a note cannot happen without confirmation;
- reset cannot happen without confirmation;
- reset returns the app to a clean initial state.

### V2: Pretext Chapter Reader and Conversation Polish

Upgrade the reading surface and make the investigation desk feel more fluid.

Story reader tasks:

- convert story data from a single text block into an ordered chapter structure;
- create or rename the story component into a chapter-oriented `StoryReader`;
- integrate `@chenglou/pretext` as the story layout foundation;
- render one chapter as a continuous scrollable reading page;
- add bottom previous-chapter and next-chapter controls;
- add click-to-reveal floating chapter navigation inside the story area;
- auto-hide floating navigation after a short delay;
- persist current chapter through localStorage;
- provide a plain DOM fallback if Pretext layout fails.

Conversation polish tasks:

- keep one global input model;
- keep routing behavior: general questions stay in the general module, NPC
  questions route to the matching NPC module;
- improve loading states so the active module clearly shows that an answer is
  being generated;
- improve message hierarchy and spacing;
- add keyboard-friendly submit behavior;
- keep excerpt-saving feedback lightweight and visible;
- show clear error bubbles when an agent call fails.

Notebook polish tasks:

- keep notes usable while story and conversation UI change;
- ensure saved excerpts still create notes correctly;
- preserve newest-first ordering;
- preserve tag filtering.

Non-goals:

- no multi-act dynamic story state;
- no page-number pagination;
- no conversation virtualization;
- no server-side persistence;
- no rich text authoring system.

Acceptance criteria:

- a full chapter reads naturally as a scrollable page;
- chapter buttons work at the bottom of the chapter;
- clicking the story area reveals temporary chapter navigation;
- Pretext is present in the story reader path with a fallback;
- investigation conversations still route and save excerpts correctly.

### V3: Mobile Bottom Tabs

Create a mobile-specific layout instead of squeezing the desktop two-column
interface onto a small screen.

Mobile layout:

- bottom fixed tabs: Story, Investigation, Notebook;
- each tab fills the available viewport;
- tab state is preserved while switching;
- shared play state updates immediately across tabs.

Story tab:

- shows the same chapter reader as desktop;
- supports continuous chapter scrolling;
- supports click-to-reveal chapter navigation;
- keeps bottom chapter navigation.

Investigation tab:

- defaults to the general investigation assistant;
- shows conversation modules as a mobile-friendly collapsible list;
- keeps the input close to the bottom of the screen;
- automatically expands the routed NPC module when needed;
- gives lightweight feedback when excerpts are saved.

Notebook tab:

- shows filters, search if implemented, and newest-first notes;
- supports create, edit, delete with confirmation;
- keeps the final accusation button at the bottom;
- makes final accusation visually distinct from ordinary note actions.

Desktop behavior:

- keep the two-column layout;
- keep the notebook as a drawer opened from the top-right utility button;
- avoid changing desktop structure just to support mobile.

Acceptance criteria:

- mobile viewport presents only one primary workspace at a time;
- tab switching does not lose conversation, story, or notebook state;
- notebook actions are usable on mobile;
- final accusation remains discoverable.

## Data Shape Changes

### Chapter

```ts
type StoryChapter = {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  previousChapterId?: string;
  nextChapterId?: string;
};
```

`body` is an array of paragraphs so the reader does not need to split on line
breaks at render time.

### Local Save

```ts
type LocalPlayState = {
  version: number;
  currentChapterId: string;
  conversations: ConversationModule[];
  notes: NotebookNote[];
  playerState: PlayerKnowledgeState;
  ui: {
    activeNotebookFilter: NoteFilter;
    activeConversationId?: string;
    notebookOpen?: boolean;
    mobileTab?: "story" | "investigation" | "notebook";
  };
  savedAt: string;
};
```

The first implementation should include a version number so future migrations
can be added without breaking old saves.

### Notebook Note

```ts
type NotebookNote = {
  id: string;
  title: string;
  text: string;
  tag: NoteTag;
  source?: string;
  createdAt: string;
  updatedAt: string;
};
```

Important or pinned state is intentionally omitted from this iteration unless
the user explicitly asks for it later.

## Risks and Mitigations

### Pretext API Fit

Risk: Pretext may not map perfectly to the current React story component.

Mitigation:

- keep the DOM rendering path simple;
- use Pretext as a layout/measurement layer first;
- isolate Pretext integration in a small helper;
- provide fallback rendering.

### Save Shape Drift

Risk: changing note or conversation data can break old localStorage state.

Mitigation:

- version the saved state;
- validate and normalize saved data before hydration;
- fall back to initial state if saved data is invalid.

### Mobile Scope Creep

Risk: mobile layout can become a second full product.

Mitigation:

- keep the first mobile version to navigation and layout;
- reuse existing story, investigation, and notebook components;
- avoid separate mobile-only business logic.

### Reset Misclick

Risk: reset could erase a user's investigation progress.

Mitigation:

- use a custom confirmation modal;
- make destructive copy explicit;
- keep cancel as the easy/default path.

## Verification Plan

Automated checks:

- type check;
- lint;
- existing tests;
- add tests for localStorage hydration and invalid saved data;
- add tests for note creation/deletion behavior where practical;
- add tests for chapter navigation helper logic.

Manual browser checks:

- desktop initial load;
- notebook open/close;
- note create/edit/delete;
- reset modal cancel and confirm;
- reload persistence;
- story chapter navigation;
- click-to-reveal floating story navigation;
- investigation routing and excerpt saving;
- mobile Story tab;
- mobile Investigation tab;
- mobile Notebook tab.

## Open Follow-Up

After this spec is approved, the next step is to create a concrete
implementation plan with file-by-file tasks and checkpoints.
