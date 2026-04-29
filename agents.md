# Development Guidelines

This file defines how developers and coding agents should work in this repository.
It intentionally avoids product-specific requirements. Product context belongs in
`readme.md`, `roadmap.md`, and design/spec documents.

## Core Principles

- Read existing documentation before changing code.
- Keep changes small, intentional, and easy to review.
- Prefer clear behavior over clever abstractions.
- Preserve user work. Do not revert or overwrite unrelated changes.
- Treat tests, type checks, and manual verification as part of the work, not a
  cleanup step.
- When requirements are ambiguous, clarify before making broad architectural
  decisions.

## Working Process

1. Understand the task and current state.
2. Identify the smallest useful change.
3. Make focused edits.
4. Run the relevant checks.
5. Summarize what changed, how it was verified, and what remains uncertain.

For larger work, write or update a plan before implementation. The plan should
name the user-facing outcome, affected modules, data flow, risks, and test
strategy.

## Code Style

- Follow the patterns already present in the repository.
- Use descriptive names for files, functions, components, variables, and data
  structures.
- Keep modules focused. If a file starts mixing unrelated responsibilities,
  split it.
- Avoid broad refactors unless they are required for the task.
- Add comments only when they explain non-obvious intent or constraints.
- Prefer typed and structured data over ad hoc string parsing.
- Keep UI copy concise and specific.

## Frontend Guidelines

- Build the actual product surface, not a marketing landing page, unless the
  task explicitly asks for one.
- Respect existing design direction before introducing new visual language.
- Keep text readable on desktop and mobile.
- Use stable layout dimensions for panels, toolbars, boards, and repeated items
  to avoid layout shifts.
- Avoid decorative UI that competes with the main workflow.
- Use accessible controls, labels, focus states, and keyboard-friendly flows.
- Verify important UI changes in a browser, including at least one mobile-sized
  viewport when the feature is user-facing.

## Backend Guidelines

- Keep business rules out of presentation code.
- Make data contracts explicit.
- Validate all external input at service boundaries.
- Handle error states deliberately. Do not hide failures behind silent fallbacks
  unless the fallback is a product requirement.
- Keep secrets in environment variables. Never commit credentials, API keys, or
  private tokens.
- Log enough to diagnose failures, but do not log sensitive data.

## AI/LLM Guidelines

- Treat model output as untrusted.
- Put product rules in code and structured data where possible, not only in
  prompts.
- Keep prompts versioned and reviewable.
- Make model inputs explicit: role, task, allowed facts, forbidden claims, and
  response format.
- Do not let a model invent persistent facts, user data, or source-of-truth state.
- Add guardrails and tests for any behavior that affects correctness, safety, or
  user trust.

## Testing

- Add tests near the behavior being changed.
- Cover normal paths, edge cases, and failure paths that matter to the user.
- For regressions, add a test that would fail before the fix.
- Run the smallest relevant check first, then broader checks when the change
  touches shared behavior.
- Do not claim something is fixed or complete without verification.

## Documentation

- Update documentation when behavior, setup, architecture, or product scope
  changes.
- Keep docs factual and current.
- Prefer short sections with concrete commands and examples.
- Record decisions that future contributors would otherwise rediscover.

## Git Hygiene

- Check the working tree before editing.
- Stage only intentional files.
- Do not use destructive commands unless explicitly requested and approved.
- Write commit messages that explain the user-facing or developer-facing change.
- Do not mix unrelated changes in one commit.

## Review Checklist

Before handing off work, check:

- The change matches the requested scope.
- The code follows local patterns.
- Relevant checks were run.
- User-facing flows were manually verified when applicable.
- No secrets or local-only artifacts were added.
- Documentation is updated when needed.
- Remaining risks or gaps are named clearly.
