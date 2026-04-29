# New Novels

New Novels is an experimental web prototype for turning detective fiction into
interactive fair-play mystery experiences.

Instead of reading passively while a detective solves the case, players investigate
for themselves: they question AI-driven NPCs, inspect the scene through natural
language, collect notes, identify contradictions, and make a final accusation.

The first prototype is based on G. K. Chesterton's public-domain Father Brown
story, **"The Hammer of God"**.

## Why This Exists

Traditional detective fiction is immersive, but the reader usually follows a
fixed path. The fun of deduction belongs to the detective on the page.

This project explores a different form:

- The story remains literary and text-first.
- The player can freely ask questions.
- NPCs have limited knowledge, motives, secrets, and reasons to mislead.
- The mystery remains fair: the truth is fixed, the clues are structured, and the
  final solution is judged by the case data rather than by model improvisation.

## Core Experience

The prototype is designed around four surfaces:

- **Story column**: a quiet, novel-like reading area that contains only the story
  context.
- **Investigation desk**: a natural-language conversation space with a general
  scene investigation agent and individual NPC modules.
- **Detective notebook**: a collapsible notebook for saving and tagging clues,
  testimony, doubts, and contradictions.
- **Final accusation**: a simple AI-led cross-examination. The player must answer
  every key question correctly to solve the case.

## Product Direction

New Novels has two long-term goals:

1. Help creators transform detective stories into structured interactive cases.
2. Give players AI NPCs that feel alive while still obeying the rules of a fixed,
   fair-play mystery.

The AI is not meant to invent the truth. It is meant to perform within the truth.

## Current Status

The project is in early prototype design.

Completed so far:

- Product concept and interaction model
- Web design direction in `design.md`
- Initial case choice: "The Hammer of God"
- Main layout direction: story column, investigation desk, collapsible notebook
- Final accusation flow: single dialogue box, wrong answer returns to
  investigation, all correct reveals the truth
- Development guideline document in `agents.md`
- Product roadmap in `roadmap.md`

Not yet implemented:

- Running web application
- AI backend
- Case schema
- NPC prompt system
- Notebook persistence
- Final accusation answer checker

## Design Direction

The interface should feel like an interactive detective novella, not a generic
chat app or a game dashboard.

See [design.md](./design.md) for the current visual and interaction direction.

## Roadmap

See [roadmap.md](./roadmap.md) for planned milestones and future product
directions.

## Development Guidelines

See [agents.md](./agents.md) for development practices, review expectations,
testing guidelines, and AI/LLM safety rules.

## License

License has not been selected yet.

The source story selected for the first prototype, "The Hammer of God", is from a
public-domain collection in the United States. Confirm copyright status for your
target jurisdiction before distributing adapted content.
