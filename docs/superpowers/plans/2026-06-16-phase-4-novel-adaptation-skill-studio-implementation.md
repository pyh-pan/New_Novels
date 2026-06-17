# Phase 4 小说改写 Skill 与 Studio 内置改写 Agent 实施计划

## Goal

把 `new-novels-case-adapter` 完善为成熟的小说改写 skill，并把它植入 Studio 上传原文链路。用户上传故事原文后，Studio 自动按 skill 契约生成可审阅、可校验、可发布的 `case-package/v1` 草稿，同时落盘 validation report 和 adaptation notes。

## Scope

- 完善 skill 文档、references 和脚本契约。
- 后端 source adaptation pipeline 读取 skill 契约并注入平台 AI prompt。
- 模型输出升级为 `sourceProfile + segmentation + fairPlaySpine + adaptationNotes + qualityReport + caseFile`。
- 生成和上传案件包都写入同一种 Studio draft artifacts：
  - `draft.json`
  - `studio.json`
  - `package/`
  - `validation-report.json`
  - `adaptation-notes.md`
- Studio 工作台展示改写说明。
- 增加测试覆盖新契约、落盘工件和 JSON report。

## Non-Goals

- 不实现外部 Codex skill runner 进程。
- 不增加上传前配置表单。
- 不实现完整多轮结构化 diff 自动写回。
- 不重做 Studio 视觉结构。

## Tasks

### 1. Lock The Contract With Tests

- 扩展 `tests/skill-contract.test.ts`：
  - 检查 skill 提到 Studio runner、输入契约、输出工件、validation report、adaptation notes。
  - 检查新增 `references/studio-runner-contract.md`。
  - 检查 checker 支持 JSON report。
- 扩展 `tests/source-adaptation.test.ts`：
  - mock 模型输出包含 `fairPlaySpine` 和 `adaptationNotes`。
  - prompt 包含 loaded skill files、默认 options、Studio runner contract。
  - `createCasePackageFromSource` 返回 report、notes、request metadata。
- 扩展 `tests/studio-persistence.test.ts`：
  - draft 写入 `package/`、`studio.json`、`validation-report.json`、`adaptation-notes.md`。
  - draft package 可被 `loadCasePackageFromDirectorySync` 重新加载。
- 扩展 `tests/api-case-preview.test.ts`：
  - zip 导入草稿也写入同样 artifacts，origin 为 `uploaded-package`。

### 2. Mature The Skill Package

- 更新 `skills/new-novels-case-adapter/SKILL.md`：
  - 明确 Studio runner 会加载 skill 作为生成契约。
  - 明确输入默认值和输出工件。
  - 明确人工审校边界。
- 新增 `skills/new-novels-case-adapter/references/studio-runner-contract.md`：
  - `AdaptationRequest`
  - `AdaptationModelOutput`
  - draft artifact layout
  - validation report
  - adaptation notes
  - failure policy
- 更新 `agents/openai.yaml` 如需同步描述。

### 3. Upgrade The Checker

- 扩展 `check_case_package_refs.mjs`：
  - 支持 `--json <path>` 和原有 `<path>` 用法。
  - 输出 `{ ok, generatedAt, summary, issues }`。
  - 检查 draft artifact 目录时识别 `package/`、`validation-report.json`、`adaptation-notes.md`。
  - 文本模式保持现有人类可读输出。

### 4. Add Studio Adaptation Artifacts

- 在 `lib/studio/source-adaptation.ts` 中新增：
  - `AdaptationRequest`
  - `FairPlaySpine`
  - `AdaptationNotes`
  - `AdaptationValidationReport`
  - `loadAdapterSkillContract`
  - `buildAdaptationRequest`
  - `createValidationReport`
  - `createAdaptationNotesMarkdown`
- 让 `buildSourceAdaptationMessages` 读取 skill 契约并注入 prompt。
- 让 `createCasePackageFromSource` 返回：
  - `package`
  - `sourceProfile`
  - `segmentation`
  - `fairPlaySpine`
  - `adaptationNotes`
  - `qualityReport`
  - `validation`
  - `validationReport`
  - `adaptationNotesMarkdown`
  - `request`

### 5. Persist Draft Artifacts

- 扩展 `GeneratedStudioCase`：
  - `origin`
  - `fairPlaySpine`
  - `adaptationNotes`
  - `validationReport`
  - `adaptationNotesMarkdown`
  - `skill`
- 修改 `persistStudioDraft`：
  - 写 `draft.json`
  - 写 `studio.json`
  - 写 `package/`
  - 写 `validation-report.json`
  - 写 `adaptation-notes.md`
  - 重新加载 `package/` 验证落盘结果。
- 保持旧 draft 兼容：读取缺失新字段的旧数据时提供默认 fallback。

### 6. Wire Studio Source And Import Flows

- 修改 `lib/studio/jobs.ts`：
  - source job 存储新 metadata 和 artifacts。
  - fatal validation issue 仍阻止 ready draft。
- 修改 `app/api/cases/preview/route.ts`：
  - zip import draft 设置 origin 为 `uploaded-package`。
  - 为导入包生成 validation report 和 adaptation notes。
- 保持 Studio 首页行为：上传后直接跳转 draft 工作台。

### 7. Surface Adaptation Notes In Studio

- 扩展 `StudioDraftView`：
  - 增加 `adaptationNotes` / `adaptationNotesMarkdown`。
  - 文件树新增“改写说明”节点。
- 更新 `StudioWorkbench`：
  - 展示改写说明内容。
  - 右侧改写助手 reference 能引用该节点。

### 8. Verify

- 运行重点测试：
  - `npm test -- skill-contract.test.ts source-adaptation.test.ts studio-persistence.test.ts api-case-preview.test.ts studio-draft.test.ts`
- 运行全量：
  - `npm test`
  - `npm run lint`
  - `npm run build`
- 运行 checker：
  - `node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hunters-lodge`
  - `node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs --json cases/hunters-lodge`

## Risks

- Prompt 注入完整 skill references 会增加 token 成本；第一版保持同步单次生成，但代码保留阶段边界。
- 旧 draft 缺少新 metadata；读取必须有 fallback。
- `draft.json` 与 `package/` 可能双源不一致；持久化后立即 reload package 作为校验。
- 模型可能生成 schema-valid 但推理质量不足；validation report 和 adaptation notes 必须显式暴露人工审校点。
