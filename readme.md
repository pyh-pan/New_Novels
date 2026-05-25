# New Novels

New Novels is a text-first web prototype for turning detective fiction into
interactive fair-play mystery experiences.

Players read a story, question AI-driven NPCs, inspect clues through natural
language, keep their own detective notebook, and make a final accusation. The AI
can perform characters, but it is not the source of truth: the case package and
runtime rules decide what facts exist, what each NPC knows, and when the final
solution is accepted.

The built-in demo case is based on G. K. Chesterton's public-domain Father Brown
story **"The Hammer of God"**.

## Current Prototype

Implemented:

- Next.js web app with story reader, investigation desk, notebook drawer, and
  final accusation page.
- Default case loaded from `cases/hammer-of-god/` through `CaseLoader`.
- `case-package/v1` filesystem layout for story text, agents, facts, acts,
  act gates, clues, contradictions, truth, victims, and accusation questions.
- Agent Runtime with semantic/keyword routing, player knowledge state, reveal
  rules, pressure profiles, act gate evaluation, and output guardrails.
- AI-backed investigation API using the CoWork/Guard Runway Bedrock gateway
  contract (`ai.properties`) with structured prompt and response handling.
- Deterministic final accusation checking with a truth summary after success.
- Local browser persistence for chapter progress, conversations, notes, and UI
  state, including per-agent sessions and player hypotheses.
- Case package zip preview API and toolbar UI.
- Guard-compatible `install.sh`, `start.sh`, `health.sh`, `/health`, and
  standalone build configuration.
- `new-novels-case-adapter` skill for adapting mystery stories into case
  packages.

Not implemented yet:

- Activating an uploaded case as the current playable runtime.
- Persistent server-side save/resume.
- Full creator editing workspace.
- Model retry/repair after guardrail rejection.

## Quick Start

Install dependencies:

```bash
npm install
```

For local AI testing, create `ai.properties` at the project root or set matching
environment variables:

```properties
ai.base_url=<platform-runway-base-url>
ai.api_key=<platform-api-key>
```

Environment variable fallback:

```bash
APP_AI_BASE_URL=<platform-runway-base-url>
APP_AI_API_KEY=<platform-api-key>
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm test
npm run lint
npm run build
```

Build a CoWork/Guard package:

```bash
npm run guard:package
```

The package is written to `dist/new-novels-guard.zip`.

Validate the built-in case package:

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hammer-of-god
```

## Project Map

- `app/` - Next.js pages and API routes.
- `components/` - story reader, investigation desk, notebook, dialogs, and
  accusation UI.
- `lib/case/` - canonical case schema and default case service.
- `lib/case-package/` - case package manifest schema and directory loader.
- `lib/agent-runtime/` - routing, runtime context, reveal rules, pressure state,
  act gates, and output validation.
- `lib/ai/` - platform AI provider adapter and prompt builders.
- `lib/game/` - play state, routing wrappers, story view helpers, IDs, and final
  accusation checking.
- `cases/hammer-of-god/` - the built-in filesystem case package.
- `skills/new-novels-case-adapter/` - local skill for adapting mystery stories
  into playable packages.
- `docs/` - architecture, package, implementation, and platform notes.

## Core Documentation

- [Design](./design.md)
- [Architecture](./docs/architecture.md)
- [Case Package v1](./docs/case-package.md)
- [Roadmap](./roadmap.md)
- [Development Guidelines](./agents.md)

## License

License has not been selected yet.

The source story selected for the first prototype, "The Hammer of God", is from a
public-domain collection in the United States. Confirm copyright status for your
target jurisdiction before distributing adapted content.
