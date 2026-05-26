# 可运行单案件原型执行计划

> 面向 agentic workers：实现本计划时应使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项推进。本文是早期英文计划的中文归档版，保留原有目标、架构边界、任务顺序、关键文件、验证方式和验收逻辑。

**目标：** 基于 G. K. Chesterton 的公版短篇《The Hammer of God》，构建一个可运行的 Next.js 单案件原型，让用户在阅读故事、询问 AI NPC、记录线索和最终指认之间形成完整闭环。

**架构：** 使用单体 Next.js App Router 应用。浏览器端负责故事阅读、调查台、侦探笔记和最终指认流程；服务端 API 路由负责 OpenAI 调用、案件数据读取、消息路由和答案校验，确保模型不会成为事实源。

**技术栈：** Next.js、React、TypeScript、普通 CSS、OpenAI SDK、Zod、Vitest、Testing Library。

---

## 已确认产品决策

- 技术栈采用 Next.js 全栈原型。
- AI 模式采用真实 OpenAI 驱动的 NPC，不以纯 mock 作为第一版。
- 故事来源采用公版文本《The Hammer of God》。
- 主页面采用左右两栏：左侧故事，右侧调查台。
- 故事栏只展示小说文本，不放动作按钮、提示或状态标签。
- 调查台由可折叠对话模块和一个全局新对话输入框组成。
- 侦探笔记默认隐藏，只保留页面右上角的小按钮；展开后作为第三栏出现，并压缩前两栏。
- 笔记标签包括 `clue`、`testimony`、`doubt`、`contradiction`。
- 最终指认页只保留居中的对话框。AI 一次问一个问题；用户答错后返回调查并清空指认历史；全部答对后展示真相并结束游戏。

## 文件结构

原计划创建如下结构：

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

职责划分：

- `lib/case/schema.ts`：定义案件、NPC、线索、矛盾和指认问题的 Zod schema 与 TypeScript 类型。
- `lib/case/hammer-of-god.ts`：提供单案件结构化数据。
- `lib/game/routing.ts`：把用户输入分类到现场调查、既有 NPC 或新对话模块。
- `lib/game/accusation.ts`：执行确定性答案校验。
- `lib/ai/prompts.ts`：构建包含允许事实和禁止声明的 prompt。
- `app/api/*/route.ts`：作为服务端 API 边界。
- `components/*`：实现符合 `design.md` 的前端界面。

## 任务 1：搭建 Next.js 应用

**涉及文件：**

- 新建 `package.json`
- 新建 `tsconfig.json`
- 新建 `next.config.mjs`
- 新建 `app/layout.tsx`
- 新建 `app/globals.css`
- 新建 `.env.example`
- 新建 `vitest.config.ts`

执行逻辑：

1. 创建项目元数据与脚本：`dev`、`build`、`start`、`lint`、`test`、`test:watch`。
2. 配置严格 TypeScript、Next.js 和 Vitest。
3. 创建根布局和全局样式，为后续双栏调查体验提供基础视觉系统。
4. 创建 `.env.example`，声明 OpenAI API 相关环境变量。
5. 安装依赖并生成 `node_modules` 与 `package-lock.json`。
6. 运行基线检查，确认测试框架可执行。

关键命令：

```bash
npm install
npm test
```

验收标准：Next.js 与测试框架可正常运行；在测试尚未添加前，Vitest 可以正常报告无匹配测试或无测试文件。

## 任务 2：定义案件 Schema 与《The Hammer of God》案件数据

**涉及文件：**

- 新建 `lib/case/schema.ts`
- 新建 `lib/case/hammer-of-god.ts`
- 新建 `tests/case-schema.test.ts`

执行逻辑：

1. 先写 schema 测试，验证案件标题、线索、人物、矛盾、指认问题等核心字段。
2. 创建 Zod schema，覆盖案件、人物、线索、笔记标签、对话边界和指认问题。
3. 创建结构化案件数据，把小说背景、现场事实、NPC 动机、可公开事实和隐藏事实整理成可运行数据。
4. 运行测试确认 schema 与案件数据一致。

关键命令：

```bash
npm test -- tests/case-schema.test.ts
```

验收标准：`lib/case/hammer-of-god.ts` 能通过 `lib/case/schema.ts` 校验；人物的 `privateGoal`、线索与指认问题均可被后续 runtime 读取。

## 任务 3：实现确定性路由与指认逻辑

**涉及文件：**

- 新建 `lib/game/types.ts`
- 新建 `lib/game/routing.ts`
- 新建 `lib/game/accusation.ts`
- 新建 `tests/routing.test.ts`
- 新建 `tests/accusation.test.ts`

执行逻辑：

1. 编写路由测试，覆盖现场调查、威尔弗里德、铁匠西米恩、伊丽莎白和疯乔等目标。
2. 编写指认测试，覆盖正确答案、错误答案和下一题状态。
3. 定义游戏运行时类型。
4. 实现消息路由：根据关键词与人物别名把输入分配到目标模块。
5. 实现指认检查：通过确定性匹配判断 `"wrong"`、`"next"` 或 `"solved"`。

关键命令：

```bash
npm test -- tests/routing.test.ts tests/accusation.test.ts
```

验收标准：路由与指认逻辑不依赖模型生成结果；最终案件是否破解由代码判断。

## 任务 4：添加 OpenAI Prompt Builder 与 API 路由

**涉及文件：**

- 新建 `lib/ai/openai.ts`
- 新建 `lib/ai/prompts.ts`
- 新建 `app/api/route-message/route.ts`
- 新建 `app/api/investigate/route.ts`
- 新建 `app/api/accuse/route.ts`

执行逻辑：

1. 创建 OpenAI 客户端封装，环境变量缺失时返回可诊断错误。
2. 创建 prompt builder，把案件事实、人物视角、可说内容、禁止声明和用户问题拼装为模型输入。
3. 创建 `/api/route-message`，返回用户问题应该进入哪个调查模块。
4. 创建 `/api/investigate`，调用对应 agent 并返回调查回复。
5. 创建 `/api/accuse`，调用确定性指认逻辑，而不是让模型判断真伪。

关键命令：

```bash
npm test
```

验收标准：API 路由能读取结构化案件数据；AI 只负责表达与对话，不成为案件真相的来源。

## 任务 5：构建主页面 UI

**涉及文件：**

- 新建 `components/StoryPane.tsx`
- 新建 `components/ConversationModule.tsx`
- 新建 `components/NotebookDrawer.tsx`
- 新建 `components/InvestigationDesk.tsx`
- 修改 `app/page.tsx`
- 修改 `app/globals.css`

执行逻辑：

1. `StoryPane` 只展示故事文本，不提供显式行动按钮。
2. `ConversationModule` 展示可折叠的调查模块、历史消息、发送框和摘录按钮。
3. `NotebookDrawer` 支持标签筛选、彩色笔记和底部指认入口。
4. `InvestigationDesk` 统一管理故事栏、调查台、侦探笔记展开状态、对话状态和摘录行为。
5. `app/page.tsx` 渲染完整产品原型。
6. 全局 CSS 实现左右两栏、右上角笔记按钮、抽屉展开和响应式布局。

关键命令：

```bash
npm run build
```

验收标准：构建成功；页面初始状态符合 `design.md` 中的左右两栏和隐藏笔记设计。

## 任务 6：构建简化指认页面

**涉及文件：**

- 新建 `components/AccusationChat.tsx`
- 新建 `app/accuse/page.tsx`
- 修改 `app/globals.css`

执行逻辑：

1. 指认页只展示居中的对话框。
2. AI 先发起问题，用户逐题回答。
3. 回答错误时展示“回答错误”和“继续调查”按钮，点击返回主页面并清空本轮指认历史。
4. 全部答对后展示“真相大白”和“结束游戏”按钮。

关键命令：

```bash
npm run build
```

验收标准：错误路径、成功路径和返回调查路径均可运行；最终指认仍由确定性逻辑校验。

## 任务 7：运行原型并人工验证

启动开发服务器：

```bash
npm run dev
```

打开 `http://localhost:3000` 后验证：

- 左栏只展示故事正文。
- 右栏展示调查模块。
- 页面右上角存在小型侦探笔记按钮。
- 侦探笔记展开后展示标签筛选。
- 侦探笔记底部存在指认入口。

调查验证问题：

```text
我想看看现场有哪些血迹。
```

预期：消息进入 `现场调查`，回复提及可观察血迹，但不直接说出真凶。

NPC 路由验证问题：

```text
我想问威尔弗里德，他为什么一开始就怀疑铁匠？
```

预期：消息进入 `威尔弗里德牧师` 模块，模块自动展开，回复保持角色视角且不立即自白。

笔记验证：点击任意 assistant 回复上的 `摘录`，侦探笔记打开并新增默认 `线索` 标签笔记。

错误指认验证：进入 `/accuse`，第一题回答 `铁匠西米恩`，预期展示 `回答错误`，点击 `继续调查` 返回 `/`，再次进入 `/accuse` 时从第一题重新开始。

成功指认验证：依次回答：

```text
威尔弗里德牧师
```

```text
他从钟楼扔下小锤，利用高度和重力造成伤势。
```

```text
小锤太轻，无法手持造成那样的巨大伤害。
```

```text
他以宗教狂热和道德审判为理由杀死哥哥。
```

预期：系统展示 `真相大白`，并出现 `结束游戏` 按钮。

## 自检记录

- `design.md` 的主布局要求由任务 5 覆盖。
- 右上角小型笔记按钮由 `NotebookDrawer.tsx` 覆盖。
- 标签化彩色笔记由任务 5 的组件和 CSS 覆盖。
- 简化最终指认对话由任务 6 覆盖。
- 真实 AI NPC 模式由任务 4 的 OpenAI API 路由覆盖。
- 确定性最终答案校验由任务 3 和任务 4 覆盖。
- 《The Hammer of God》案件 schema 由任务 2 覆盖。

已知风险：第一版 UI 状态只保存在内存中。这对 Phase 1 原型验证是可接受的，后续路线图已把持久化进度列为迭代方向。
