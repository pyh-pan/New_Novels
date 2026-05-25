# Architecture

New Novels is a Next.js prototype driven by structured mystery case packages.
The app renders a text-first investigation experience while keeping the case
truth, NPC boundaries, and final answer checking outside model control.

## Runtime Flow

```text
cases/<case-id>/
→ CaseLoader
→ CaseFile
→ getDefaultCase()
→ page render / API routes / Agent Runtime
```

The default runnable case is loaded from `cases/hammer-of-god/` by
`lib/case/default-case.ts`. The handwritten `lib/case/hammer-of-god.ts` remains
as a fixture and migration aid, not the primary runtime source for the app.

## Main Surfaces

- `app/page.tsx` loads the default case on the server and passes story data into
  the client experience.
- `components/StoryReader.tsx` renders chapter prose and chapter navigation.
- `components/InvestigationDesk.tsx` owns local play state, conversation state,
  notebook state, case package preview, and question submission.
- `components/NotebookDrawer.tsx` renders player-owned notes, hypotheses, and
  known contradiction summaries.
- `app/accuse/page.tsx` renders the final accusation flow.

## API Routes

- `POST /api/route-message`
  - Input: `{ "message": string }`
  - Uses LLM semantic routing when available.
  - Falls back to runtime keyword/alias routing.
  - Returns a target such as `general`, `wilfred`, or `unsupported`.

- `POST /api/investigate`
  - Input: target id, user message, conversation history, and player state.
  - Accepts an optional agent session from browser play state.
  - Builds a runtime context for the selected agent.
  - Calls the configured Runway Bedrock Anthropic-compatible model adapter.
  - Parses optional structured response fields.
  - Applies player-state/session patches, evaluates act gates, and applies
    guardrails before returning text to the UI.

- `POST /api/cases/preview`
  - Input: multipart `file` containing a `case-package/v1` zip.
  - Normalizes single-root zip packages and validates the split filesystem
    layout.
  - Returns manifest data, a case summary, and structured issues.

- `GET /api/accuse`
  - Returns the first final accusation question.

- `POST /api/accuse`
  - Checks one answer deterministically against the case package.
  - Returns `wrong`, `next`, or `solved`.
  - On success, returns the culprit, method, motive, and decisive evidence.

- `GET /health`
  - Guard lifecycle health endpoint for loopback checks.

- `GET /api/healthz`
  - Browser/API-safe health endpoint.

## Agent Runtime

`lib/agent-runtime/index.ts` is the core execution layer.

Responsibilities:

- register agents and aliases;
- route messages by aliases and investigation keywords;
- build runtime fact boundaries;
- evaluate reveal rules;
- track per-agent pressure state;
- apply structured model response contracts to player state;
- evaluate act gates;
- validate output against hidden facts, truth facts, forbidden claims, and
  fabricated evidence patterns.

The runtime is generic. Specific NPC behavior comes from case package fields such
as `pressureProfile`, `emotionalArc`, `boundaries`, `knowledge`, and
`revealRules`.

## Player State

Local play state currently lives in the browser through `lib/game/play-state.ts`.
It includes:

- current chapter;
- conversations and expanded modules;
- per-agent sessions;
- detective notes;
- current notebook filter;
- mobile tab;
- player knowledge state.

`PlayerKnowledgeState` tracks what the player has discovered:

- current act id;
- discovered clues;
- discovered facts;
- heard testimony;
- known contradictions;
- scene interactions;
- confronted agents;
- asked topics;
- hypotheses.

The browser sends the relevant agent session with each investigation request.
The API returns the updated session and player state so pressure, mood, revealed
facts, known contradictions, scene interactions, and act progression survive
across turns in the current browser.

## AI Boundary

The model is treated as an untrusted narrator/performer.

Source of truth:

- case package files;
- schema validation;
- runtime context;
- deterministic final accusation answers.

Not source of truth:

- model output;
- player claims;
- conversation text by itself.

The prompt builder gives the model allowed facts, hidden fact ids, private fact
ids, global rules, agent rules, and player state. Output still goes through
runtime guardrails before being returned to the client.

## Platform AI Provider

`lib/ai/provider.ts` reads `ai.properties` from the project root, the
standalone parent path, or `AI_PROPERTIES_PATH`. It expects:

```properties
ai.base_url=<Runway base URL>
ai.api_key=<Runway API key>
```

The adapter sends:

- `POST {base_url}/bedrock_runtime/model/invoke`;
- `token` and `api-key` headers;
- Anthropic Messages style body with top-level `system`;
- no model field and no temperature field.

`APP_AI_BASE_URL` and `APP_AI_API_KEY` are local fallback variables.

## Case Import

The current product supports previewing uploaded case zips. A successful preview
does not yet replace the active runtime case. Activating external packages is
the next import milestone.

## Guard Packaging

The app is configured for Next standalone output:

- `next.config.mjs` uses `output: "standalone"` and `compress: false`.
- `install.sh` installs runtime dependencies only when standalone artifacts are
  missing; it does not build.
- `start.sh` expects `.next/standalone/server.js`, rewrites generated
  `HOSTNAME`/`PORT` references to `APP_HOSTNAME`/`APP_PORT`, and ends with
  `exec node .next/standalone/server.js`.
- `health.sh` checks `http://127.0.0.1:3000/health`.
- `npm run guard:package` builds a clean temporary copy and writes
  `dist/new-novels-guard.zip`.

## Verification

Primary checks:

```bash
npm test
npm run lint
npm run build
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hammer-of-god
npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org
```

Browser smoke target:

```bash
npm run dev
# open http://localhost:3000
```
