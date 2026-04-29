# Playable Single-Case Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Next.js prototype for one AI NPC fair-play detective case based on "The Hammer of God".

**Architecture:** Use a single Next.js app with App Router. The browser renders the story, investigation desk, notebook, and final accusation flow. Server API routes own OpenAI calls, case data access, routing, and answer checking so the model cannot become the source of truth.

**Tech Stack:** Next.js, React, TypeScript, plain CSS, OpenAI SDK, Zod, Vitest, Testing Library.

---

## Confirmed Product Decisions

- Tech stack: Next.js full-stack prototype.
- AI mode: real OpenAI-backed NPCs, no mock-only first version.
- Story source: G. K. Chesterton's public-domain "The Hammer of God".
- Main page: two columns, story on the left, investigation desk on the right.
- Story column: prose only, no action buttons, hints, or status chips.
- Investigation desk: collapsible modules plus one global new-conversation input.
- Notebook: hidden by default, opened from a small top-right button, expands as a third column and compresses the first two columns.
- Notebook tags: clue, testimony, doubt, contradiction.
- Final accusation: one centered dialogue box. AI asks one question at a time. A wrong answer returns to investigation and clears accusation history. All correct answers reveal the truth and end the game.

## File Structure

Create the project with this structure:

```text
new-novels/
  app/
    api/
      accuse/route.ts
      investigate/route.ts
      route-message/route.ts
    accuse/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    AccusationChat.tsx
    ConversationModule.tsx
    InvestigationDesk.tsx
    NotebookDrawer.tsx
    StoryPane.tsx
  lib/
    ai/
      prompts.ts
      openai.ts
    case/
      hammer-of-god.ts
      schema.ts
    game/
      accusation.ts
      routing.ts
      types.ts
  tests/
    accusation.test.ts
    case-schema.test.ts
    routing.test.ts
  .env.example
  package.json
  tsconfig.json
  vitest.config.ts
```

Responsibility split:

- `lib/case/schema.ts`: Zod schemas and TypeScript types for cases, NPCs, clues, contradictions, and accusation questions.
- `lib/case/hammer-of-god.ts`: structured single-case data.
- `lib/game/routing.ts`: classify user input into scene investigation, existing NPC, or new conversation module.
- `lib/game/accusation.ts`: deterministic answer checking.
- `lib/ai/prompts.ts`: prompt builders with allowed facts and forbidden claims.
- `app/api/*/route.ts`: server-only API boundaries.
- `components/*`: focused UI surfaces matching `design.md`.

## Task 1: Scaffold The Next.js App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `.env.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create package metadata**

Create `package.json`:

```json
{
  "name": "new-novels",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "openai": "^4.104.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.15.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create Next config**

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  }
});
```

- [ ] **Step 5: Create root layout**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Novels",
  description: "An interactive fair-play detective novella prototype."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create global styles**

Create `app/globals.css`:

```css
:root {
  --paper: #fbfaf6;
  --paper-soft: #f4f1e9;
  --desk: #efede6;
  --line: #c8c2b7;
  --ink: #222222;
  --muted: #6f6a61;
  --primary: #202020;
  --clue: #fff7cf;
  --testimony: #e8f4ff;
  --doubt: #f1e9ff;
  --contradiction: #ffe8e8;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: var(--paper-soft);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.story-copy {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 17px;
  line-height: 1.95;
}
```

- [ ] **Step 7: Create environment template**

Create `.env.example`:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

- [ ] **Step 8: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 9: Run baseline checks**

Run:

```bash
npm test
```

Expected: Vitest reports no tests found or no matching test files before tests are added.

## Task 2: Define Case Schema And Hammer Of God Case Data

**Files:**
- Create: `lib/case/schema.ts`
- Create: `lib/case/hammer-of-god.ts`
- Test: `tests/case-schema.test.ts`

- [ ] **Step 1: Create schema test**

Create `tests/case-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { caseSchema } from "../lib/case/schema";
import { hammerOfGodCase } from "../lib/case/hammer-of-god";

describe("case schema", () => {
  it("validates the Hammer of God case", () => {
    const parsed = caseSchema.parse(hammerOfGodCase);

    expect(parsed.id).toBe("hammer-of-god");
    expect(parsed.characters.length).toBeGreaterThanOrEqual(4);
    expect(parsed.accusation.questions).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run schema test to verify it fails**

Run:

```bash
npm test -- tests/case-schema.test.ts
```

Expected: FAIL because `lib/case/schema.ts` does not exist.

- [ ] **Step 3: Create Zod schema**

Create `lib/case/schema.ts`:

```ts
import { z } from "zod";

export const noteTagSchema = z.enum(["clue", "testimony", "doubt", "contradiction"]);

export const clueSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  tag: noteTagSchema,
  source: z.string(),
  unlockHints: z.array(z.string())
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  publicDescription: z.string(),
  privateGoal: z.string(),
  knows: z.array(z.string()),
  believes: z.array(z.string()),
  hides: z.array(z.string()),
  liesAbout: z.array(z.string()),
  tellsIf: z.array(z.string()),
  forbiddenClaims: z.array(z.string())
});

export const accusationQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  acceptedAnswers: z.array(z.string()),
  explanation: z.string()
});

export const caseSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.object({
    title: z.string(),
    author: z.string(),
    publicDomainNote: z.string()
  }),
  storyText: z.string(),
  truth: z.object({
    culprit: z.string(),
    victim: z.string(),
    motive: z.string(),
    method: z.string(),
    decisiveEvidence: z.array(z.string())
  }),
  sceneAgent: z.object({
    id: z.literal("scene"),
    name: z.string(),
    allowedFacts: z.array(z.string()),
    forbiddenClaims: z.array(z.string())
  }),
  characters: z.array(characterSchema),
  clues: z.array(clueSchema),
  accusation: z.object({
    questions: z.array(accusationQuestionSchema)
  })
});

export type NoteTag = z.infer<typeof noteTagSchema>;
export type CaseFile = z.infer<typeof caseSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Clue = z.infer<typeof clueSchema>;
export type AccusationQuestion = z.infer<typeof accusationQuestionSchema>;
```

- [ ] **Step 4: Create structured case data**

Create `lib/case/hammer-of-god.ts`:

```ts
import type { CaseFile } from "./schema";

export const hammerOfGodCase: CaseFile = {
  id: "hammer-of-god",
  title: "钟楼下的锤击案",
  source: {
    title: "The Hammer of God",
    author: "G. K. Chesterton",
    publicDomainNote:
      "Selected from The Innocence of Father Brown, public domain in the United States."
  },
  storyText:
    "海泽尔村的午后被一声尖叫撕开。铁匠铺门前的石路上躺着一具尸体，头部的伤势重得不合常理。尸体旁边有一把小锤。它看起来太轻，太普通，甚至像是从铁匠铺里随手拿出来的工具。可伤口不像普通人能用它造成。教堂钟楼投下长长的影子。威尔弗里德牧师从那边走来，脸色苍白。他说自己一直在祈祷，没有听见争吵，也没有上过钟楼。铁匠西米恩站在人群外，粗壮的双手垂在身侧。他没有为自己辩解，只盯着那把锤子，像盯着一件突然变得陌生的东西。",
  truth: {
    culprit: "wilfred",
    victim: "norman",
    motive:
      "威尔弗里德以宗教狂热和道德审判感为自己开脱，认为哥哥诺曼罪恶深重。",
    method:
      "威尔弗里德从钟楼高处让小锤坠落，利用高度和重力制造出看似不可能由小锤造成的重击。",
    decisiveEvidence: [
      "小锤很轻，手持挥击难以造成巨大伤势。",
      "从钟楼高处坠落可以解释伤势力度。",
      "威尔弗里德持续否认上过钟楼，并急于把嫌疑推给铁匠。"
    ]
  },
  sceneAgent: {
    id: "scene",
    name: "现场调查",
    allowedFacts: [
      "尸体位于铁匠铺外的石路上。",
      "尸体头部伤势极重。",
      "尸体旁有一把小锤。",
      "小锤看起来很轻。",
      "锤柄上没有明显血迹。",
      "血迹集中在尸体头部附近。",
      "现场没有明显拖拽痕迹。",
      "教堂钟楼可以俯视铁匠铺外的位置。"
    ],
    forbiddenClaims: [
      "不得直接说威尔弗里德是真凶。",
      "不得主动解释完整作案方式。",
      "不得创造新的证物、脚印、目击者或书信。"
    ]
  },
  characters: [
    {
      id: "wilfred",
      name: "威尔弗里德牧师",
      role: "死者的弟弟，村中牧师",
      publicDescription: "神情克制，语言带着宗教式审判意味。",
      privateGoal: "隐藏自己上过钟楼和对哥哥的杀意。",
      knows: [
        "自己从钟楼高处让小锤坠落。",
        "哥哥诺曼是死者。",
        "铁匠西米恩很容易被怀疑。"
      ],
      believes: ["自己是在执行神圣审判。"],
      hides: ["自己上过钟楼。", "自己厌恶哥哥诺曼。"],
      liesAbout: ["自己一直在教堂下面祈祷。", "自己没有接近钟楼高处。"],
      tellsIf: ["玩家指出小锤必须从高处坠落。", "玩家连续追问他为何急于怀疑铁匠。"],
      forbiddenClaims: ["不得承认真相，除非玩家已经指出高处坠落和小锤矛盾。"]
    },
    {
      id: "simeon",
      name: "铁匠西米恩",
      role: "村中铁匠，表面嫌疑人",
      publicDescription: "强壮、沉默、被人群天然怀疑。",
      privateGoal: "保护自己和妻子的名声。",
      knows: ["小锤来自铁匠铺。", "自己没有杀诺曼。", "诺曼曾纠缠伊丽莎白。"],
      believes: ["所有人都会因为他的力量怀疑他。"],
      hides: ["诺曼和伊丽莎白之间的暧昧传闻。"],
      liesAbout: ["自己不在乎诺曼的死。"],
      tellsIf: ["玩家温和询问伊丽莎白。", "玩家指出小锤不像手持凶器。"],
      forbiddenClaims: ["不得知道威尔弗里德从钟楼扔下锤子。"]
    },
    {
      id: "elizabeth",
      name: "伊丽莎白",
      role: "铁匠妻子",
      publicDescription: "焦虑，害怕自己的名声被卷进案件。",
      privateGoal: "避免自己和诺曼的关系成为焦点。",
      knows: ["诺曼曾试图接近她。", "西米恩为此愤怒。"],
      believes: ["西米恩可能因为嫉妒而被怀疑。"],
      hides: ["诺曼曾纠缠她。"],
      liesAbout: ["自己和诺曼毫无接触。"],
      tellsIf: ["玩家已经从西米恩处听到诺曼纠缠她。"],
      forbiddenClaims: ["不得知道作案方式。"]
    },
    {
      id: "joe",
      name: "疯乔",
      role: "村中边缘人",
      publicDescription: "说话跳跃，容易被忽视。",
      privateGoal: "让别人不要再追问他为何出现在教堂附近。",
      knows: ["自己看到钟楼方向有人影。"],
      believes: ["那个人影像牧师。"],
      hides: ["自己当时在教堂附近偷听。"],
      liesAbout: ["自己什么也没看见。"],
      tellsIf: ["玩家不嘲笑他。", "玩家问他钟楼方向有什么异常。"],
      forbiddenClaims: ["不得准确描述完整作案过程。"]
    }
  ],
  clues: [
    {
      id: "small-hammer",
      title: "过轻的小锤",
      text: "小锤很轻，但伤口像从高处坠落造成。",
      tag: "clue",
      source: "现场调查",
      unlockHints: ["检查锤子", "询问伤口和锤子的关系"]
    },
    {
      id: "wilfred-denial",
      title: "牧师否认上钟楼",
      text: "威尔弗里德说自己没有上钟楼，只在下面祈祷。",
      tag: "testimony",
      source: "威尔弗里德牧师",
      unlockHints: ["询问威尔弗里德案发时在哪里"]
    },
    {
      id: "tower-height",
      title: "钟楼高度",
      text: "钟楼可以俯视尸体所在位置，高度足以让小锤坠落产生巨大力量。",
      tag: "contradiction",
      source: "现场调查",
      unlockHints: ["询问钟楼是否能看到尸体位置"]
    }
  ],
  accusation: {
    questions: [
      {
        id: "culprit",
        prompt: "谁杀死了诺曼爵士？",
        acceptedAnswers: ["威尔弗里德", "威尔弗里德牧师", "牧师", "wilfred"],
        explanation: "真凶是威尔弗里德牧师。"
      },
      {
        id: "method",
        prompt: "他如何用一把小锤造成如此严重的伤势？",
        acceptedAnswers: ["从钟楼扔下小锤", "从高处让锤子坠落", "利用钟楼高度和重力", "高处坠落"],
        explanation: "小锤从钟楼高处坠落，重力解释了伤势。"
      },
      {
        id: "contradiction",
        prompt: "哪条矛盾让你推翻了铁匠手持锤子杀人的解释？",
        acceptedAnswers: ["小锤太轻", "小锤无法手持造成巨大伤害", "伤口和小锤重量不匹配", "小锤必须从高处坠落"],
        explanation: "小锤重量和伤势力度不匹配。"
      },
      {
        id: "motive",
        prompt: "威尔弗里德为什么杀死诺曼？",
        acceptedAnswers: ["宗教狂热", "道德审判", "认为哥哥罪恶深重", "以神的名义审判哥哥"],
        explanation: "威尔弗里德以宗教和道德审判为杀人辩护。"
      }
    ]
  }
};
```

- [ ] **Step 5: Run schema test**

Run:

```bash
npm test -- tests/case-schema.test.ts
```

Expected: PASS.

## Task 3: Implement Deterministic Routing And Accusation Logic

**Files:**
- Create: `lib/game/types.ts`
- Create: `lib/game/routing.ts`
- Create: `lib/game/accusation.ts`
- Test: `tests/routing.test.ts`
- Test: `tests/accusation.test.ts`

- [ ] **Step 1: Write routing tests**

Create `tests/routing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { routeMessage } from "../lib/game/routing";

describe("routeMessage", () => {
  it("routes scene questions to the scene agent", () => {
    expect(routeMessage("我想看看现场有哪些血迹").targetId).toBe("scene");
    expect(routeMessage("锤子上有没有指纹").targetId).toBe("scene");
  });

  it("routes named NPC questions to that NPC", () => {
    expect(routeMessage("我想问威尔弗里德他为什么怀疑铁匠").targetId).toBe("wilfred");
    expect(routeMessage("问问铁匠西米恩他看到了什么").targetId).toBe("simeon");
  });

  it("creates a new module when no target is clear", () => {
    const route = routeMessage("我想问一个路过的村民有没有听见钟声");
    expect(route.targetId).toBe("new");
    expect(route.label).toBe("新的调查对象");
  });
});
```

- [ ] **Step 2: Write accusation tests**

Create `tests/accusation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkAccusationAnswer } from "../lib/game/accusation";
import { hammerOfGodCase } from "../lib/case/hammer-of-god";

describe("checkAccusationAnswer", () => {
  it("accepts direct matching answers", () => {
    const question = hammerOfGodCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "威尔弗里德牧师").correct).toBe(true);
  });

  it("accepts answers that contain an accepted phrase", () => {
    const question = hammerOfGodCase.accusation.questions[1];
    expect(checkAccusationAnswer(question, "他从钟楼扔下小锤，利用重力杀人").correct).toBe(true);
  });

  it("rejects incorrect answers", () => {
    const question = hammerOfGodCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "铁匠西米恩").correct).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/routing.test.ts tests/accusation.test.ts
```

Expected: FAIL because implementation files do not exist.

- [ ] **Step 4: Create game types**

Create `lib/game/types.ts`:

```ts
export type ConversationTarget = "scene" | "wilfred" | "simeon" | "elizabeth" | "joe" | "new";

export interface RoutedMessage {
  targetId: ConversationTarget;
  label: string;
}

export interface AccusationCheckResult {
  correct: boolean;
  explanation?: string;
}
```

- [ ] **Step 5: Implement message routing**

Create `lib/game/routing.ts`:

```ts
import type { RoutedMessage } from "./types";

const sceneKeywords = ["现场", "血迹", "锤子", "尸体", "钟楼", "伤口", "指纹", "拖拽", "位置"];

const npcRules: Array<{ targetId: RoutedMessage["targetId"]; label: string; keywords: string[] }> = [
  { targetId: "wilfred", label: "威尔弗里德牧师", keywords: ["威尔弗里德", "牧师"] },
  { targetId: "simeon", label: "铁匠西米恩", keywords: ["西米恩", "铁匠"] },
  { targetId: "elizabeth", label: "伊丽莎白", keywords: ["伊丽莎白", "铁匠妻子"] },
  { targetId: "joe", label: "疯乔", keywords: ["疯乔", "乔"] }
];

export function routeMessage(message: string): RoutedMessage {
  const normalized = message.trim().toLowerCase();

  for (const rule of npcRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return { targetId: rule.targetId, label: rule.label };
    }
  }

  if (sceneKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return { targetId: "scene", label: "现场调查" };
  }

  return { targetId: "new", label: "新的调查对象" };
}
```

- [ ] **Step 6: Implement accusation checking**

Create `lib/game/accusation.ts`:

```ts
import type { AccusationQuestion } from "../case/schema";
import type { AccusationCheckResult } from "./types";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function checkAccusationAnswer(
  question: AccusationQuestion,
  answer: string
): AccusationCheckResult {
  const normalizedAnswer = normalizeAnswer(answer);
  const correct = question.acceptedAnswers.some((accepted) =>
    normalizedAnswer.includes(normalizeAnswer(accepted))
  );

  return correct ? { correct: true, explanation: question.explanation } : { correct: false };
}
```

- [ ] **Step 7: Run routing and accusation tests**

Run:

```bash
npm test -- tests/routing.test.ts tests/accusation.test.ts
```

Expected: PASS.

## Task 4: Add OpenAI Prompt Builders And API Routes

**Files:**
- Create: `lib/ai/openai.ts`
- Create: `lib/ai/prompts.ts`
- Create: `app/api/route-message/route.ts`
- Create: `app/api/investigate/route.ts`
- Create: `app/api/accuse/route.ts`

- [ ] **Step 1: Create OpenAI client**

Create `lib/ai/openai.ts`:

```ts
import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI NPC responses.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}
```

- [ ] **Step 2: Create prompt builders**

Create `lib/ai/prompts.ts`:

```ts
import { hammerOfGodCase } from "../case/hammer-of-god";
import type { Character } from "../case/schema";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildScenePrompt(history: ChatMessage[], message: string): string {
  return [
    "You are the scene investigation agent in a fair-play detective game.",
    "Answer only observable facts from the allowed facts list.",
    "Do not infer the culprit. Do not reveal the full solution. Do not invent evidence.",
    "",
    "Allowed facts:",
    formatList(hammerOfGodCase.sceneAgent.allowedFacts),
    "",
    "Forbidden claims:",
    formatList(hammerOfGodCase.sceneAgent.forbiddenClaims),
    "",
    "Conversation history:",
    JSON.stringify(history),
    "",
    `Player question: ${message}`,
    "",
    "Answer in Chinese, in 1-3 short paragraphs. If the question asks for unavailable facts, say the scene does not show that."
  ].join("\n");
}

export function buildNpcPrompt(character: Character, history: ChatMessage[], message: string): string {
  return [
    `You are ${character.name}, ${character.role}, in a fair-play detective game.`,
    character.publicDescription,
    "",
    "Private goal:",
    character.privateGoal,
    "",
    "Facts you know:",
    formatList(character.knows),
    "",
    "Things you believe:",
    formatList(character.believes),
    "",
    "Things you hide:",
    formatList(character.hides),
    "",
    "Things you may lie about:",
    formatList(character.liesAbout),
    "",
    "Conditions where you may reveal more:",
    formatList(character.tellsIf),
    "",
    "Forbidden claims:",
    formatList(character.forbiddenClaims),
    "",
    "Global rule: Never invent new evidence, new witnesses, or new timeline facts.",
    "Global rule: Stay in character, but keep answers useful for fair-play investigation.",
    "",
    "Conversation history:",
    JSON.stringify(history),
    "",
    `Player question: ${message}`,
    "",
    "Answer in Chinese as this NPC. Use 1-3 short paragraphs."
  ].join("\n");
}
```

- [ ] **Step 3: Create routing API**

Create `app/api/route-message/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { routeMessage } from "../../../lib/game/routing";

const requestSchema = z.object({
  message: z.string().min(1)
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  return NextResponse.json(routeMessage(body.message));
}
```

- [ ] **Step 4: Create investigation API**

Create `app/api/investigate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildNpcPrompt, buildScenePrompt } from "../../../lib/ai/prompts";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { hammerOfGodCase } from "../../../lib/case/hammer-of-god";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

const requestSchema = z.object({
  targetId: z.string(),
  message: z.string().min(1),
  history: z.array(messageSchema).default([])
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const client = getOpenAIClient();

  const character = hammerOfGodCase.characters.find((item) => item.id === body.targetId);
  const prompt =
    body.targetId === "scene" || !character
      ? buildScenePrompt(body.history, body.message)
      : buildNpcPrompt(character, body.history, body.message);

  const response = await client.chat.completions.create({
    model: getModelName(),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  });

  return NextResponse.json({
    content: response.choices[0]?.message?.content ?? "我暂时无法回答这个问题。"
  });
}
```

- [ ] **Step 5: Create accusation API**

Create `app/api/accuse/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { hammerOfGodCase } from "../../../lib/case/hammer-of-god";
import { checkAccusationAnswer } from "../../../lib/game/accusation";

const requestSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().min(1)
});

export async function GET() {
  const firstQuestion = hammerOfGodCase.accusation.questions[0];

  return NextResponse.json({
    questionIndex: 0,
    prompt: firstQuestion.prompt
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const question = hammerOfGodCase.accusation.questions[body.questionIndex];

  if (!question) {
    return NextResponse.json({ status: "solved" });
  }

  const result = checkAccusationAnswer(question, body.answer);

  if (!result.correct) {
    return NextResponse.json({ status: "wrong" });
  }

  const nextIndex = body.questionIndex + 1;
  const nextQuestion = hammerOfGodCase.accusation.questions[nextIndex];

  if (!nextQuestion) {
    return NextResponse.json({ status: "solved" });
  }

  return NextResponse.json({
    status: "next",
    questionIndex: nextIndex,
    prompt: nextQuestion.prompt
  });
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test
```

Expected: all tests pass.

## Task 5: Build The Main Page UI

**Files:**
- Create: `components/StoryPane.tsx`
- Create: `components/ConversationModule.tsx`
- Create: `components/NotebookDrawer.tsx`
- Create: `components/InvestigationDesk.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create story pane**

Create `components/StoryPane.tsx`:

```tsx
import { hammerOfGodCase } from "../lib/case/hammer-of-god";

export function StoryPane() {
  return (
    <section className="story-pane">
      <div className="eyebrow">The Hammer of God</div>
      <h1>{hammerOfGodCase.title}</h1>
      <div className="story-copy">
        {hammerOfGodCase.storyText.split("。").filter(Boolean).map((paragraph) => (
          <p key={paragraph}>{paragraph}。</p>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create conversation module**

Create `components/ConversationModule.tsx`:

```tsx
"use client";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
}

interface ConversationModuleProps {
  title: string;
  subtitle: string;
  expanded: boolean;
  messages: UiMessage[];
  onToggle: () => void;
  onSaveNote: (content: string) => void;
}

export function ConversationModule({
  title,
  subtitle,
  expanded,
  messages,
  onToggle,
  onSaveNote
}: ConversationModuleProps) {
  return (
    <div className="conversation-module">
      <button className="module-header" onClick={onToggle}>
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <span>{expanded ? "收起" : "展开"}</span>
      </button>
      {expanded ? (
        <div className="module-body">
          {messages.map((message, index) => (
            <div className={`bubble ${message.role}`} key={`${message.role}-${index}`}>
              <small>{message.role === "user" ? "玩家" : title}</small>
              <p>{message.content}</p>
              {message.role === "assistant" ? (
                <button className="inline-action" onClick={() => onSaveNote(message.content)}>
                  摘录
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create notebook drawer**

Create `components/NotebookDrawer.tsx`:

```tsx
"use client";

import type { NoteTag } from "../lib/case/schema";

export interface Note {
  id: string;
  content: string;
  tag: NoteTag;
}

interface NotebookDrawerProps {
  open: boolean;
  notes: Note[];
  activeTag: NoteTag | "all";
  onTagChange: (tag: NoteTag | "all") => void;
  onOpen: () => void;
  onClose: () => void;
}

const labels: Record<NoteTag | "all", string> = {
  all: "全部",
  clue: "线索",
  testimony: "证词",
  doubt: "疑点",
  contradiction: "矛盾"
};

export function NotebookDrawer({
  open,
  notes,
  activeTag,
  onTagChange,
  onOpen,
  onClose
}: NotebookDrawerProps) {
  const visibleNotes = activeTag === "all" ? notes : notes.filter((note) => note.tag === activeTag);

  return (
    <>
      <button className="notebook-toggle" onClick={open ? onClose : onOpen} aria-label="侦探笔记">
        {open ? "›" : "✎"}
      </button>
      {open ? (
        <aside className="notebook">
          <header>
            <small>Detective Notebook</small>
            <h2>侦探笔记</h2>
          </header>
          <div className="tag-row">
            {(Object.keys(labels) as Array<NoteTag | "all">).map((tag) => (
              <button
                className={`tag-filter ${activeTag === tag ? "active" : ""} ${tag}`}
                key={tag}
                onClick={() => onTagChange(tag)}
              >
                {labels[tag]}
              </button>
            ))}
          </div>
          <div className="note-list">
            {visibleNotes.map((note) => (
              <article className={`note-card ${note.tag}`} key={note.id}>
                <strong>{labels[note.tag]}</strong>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
          <a className="accuse-link" href="/accuse">
            开始最终指认
          </a>
        </aside>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: Create investigation desk**

Create `components/InvestigationDesk.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { NoteTag } from "../lib/case/schema";
import { ConversationModule, type UiMessage } from "./ConversationModule";
import { NotebookDrawer, type Note } from "./NotebookDrawer";

interface Conversation {
  id: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  messages: UiMessage[];
}

const initialConversations: Conversation[] = [
  {
    id: "scene",
    title: "现场调查",
    subtitle: "通用 Agent · 回答可观察事实、物件、环境",
    expanded: true,
    messages: []
  },
  {
    id: "wilfred",
    title: "威尔弗里德牧师",
    subtitle: "个人对话模块",
    expanded: false,
    messages: []
  },
  {
    id: "simeon",
    title: "铁匠西米恩",
    subtitle: "个人对话模块",
    expanded: false,
    messages: []
  }
];

export function InvestigationDesk() {
  const [conversations, setConversations] = useState(initialConversations);
  const [message, setMessage] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<NoteTag | "all">("all");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  async function submitMessage() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setMessage("");

    const routed = await fetch("/api/route-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed })
    }).then((response) => response.json() as Promise<{ targetId: string; label: string }>);

    setConversations((current) => {
      const exists = current.some((conversation) => conversation.id === routed.targetId);
      const next = exists
        ? current
        : [
            ...current,
            {
              id: routed.targetId,
              title: routed.label,
              subtitle: "新对话模块",
              expanded: true,
              messages: []
            }
          ];

      return next.map((conversation) =>
        conversation.id === routed.targetId
          ? {
              ...conversation,
              expanded: true,
              messages: [...conversation.messages, { role: "user", content: trimmed }]
            }
          : conversation
      );
    });

    const target = conversations.find((conversation) => conversation.id === routed.targetId);
    const history = target?.messages ?? [];

    const ai = await fetch("/api/investigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: routed.targetId, message: trimmed, history })
    }).then((response) => response.json() as Promise<{ content: string }>);

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === routed.targetId
          ? {
              ...conversation,
              messages: [...conversation.messages, { role: "assistant", content: ai.content }]
            }
          : conversation
      )
    );
    setLoading(false);
  }

  function saveNote(content: string) {
    setNotes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        content,
        tag: "clue"
      }
    ]);
    setNotesOpen(true);
  }

  return (
    <>
      <section className="investigation-desk">
        <header>
          <small>Investigation Desk</small>
          <h2>调查台</h2>
        </header>
        <div className="module-stack">
          {conversations.map((conversation) => (
            <ConversationModule
              key={conversation.id}
              title={conversation.title}
              subtitle={conversation.subtitle}
              expanded={conversation.expanded}
              messages={conversation.messages}
              onSaveNote={saveNote}
              onToggle={() =>
                setConversations((current) =>
                  current.map((item) =>
                    item.id === conversation.id ? { ...item, expanded: !item.expanded } : item
                  )
                )
              }
            />
          ))}
        </div>
        <div className="new-message">
          <strong>新对话</strong>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="例如：我想问威尔弗里德，他为什么一开始就怀疑铁匠？"
          />
          <button onClick={submitMessage}>{loading ? "思考中" : "发送"}</button>
        </div>
      </section>
      <NotebookDrawer
        open={notesOpen}
        notes={notes}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        onOpen={() => setNotesOpen(true)}
        onClose={() => setNotesOpen(false)}
      />
    </>
  );
}
```

- [ ] **Step 5: Create main page**

Create or replace `app/page.tsx`:

```tsx
import { InvestigationDesk } from "../components/InvestigationDesk";
import { StoryPane } from "../components/StoryPane";

export default function HomePage() {
  return (
    <main className="game-shell">
      <StoryPane />
      <InvestigationDesk />
    </main>
  );
}
```

- [ ] **Step 6: Extend CSS for main page**

Append to `app/globals.css`:

```css
.game-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.98fr);
  min-height: 100vh;
  position: relative;
}

.story-pane {
  background: var(--paper);
  border-right: 1px solid var(--line);
  padding: 44px 56px;
  overflow: auto;
}

.story-pane h1 {
  margin: 8px 0 28px;
  font-size: 32px;
}

.eyebrow {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.investigation-desk {
  background: var(--desk);
  padding: 42px;
  overflow: auto;
}

.investigation-desk h2,
.notebook h2 {
  margin: 4px 0 0;
  font-size: 28px;
}

.module-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 0;
}

.conversation-module {
  border: 1px solid var(--line);
  background: white;
}

.module-header {
  width: 100%;
  border: 0;
  background: #f8f6f1;
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
  text-align: left;
}

.module-header small {
  display: block;
  color: var(--muted);
  margin-top: 4px;
}

.module-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.bubble {
  border: 1px solid var(--line);
  padding: 12px;
  max-width: 86%;
}

.bubble.user {
  align-self: flex-start;
  background: #fafafa;
}

.bubble.assistant {
  align-self: flex-end;
  background: #f4efe4;
}

.bubble p {
  margin: 6px 0;
  line-height: 1.6;
}

.inline-action {
  border: 1px solid var(--line);
  background: white;
  padding: 4px 8px;
}

.new-message {
  border: 1px dashed var(--line);
  background: #faf9f6;
  padding: 14px;
}

.new-message textarea {
  display: block;
  width: 100%;
  min-height: 86px;
  margin: 10px 0;
  padding: 10px;
  resize: vertical;
}

.new-message button,
.accuse-link {
  border: 0;
  background: var(--primary);
  color: white;
  padding: 10px 14px;
  text-decoration: none;
  text-align: center;
}

.notebook-toggle {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 20;
  width: 38px;
  height: 38px;
  border-radius: 19px;
  border: 1px solid var(--line);
  background: white;
}

.notebook {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: white;
  border-left: 1px solid var(--line);
  padding: 42px 24px 24px;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}

.tag-filter {
  border: 1px solid transparent;
  padding: 7px 10px;
  background: #f1f1f1;
}

.tag-filter.active {
  border-color: var(--ink);
}

.note-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-card {
  border: 1px solid var(--line);
  border-left-width: 5px;
  padding: 10px;
}

.note-card.clue,
.tag-filter.clue {
  background: var(--clue);
}

.note-card.testimony,
.tag-filter.testimony {
  background: var(--testimony);
}

.note-card.doubt,
.tag-filter.doubt {
  background: var(--doubt);
}

.note-card.contradiction,
.tag-filter.contradiction {
  background: var(--contradiction);
}

.accuse-link {
  display: block;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .game-shell {
    grid-template-columns: 1fr;
  }

  .story-pane {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding: 28px;
  }

  .investigation-desk {
    padding: 28px;
  }
}
```

- [ ] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

## Task 6: Build Simplified Accusation Page

**Files:**
- Create: `components/AccusationChat.tsx`
- Create: `app/accuse/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create accusation chat component**

Create `components/AccusationChat.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface AccuseMessage {
  role: "ai" | "user";
  content: string;
}

type AccuseState = "answering" | "wrong" | "solved";

export function AccusationChat() {
  const [messages, setMessages] = useState<AccuseMessage[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<AccuseState>("answering");

  useEffect(() => {
    fetch("/api/accuse")
      .then((response) => response.json() as Promise<{ questionIndex: number; prompt: string }>)
      .then((data) => {
        setQuestionIndex(data.questionIndex);
        setMessages([{ role: "ai", content: data.prompt }]);
      });
  }, []);

  async function submitAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || state !== "answering") return;

    setAnswer("");
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    const result = await fetch("/api/accuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex, answer: trimmed })
    }).then(
      (response) =>
        response.json() as Promise<
          | { status: "wrong" }
          | { status: "solved" }
          | { status: "next"; questionIndex: number; prompt: string }
        >
    );

    if (result.status === "wrong") {
      setState("wrong");
      return;
    }

    if (result.status === "solved") {
      setState("solved");
      return;
    }

    setQuestionIndex(result.questionIndex);
    setMessages((current) => [...current, { role: "ai", content: result.prompt }]);
  }

  return (
    <section className="accusation-shell">
      <div className="accusation-card">
        <header>
          <small>Final Accusation</small>
          <h1>最终指认</h1>
        </header>
        <div className="accusation-messages">
          {messages.map((message, index) => (
            <div className={`accuse-bubble ${message.role}`} key={`${message.role}-${index}`}>
              <small>{message.role === "ai" ? "AI" : "玩家"}</small>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        {state === "answering" ? (
          <div className="accuse-input">
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="输入你的答案"
              onKeyDown={(event) => {
                if (event.key === "Enter") submitAnswer();
              }}
            />
            <button onClick={submitAnswer}>回答</button>
          </div>
        ) : null}
        {state === "wrong" ? (
          <div className="result-panel wrong">
            <h2>回答错误</h2>
            <p>你的推理还有漏洞。指认记录已清空，请回到主页面继续调查。</p>
            <a href="/">继续调查</a>
          </div>
        ) : null}
        {state === "solved" ? (
          <div className="result-panel solved">
            <h2>真相大白</h2>
            <p>你回答对了所有关键问题。案件已经成功破解。</p>
            <a href="/">结束游戏</a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create accusation page**

Create `app/accuse/page.tsx`:

```tsx
import { AccusationChat } from "../../components/AccusationChat";

export default function AccusePage() {
  return <AccusationChat />;
}
```

- [ ] **Step 3: Add accusation CSS**

Append to `app/globals.css`:

```css
.accusation-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--paper-soft);
}

.accusation-card {
  width: min(760px, 100%);
  border: 1px solid var(--line);
  background: white;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.accusation-card header {
  text-align: center;
  padding: 24px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

.accusation-card h1 {
  margin: 6px 0 0;
}

.accusation-messages {
  min-height: 360px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fdfcf8;
}

.accuse-bubble {
  border: 1px solid var(--line);
  padding: 12px;
  max-width: 82%;
}

.accuse-bubble.ai {
  align-self: flex-end;
  background: #f4efe4;
}

.accuse-bubble.user {
  align-self: flex-start;
  background: #fafafa;
}

.accuse-input {
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 18px;
}

.accuse-input input {
  padding: 10px;
}

.accuse-input button,
.result-panel a {
  border: 0;
  background: var(--primary);
  color: white;
  padding: 10px 14px;
  text-decoration: none;
}

.result-panel {
  margin: 20px;
  padding: 22px;
  text-align: center;
}

.result-panel.wrong {
  background: #fff1f1;
  border: 1px solid #efb9b9;
}

.result-panel.solved {
  background: #f2faec;
  border: 1px solid #cfe3bd;
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

## Task 7: Run The Prototype And Verify Manually

**Files:**
- No code files created in this task.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 2: Verify main page**

Open `http://localhost:3000`.

Expected:

- Left column shows only story prose.
- Right column shows investigation modules.
- Top-right small notebook button is visible.
- Notebook opens and shows tag filters.
- Notebook contains an accusation link at the bottom after opening.

- [ ] **Step 3: Verify AI investigation**

In the new conversation input, ask:

```text
我想看看现场有哪些血迹。
```

Expected:

- Message routes to `现场调查`.
- AI response mentions observable blood evidence.
- AI does not name the culprit.

- [ ] **Step 4: Verify NPC routing**

Ask:

```text
我想问威尔弗里德，他为什么一开始就怀疑铁匠？
```

Expected:

- Message routes to `威尔弗里德牧师`.
- The module expands.
- The response stays in character and does not confess immediately.

- [ ] **Step 5: Verify note capture**

Click `摘录` on any assistant response.

Expected:

- Notebook opens.
- A new note appears with default tag `线索`.

- [ ] **Step 6: Verify accusation wrong path**

Open `/accuse` and answer the first question with:

```text
铁匠西米恩
```

Expected:

- System shows `回答错误`.
- `继续调查` returns to `/`.
- Returning to `/accuse` starts fresh from the first question.

- [ ] **Step 7: Verify accusation success path**

Open `/accuse` and answer:

```text
威尔弗里德牧师
```

Then:

```text
他从钟楼扔下小锤，利用高度和重力造成伤势。
```

Then:

```text
小锤太轻，无法手持造成那样的巨大伤害。
```

Then:

```text
他以宗教狂热和道德审判为理由杀死哥哥。
```

Expected:

- System shows `真相大白`.
- `结束游戏` button appears.

## Self-Review

Spec coverage:

- Main layout from `design.md`: covered in Task 5.
- Small top-right notebook button: covered in `NotebookDrawer.tsx`.
- Notebook tags and colored notes: covered in Task 5 CSS and component.
- Final accusation simplified dialogue: covered in Task 6.
- Real AI NPC mode: covered in Task 4 OpenAI API route.
- Deterministic final answer checking: covered in Task 3 and Task 4.
- Case schema for "The Hammer of God": covered in Task 2.

Placeholder scan:

- No placeholder tokens or vague deferred implementation steps remain.

Type consistency:

- `NoteTag` values match schema and UI.
- API request shapes match client calls.
- Accusation status values are `"wrong"`, `"solved"`, and `"next"` across server and client.

Known implementation risk:

- The first UI implementation stores state in memory only. This is acceptable for Phase 1 prototype verification and is listed for later roadmap work as persistent progress.
