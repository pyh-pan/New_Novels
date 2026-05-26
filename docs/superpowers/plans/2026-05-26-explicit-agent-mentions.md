# 显式 Agent 提及路由 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将调查输入框改为默认发送给调查助手，并支持通过 `@角色` 显式发送给具体 NPC。

**Architecture:** 前端在全局输入框内完成 `@` 候选选择和目标解析。发送请求时直接使用解析出的 `targetId` 调用 `/api/investigate`，不再先调用 `/api/route-message` 做语义路由。对话历史仍按 agent conversation module 归档。

**Tech Stack:** Next.js App Router、React state、Vitest、Testing Library、Playwright smoke verification。

---

### Task 1: Mention UI 与目标解析

**Files:**
- Modify: `/Users/panyihang/Code/New_Novels/components/InvestigationDesk.tsx`
- Modify: `/Users/panyihang/Code/New_Novels/app/globals.css`
- Test: `/Users/panyihang/Code/New_Novels/tests/smoke.test.tsx`

- [x] 增加可选 agent 列表，输入 `@` 时显示候选菜单。
- [x] 菜单只显示角色名，不展示身份说明。
- [x] 支持点击候选项插入 `@角色名 `。
- [x] 发送时解析 `@角色名`，匹配成功则发送到对应 agent，否则回退调查助手。

### Task 2: 消息归档与卡片展开

**Files:**
- Modify: `/Users/panyihang/Code/New_Novels/components/InvestigationDesk.tsx`
- Modify: `/Users/panyihang/Code/New_Novels/components/ConversationModule.tsx`
- Test: `/Users/panyihang/Code/New_Novels/tests/smoke.test.tsx`

- [x] 默认未指定 agent 的消息进入调查助手卡片。
- [x] 指定 `@NPC` 的消息进入 NPC 卡片，并自动展开该卡片。
- [x] 保留每张卡片内部的历史消息，消息条数用于提示该 agent 的历史数量。

### Task 3: 验证

**Files:**
- Test: `/Users/panyihang/Code/New_Novels/tests/smoke.test.tsx`

- [x] 跑 `npm run lint`。
- [x] 跑 `npm test -- --run`。
- [x] 跑 `npm run build`。
- [x] 用浏览器验证 `@` 菜单、默认调查助手、NPC 卡片归档、历史消息展示。
