# 故事书架与 Studio v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把默认单案件入口升级为故事书架，并新增成熟的 Studio v1：上传原文、导入案件包、任务进度、案件审阅工作台和评论式改写界面。

**Architecture:** 保留现有 Next.js App Router、CaseLoader、Agent Runtime 和 `case-package/v1`。新增 bundled case catalog、动态案件路由、Studio draft 视图模型和客户端工作台组件；现有调查 API 增加 `caseId` 支持，让多个 bundled case 可走同一套 runtime。

**Tech Stack:** Next.js 15、React 19、TypeScript、CSS、Vitest、Testing Library、Zod、现有 Case Package loader。

---

## 文件结构

- 新建 `lib/case/catalog.ts`：列出可玩的 bundled cases，提供书架卡片数据和按 id 读取案件的能力。
- 修改 `lib/case/default-case.ts`：复用 catalog，并支持按 `caseId` 获取 runtime。
- 新建 `components/CaseLibrary.tsx`：故事书架首页。
- 新建 `app/cases/[caseId]/page.tsx`：动态案件游玩页。
- 修改 `components/CaseExperience.tsx`、`components/InvestigationDesk.tsx`、`components/AccusationChat.tsx`：把 `caseId` 传入 API 请求与最终指认链接。
- 修改 `app/api/route-message/route.ts`、`app/api/investigate/route.ts`、`app/api/accuse/route.ts`：接收可选 `caseId`，按案件构建 runtime / accusation。
- 新建 `lib/studio/draft.ts`：生成 Studio 审阅所需的 draft view model。
- 新建 `components/StudioHome.tsx`：两个入口按钮、上传原文弹窗、导入案件包弹窗。
- 新建 `components/StudioWorkbench.tsx`：左侧文件树、中间 Inspector、右侧 agent 工作区和评论模式。
- 新建 `app/studio/page.tsx`、`app/studio/cases/[caseId]/page.tsx`：Studio 页面。
- 新建 `app/api/studio/source-jobs/route.ts`、`app/api/studio/jobs/[jobId]/route.ts`：原文上传任务边界与进度响应。
- 修改 `app/api/cases/preview/route.ts` 或新增 studio preview API：返回更丰富导入摘要。
- 修改 `app/globals.css`：书架、Studio、工作台样式，遵循 `design.md` 的极简控件原则。
- 更新 `roadmap.md`：标注本轮实现状态。

## 任务 1：故事书架与动态案件路由

- [ ] 新增 catalog 测试，验证至少返回当前内置案件，且每个卡片包含标题、来源、章节数、agent 数和封面回退数据。
- [ ] 实现 `lib/case/catalog.ts`。
- [ ] 将 `app/page.tsx` 改为渲染 `CaseLibrary`。
- [ ] 新增 `/cases/[caseId]` 页面并复用 `CaseExperience`。
- [ ] 调整最终指认链接，使游玩页进入 `/cases/[caseId]/accuse` 或携带 `caseId` 查询参数。
- [ ] 运行书架与 smoke 测试。

## 任务 2：多案件 API 支持

- [ ] 修改 `getDefaultRuntime()` 族函数，支持 `getRuntimeForCase(caseId)`。
- [ ] `/api/route-message` 接收 `caseId` 并用对应 runtime 生成语义路由候选。
- [ ] `/api/investigate` 接收 `caseId` 并用对应 case/runtime 构建 prompt 与 act gate。
- [ ] `/api/accuse` 接收 `caseId`，GET/POST 都按案件返回问题与真相。
- [ ] 更新前端请求体和 accusation chat。
- [ ] 更新 API 测试。

## 任务 3：Studio 首页与上传弹窗

- [ ] 新增 `StudioHome`，页面只展示两个主按钮：上传原文、导入案件包。
- [ ] 上传原文弹窗包含拖拽区、文件选择、进度条、当前步骤和步骤列表。
- [ ] 导入案件包弹窗包含拖拽区、校验摘要和进入工作台入口。
- [ ] 原文上传 API 创建任务响应，第一版返回稳定模拟任务，明确标记为待接入 skill runner 的服务边界。
- [ ] Job API 返回步骤状态，前端展示安装器式进度。

## 任务 4：案件审阅工作台

- [ ] 新增 draft view model，把 `CaseFile` 转换为文件树、控制台统计、章节 inspector、agent inspector、线索/矛盾 inspector、多幕推进 inspector、最终指认 inspector 和校验摘要。
- [ ] 新增 `StudioWorkbench` 三栏布局。
- [ ] 左侧文件树按总览、故事章节、Agents、推理结构组织。
- [ ] 中间 Inspector 根据节点类型展示所有必要信息。
- [ ] 右侧 agent 工作区支持评论草稿、批注列表、提交修改、diff 占位与应用按钮。
- [ ] 第一版 patch 不直接改写案件，只提供可审阅的修改建议边界，避免伪装成已接入完整 skill runner。

## 任务 5：视觉与交互 QA

- [ ] 全局样式统一纸张背景、8px 圆角、克制边框和图标/紧凑按钮优先原则。
- [ ] 检查桌面和移动端：书架、游玩页、Studio 首页、上传弹窗、工作台。
- [ ] 运行 `npm test`、`npm run build`。
- [ ] 用浏览器打开关键页面，修正可见布局问题。
- [ ] 更新 roadmap 的已实现与下一步。

## 自检

- 覆盖故事书架、动态案件、Studio 首页、上传进度、导入预览、审阅工作台、评论模式。
- 不实现从零创建故事。
- 不实现真实持久数据库和外部 skill runner；保留清晰服务边界。
- 不让模型输出成为案件事实源。
