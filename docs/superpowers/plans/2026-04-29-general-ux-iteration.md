# 通用体验迭代执行计划

> 面向 agentic workers：实现本计划时应使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项推进。本文是早期英文计划的中文归档版，保留原有目标、架构边界、任务顺序、关键文件、验证方式和验收逻辑。

**目标：** 优化原型的通用体验，包括版本化 Git 历史、更完整的侦探笔记工作流、本地进度持久化、基于 Pretext 的章节阅读、对话体验打磨和移动端底部标签。

**架构：** 保留当前 Next.js 应用和 agent API 架构。新增聚焦客户端的 play state、章节数据和 Pretext 排版辅助层，然后在桌面端与移动端复用同一套状态。按 V0 到 V3 分阶段交付，保证每一阶段都可以独立测试。

**技术栈：** Next.js 15、React 19、TypeScript、Vitest、Testing Library、`localStorage`、`@chenglou/pretext`。

---

## 来源规范

- 设计规范：`docs/superpowers/specs/2026-04-29-general-ux-iteration-design.md`
- Pretext 参考：`https://github.com/chenglou/pretext`

## 文件范围

新增文件：

- `lib/game/ids.ts`：为生成 ID 提供确定性辅助封装。
- `lib/game/play-state.ts`：定义初始状态、`localStorage` schema、校验、水合、序列化和重置辅助函数。
- `lib/game/story.ts`：从当前案件文本派生章节数据与章节导航辅助函数。
- `lib/reading/pretext-layout.ts`：围绕 Pretext 的小型隔离层。
- `components/StoryReader.tsx`：替换 `StoryPane` 的章节阅读组件。
- `components/ConfirmDialog.tsx`：可复用自定义确认弹窗。
- `tests/play-state.test.ts`：本地状态规范化测试。
- `tests/story-reader.test.tsx`：章节导航和浮动导航测试。
- `tests/notebook-drawer.test.tsx`：笔记新建、删除、排序、筛选测试。
- `tests/mobile-tabs.test.tsx`：移动端标签状态测试。

修改文件：

- `package.json`：加入 `@chenglou/pretext`。
- `package-lock.json`：通过 `npm install` 更新。
- `app/page.tsx`：通过 `InvestigationDesk` 渲染 `StoryReader`。
- `components/InvestigationDesk.tsx`：集中处理状态所有权、持久化、重置、移动端标签和对话打磨。
- `components/NotebookDrawer.tsx`：支持手动新建笔记、删除确认和时间戳。
- `components/ConversationModule.tsx`：优化 loading、错误状态和摘录反馈。
- `app/globals.css`：加入桌面工具类、弹窗、阅读器和移动端标签样式。
- `tests/smoke.test.tsx`：根据组件命名和笔记 API 变化更新旧断言。
- `roadmap.md`：记录本轮体验迭代状态。

## 任务 0：建立 Git 基线

**涉及文件：** 不修改源码。

执行逻辑：

1. 检查当前目录是否已经是 Git 仓库。
2. 如果尚未初始化，则执行 `git init`。
3. 使用 `git status --short` 检查待纳入版本管理的文件，确认没有 `.env`、密钥、构建产物或本地浏览器产物。
4. 创建原型基线提交。
5. 再次检查工作区状态。

关键命令：

```bash
git rev-parse --is-inside-work-tree
git status --short
git add agents.md app components design.md docs eslint.config.mjs lib next-env.d.ts next.config.mjs package-lock.json package.json readme.md roadmap.md tests tsconfig.json vitest.config.ts
git commit -m "chore: create prototype baseline"
git status --short
```

验收标准：仓库完成初始化或确认已初始化；基线提交成功；没有意外文件被纳入版本管理。

## 任务 1：Play State 与 ID 辅助函数

**涉及文件：**

- 新建 `lib/game/ids.ts`
- 新建 `lib/game/play-state.ts`
- 新建 `tests/play-state.test.ts`

执行逻辑：

1. 先编写失败测试，覆盖初始状态、状态规范化、缺失字段补齐、无效数据回退和序列化。
2. 创建 `lib/game/ids.ts`，提供稳定 ID 生成入口。
3. 创建 `lib/game/play-state.ts`，定义玩家进度、章节、笔记、对话、已发现信息等状态模型。
4. 实现 `localStorage` 读写前的规范化，避免旧数据或损坏数据破坏 UI。
5. 运行测试直到通过。

关键命令：

```bash
npm test -- tests/play-state.test.ts
```

验收标准：play state 可以被安全创建、加载、修复、序列化和重置。

## 任务 2：笔记新建、删除与确认弹窗

**涉及文件：**

- 新建 `components/ConfirmDialog.tsx`
- 修改 `components/NotebookDrawer.tsx`
- 修改 `components/InvestigationDesk.tsx`
- 修改 `tests/smoke.test.tsx`
- 新建或更新 `tests/notebook-drawer.test.tsx`

执行逻辑：

1. 先写失败测试，覆盖新建笔记、删除确认、取消删除、标签筛选和排序。
2. 创建 `ConfirmDialog`，替代浏览器原生 `confirm`。
3. 为 `NotebookDrawer` 增加 `onCreateNote` 与 `onDeleteNote`。
4. 在 `InvestigationDesk` 中接入新建、删除、更新时间戳和保存摘录逻辑。
5. 更新旧测试中对 `NotebookDrawer` 的渲染参数。

关键命令：

```bash
npm test -- tests/notebook-drawer.test.tsx tests/smoke.test.tsx
```

验收标准：用户可以主动新建笔记；删除笔记必须先弹出确认弹窗；取消时不删除；笔记排序、筛选和时间戳行为稳定。

## 任务 3：本地持久化与重置弹窗

**涉及文件：**

- 修改 `components/InvestigationDesk.tsx`
- 修改 `app/globals.css`
- 新建或更新持久化相关测试

执行逻辑：

1. 先写失败测试，确认页面可以从 `localStorage` 恢复状态，并可以重置状态。
2. 在组件初始化时从 `localStorage` 水合 play state。
3. 在状态变化时持久化到 `localStorage`。
4. 新增“重新开始”入口，并使用自定义确认弹窗防止误触。
5. 补充弹窗、危险按钮和辅助状态的 CSS。

关键命令：

```bash
npm test -- tests/play-state.test.ts tests/smoke.test.tsx
```

验收标准：刷新页面后进度仍在；用户点击重新开始前必须确认；确认后调查、笔记和章节状态被重置。

## 任务 4：故事章节与 Pretext 辅助层

**涉及文件：**

- 修改 `package.json`
- 修改 `package-lock.json`
- 新建 `lib/game/story.ts`
- 新建 `lib/reading/pretext-layout.ts`
- 新建或更新 `tests/story-reader.test.tsx`

执行逻辑：

1. 安装 `@chenglou/pretext`。
2. 编写章节辅助测试，覆盖当前章节、上一章、下一章和边界条件。
3. 创建章节数据与导航辅助函数。
4. 创建 Pretext 包装层，只在 `lib/reading/pretext-layout.ts` 中隔离第三方库细节。
5. 如果 Pretext 类型出现问题，只修复该隔离层，不把第三方复杂度扩散到业务组件。

关键命令：

```bash
npm install @chenglou/pretext
npm test -- tests/story-reader.test.tsx
```

验收标准：章节数据可被业务 UI 读取；Pretext 只作为排版体验辅助，不改变故事数据结构。

## 任务 5：StoryReader 组件

**涉及文件：**

- 新建 `components/StoryReader.tsx`
- 修改 `app/page.tsx`
- 修改 `components/InvestigationDesk.tsx`
- 修改 `app/globals.css`
- 修改 `tests/smoke.test.tsx`
- 更新 `tests/story-reader.test.tsx`

执行逻辑：

1. 先写行为测试，覆盖章节正文展示、章节底部上一章/下一章按钮、点击阅读区浮现导航、章节边界禁用状态。
2. 创建 `StoryReader`，替代旧 `StoryPane`。
3. 让 `InvestigationDesk` 持有当前章节状态，并传给阅读器。
4. 更新 `app/page.tsx` 和 smoke test。
5. 删除或停用旧 `StoryPane` 引用。
6. 补充章节阅读器 CSS。

关键命令：

```bash
npm test -- tests/story-reader.test.tsx tests/smoke.test.tsx
```

验收标准：一章内容默认整章上下滚动；章节结束处有前后章按钮；阅读过程中点击屏幕可以浮现章节跳转按钮。

## 任务 6：对话体验打磨

**涉及文件：**

- 修改 `components/ConversationModule.tsx`
- 修改 `components/InvestigationDesk.tsx`
- 修改 `app/globals.css`
- 新建或更新对话体验测试

执行逻辑：

1. 先写失败测试，覆盖 Enter 发送、loading 状态、错误提示和摘录成功反馈。
2. 为全局输入框和模块内输入框加入键盘发送体验。
3. 保存摘录后给出轻量反馈，避免用户不知道笔记是否保存成功。
4. 优化摘录按钮文案和状态，不改变原有保存逻辑。
5. 补充必要 CSS。

关键命令：

```bash
npm test -- tests/smoke.test.tsx
```

验收标准：用户可以通过 Enter 发送问题；请求中和失败时有清晰状态；摘录成功后有明确反馈。

## 任务 7：移动端底部标签

**涉及文件：**

- 修改 `components/InvestigationDesk.tsx`
- 修改 `app/globals.css`
- 新建 `tests/mobile-tabs.test.tsx`

执行逻辑：

1. 先写移动端标签测试，覆盖故事、调查、笔记三个视图。
2. 在 `InvestigationDesk` 中增加移动端当前标签状态。
3. 用语义化容器包裹故事区、调查区和笔记区。
4. 在移动端显示底部标签栏。
5. 在桌面端保持三栏/两栏布局，不展示底部标签栏。

关键命令：

```bash
npm test -- tests/mobile-tabs.test.tsx
```

验收标准：移动端可以在故事、调查和笔记之间切换；桌面端不受影响；标签切换不会丢失对话或笔记状态。

## 任务 8：文档、路线图与完整验证

**涉及文件：**

- 修改 `roadmap.md`
- 根据实际实现同步相关文档

执行逻辑：

1. 更新 `roadmap.md`，记录本轮通用体验迭代已实现内容与后续待办。
2. 运行完整自动化验证。
3. 启动开发服务器进行人工浏览器验证。
4. 提交文档更新。

关键命令：

```bash
npm test
npm run build
npm run dev
```

人工验证重点：

- 页面可以正常加载。
- 重新开始按钮不会与新建笔记按钮重叠。
- 删除笔记有确认弹窗。
- 刷新后进度能够恢复。
- 章节阅读支持底部翻章和点击浮现导航。
- 对话发送、摘录和错误状态清晰。
- 移动端底部标签可用。

## 自检记录

- V0 Git 基线由任务 0 覆盖。
- V1 笔记、持久化和重置由任务 1 到任务 3 覆盖。
- V2 Pretext 章节阅读和对话打磨由任务 4 到任务 6 覆盖。
- V3 移动端底部标签由任务 7 覆盖。
- 文档与完整验证由任务 8 覆盖。

已知边界：Pretext 在本计划中只作为前端阅读体验增强层，不改变案件包 schema、agent runtime 或服务端 API 边界。
