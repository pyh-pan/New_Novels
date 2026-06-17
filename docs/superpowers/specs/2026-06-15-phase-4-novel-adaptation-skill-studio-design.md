# Phase 4 小说改写 Skill 与 Studio 内置改写 Agent 设计

## 背景

New Novels 已经具备 `case-package/v1`、目录化案件包、Studio 原文上传入口、Studio 草稿状态机、发布到可玩案件、以及 `new-novels-case-adapter` skill 雏形。

当前缺口不是“能否生成一个 schema-valid caseFile”，而是两件事：

1. `new-novels-case-adapter` 需要成为成熟、可复用、可审校的内容生产 skill。
2. Studio 需要把该 skill 植入为内置改写 agent，让用户只上传故事原文即可生成案件草稿。

本设计确认产品目标、数据流、输出工件、工程边界和验收标准。确认后再拆实施计划。

## 已确认决策

- 本轮目标同时包含 skill 完善和 Studio 植入。
- 用户不需要手动运行 skill；Studio 上传原文后自动调用改写 agent。
- 上传原文后直接生成完整案件草稿并跳转 Studio 工作台。
- 用户在工作台中继续和右侧改写 agent 对话、批注和微调。
- 第一版不增加上传前配置表单。
- 默认目标语言为 `zh-CN`。
- 默认改写粒度为 `publication-grade`。
- 默认玩家可调查范围为 `full-playable-investigation`。
- 版权/来源说明默认由上传者负责确认，并在报告中保留 warning。
- AI 执行继续复用当前 `lib/ai/provider.ts` 平台 AI API。
- `new-novels-case-adapter` 的 skill 文档和 references 作为版本化生成契约注入 Studio 改写链路。
- Studio 生成的案件包与用户上传案件包进入同一套 draft 存储、审阅、保存、发布和运行状态机。

## 目标

### Skill 目标

`skills/new-novels-case-adapter/` 应从规则文档升级为成熟改写工具包：

- 明确定义输入契约：原文、来源/版权、目标语言、改写粒度、玩家可调查范围。
- 明确定义输出契约：`case-package/v1` 目录、可选 zip、`validation-report.json`、`adaptation-notes.md`。
- 指导 agent 生成完整 runtime-ready 案件包，而不是 demo 摘要。
- 覆盖章节、事实账本、线索、矛盾、NPC、reveal rules、pressureProfile、emotionalArc、actGates、storyEvents、最终指认。
- 提供自动校验和人工审校说明，明确哪些问题是 fatal，哪些是 warning / suggestion。

### Studio 目标

Studio 的“上传原文”成为该 skill 的产品化入口：

- 接收 `.txt`、`.md`、`.pdf` 原文。
- 后端读取 skill 契约，构造平台 AI 改写任务。
- 解析模型输出为 case package。
- 将生成结果写入 Studio draft 文件系统。
- 生成校验报告和改写说明。
- 通过现有 Studio 工作台展示草稿，用户可继续批注和微调。
- 发布后成为正式可玩案件，并进入故事书架。

## 非目标

- 不在本轮做公开案件市场。
- 不在本轮做完整账号、权限、团队协作或审核平台。
- 不在本轮实现从零创建故事的可视化编辑器。
- 不在本轮完成多轮结构化 diff 自动写回的完整闭环；工作台微调入口保留，具体 patch 写回可继续作为 Phase 5 后续。
- 不实现外部 Codex skill runner 进程；Studio 后端通过平台 AI provider 执行 skill 契约。

## 用户流程

```text
/studio
  用户点击“上传原文”

上传 .txt / .md / .pdf
  API 提取文本
  创建 source-to-case job
  读取 new-novels-case-adapter skill 契约
  调用平台 AI 生成改写结果
  解析并校验 case package
  写入 Studio draft artifacts
  返回 draftCaseId

/studio/cases/[draftCaseId]
  查看原文画像、分段、章节、agents、线索、矛盾、acts、storyEvents、最终指认、校验报告
  在右侧改写 agent 工作区批注和微调
  保存或发布

发布
  写入 published case package
  进入故事书架
  可正式游玩
```

## 输入契约

Studio 内部生成统一的 `AdaptationRequest`：

```ts
type AdaptationRequest = {
  source: {
    fileName: string;
    kind: "text" | "markdown" | "pdf";
    text: string;
    detectedLanguage?: string;
  };
  options: {
    targetLanguage: "zh-CN";
    adaptationGranularity: "publication-grade";
    investigationScope: "full-playable-investigation";
  };
  rights: {
    statement: string;
    requiresUserConfirmation: boolean;
  };
  skill: {
    name: "new-novels-case-adapter";
    version: string;
    loadedFiles: string[];
  };
};
```

第一版 UI 不展示 options 表单。默认值由后端固定，并写入报告与改写说明。

## 输出契约

Studio 生成应产出四类工件：

```text
.data/studio-drafts/<draft-case-id>/
  draft.json
  studio.json
  package/
    manifest.json
    case.json
    story/chapters.json
    story/*.md
    agents/global-context.json
    agents/<agent-id>.json
    facts/facts.json
    acts/acts.json
    acts/gates.json
    events/story-events.json
    scenes/scenes.json
    clues/clues.json
    relationships/relationships.json
    propagation/rules.json
    contradictions/contradictions.json
    truth/truth.json
    victims/victims.json
    accusation/questions.json
  validation-report.json
  adaptation-notes.md
```

`package/` 保持纯 `case-package/v1` 目录，不混入非标准文件。`validation-report.json` 和 `adaptation-notes.md` 是 Studio draft artifacts。

用户上传 zip 和 Studio 原文生成都应收敛到同一种草稿形态。区别只在 `studio.json` / metadata 中记录来源：

- `origin: "uploaded-package"`
- `origin: "generated-from-source"`

## 改写 Agent 输出 JSON

平台 AI 的一次生成结果应继续是单个 JSON 对象，但 schema 要升级为更接近最终工件：

```ts
type AdaptationModelOutput = {
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  fairPlaySpine: {
    victim: string;
    culprit: string;
    motive: string;
    method: string;
    falseSolution: string;
    minimumClueChain: string[];
    decisiveContradictions: string[];
  };
  adaptationNotes: {
    summary: string;
    readingStrategy: string[];
    investigationStrategy: string[];
    npcStrategy: string[];
    actStructureStrategy: string[];
    unresolvedRisks: string[];
  };
  qualityReport: AdaptationQualityItem[];
  caseFile: CaseFile;
};
```

`caseFile` 仍是最终 runtime 数据。其他字段用于 Studio 审阅、报告、说明和质量门槛。

## Skill 完善内容

`new-novels-case-adapter` 应调整为三层：

1. `SKILL.md`
   - 保留短流程和硬性质量门槛。
   - 明确 Studio runner 会读取本 skill 作为生成契约。
   - 指向更详细 references 和 scripts。

2. `references/`
   - `case-package-v1.md`：继续作为字段和目录结构参考。
   - `novel-to-case-workflow.md`：继续作为完整改写流程。
   - 新增或扩展 `studio-runner-contract.md`：定义 Studio 如何调用 skill、输入输出工件、报告形态和失败处理。

3. `scripts/`
   - `check_case_package_refs.mjs` 支持 stdout 文本和 JSON report 输出。
   - 新增或扩展脚本以校验 draft artifacts：package 目录、validation report、adaptation notes 是否齐全。
   - 保持脚本可在 CI / 本地终端直接运行。

## Studio 后端设计

### Skill 契约加载

新增服务层负责读取 skill 文件：

- `skills/new-novels-case-adapter/SKILL.md`
- `references/case-package-v1.md`
- `references/novel-to-case-workflow.md`
- `references/studio-runner-contract.md`

加载结果进入 prompt，作为 Studio 改写 agent 的版本化契约。prompt 中需要记录 `loadedFiles`，便于后续审计生成来源。

### Source Adaptation Pipeline

当前 `lib/studio/source-adaptation.ts` 应拆出更明确的阶段：

1. `extractSourceDocument`
2. `buildAdaptationRequest`
3. `loadAdapterSkillContract`
4. `buildSourceAdaptationMessages`
5. `parseAdaptationModelOutput`
6. `validateAdaptationOutput`
7. `createCasePackage`
8. `createValidationReport`
9. `createAdaptationNotes`
10. `persistStudioDraftArtifacts`

第一版可以保持同步任务执行，但代码边界应允许后续替换为异步队列。

### Draft Persistence

`persistStudioDraft` 不应只写 `draft.json`。目标状态：

- 写 `draft.json` 以兼容现有 Studio registry。
- 写 `studio.json` 保存 metadata、来源、sourceProfile、segmentation、qualityReport、skill version、loaded files。
- 写 `package/` 目录，使用现有 `writeCasePackageToDirectorySync`。
- 写 `validation-report.json`。
- 写 `adaptation-notes.md`。
- 重新加载 `package/` 并校验，确保落盘工件可运行。

`loadPersistedStudioDraft` 优先读取 `draft.json`；如果未来需要恢复更完整工件，可读取 `studio.json` 和 `package/`。

## Validation Report

`validation-report.json` 结构：

```ts
type ValidationReport = {
  ok: boolean;
  generatedAt: string;
  skillName: string;
  skillVersion: string;
  caseId: string;
  title: string;
  summary: {
    chapters: number;
    agents: number;
    acts: number;
    actGates: number;
    storyEvents: number;
    facts: number;
    clues: number;
    contradictions: number;
    accusationQuestions: number;
  };
  issues: Array<{
    severity: "fatal" | "warning" | "suggestion";
    code: string;
    filePath: string;
    fieldPath?: string;
    message: string;
    suggestion: string;
  }>;
};
```

Fatal issues block “ready” job status and publishing. Warning / suggestion allow进入工作台，但 Studio 必须展示。

## Adaptation Notes

`adaptation-notes.md` 是给创作者和后续 agent 的改写说明，不是玩家内容。

建议结构：

```md
# <case title> 改写说明

## Source Profile
## Default Options
## Fair-Play Spine
## Segmentation Summary
## Reading Rewrite Strategy
## Investigation Conversion Strategy
## NPC Runtime Strategy
## Act Gates And Story Events
## Validation Summary
## Human Review Checklist
```

说明必须明确：

- 哪些内容被保留为可读章节。
- 哪些调查段落被转为玩家交互。
- 哪些推理段落被隐藏到后期矛盾、reveal rules 或最终指认。
- 哪些风险需要人工审校。

## Studio 工作台展示

现有工作台已经展示 source profile、segmentation、章节、agents、线索、矛盾、acts、storyEvents、最终指认和校验报告。本轮只需要确保新 artifacts 能进入这些视图：

- `validation-report.json` 映射到校验节点。
- `adaptation-notes.md` 可以作为新增“改写说明”节点或 dashboard 附加区。
- 右侧改写 agent 的 reference 使用当前节点内容、adaptation notes 和 validation issues 作为上下文。

第一版微调仍可保持“批注与修改建议边界”，不必须自动写回 case package。

## 错误处理

- 文件无法解析：source job 失败，不创建 draft。
- 原文太短或缺少明确真相：job 失败，返回 fatal。
- 模型输出非 JSON：job 失败，记录 parse error。
- schema 不通过：可以创建 artifacts，但 job status 为 failed，不跳转 ready draft；如果后续产品想允许进入工作台修复，可改为 `needs-review` 状态。
- 自动质量检查存在 fatal：同 schema fatal。
- 只有 warning / suggestion：创建 draft 并跳转工作台。

## 测试策略

### Unit Tests

- skill contract 包含输入/输出工件、Studio runner contract、validation report、adaptation notes。
- source adaptation prompt 包含 skill loaded files 和默认 options。
- model output 解析支持 `fairPlaySpine` 和 `adaptationNotes`。
- validation report 能汇总 schema issues 和质量 issues。
- adaptation notes markdown 生成稳定。
- draft persistence 写入 `package/`、`studio.json`、`validation-report.json`、`adaptation-notes.md`。

### Integration Tests

- 上传原文 mock AI 输出后，创建 draft 并写入完整 artifacts。
- 上传 case-package zip 也写入同样的 draft artifacts，origin 为 `uploaded-package`。
- `package/` 目录可被 `loadCasePackageFromDirectorySync` 重新加载。
- `check_case_package_refs.mjs --json` 输出机器可读报告。

### Manual Verification

- `/studio` 上传 `.txt` 后跳转工作台。
- 工作台可看到原文画像、分段、改写说明、校验报告、章节、agents、线索、acts、storyEvents、最终指认。
- 保存和发布仍然可用。
- 发布后进入书架并可游玩。

## 成功标准

- 给定一篇短篇推理小说，Studio 可以通过上传原文生成结构完整、可校验、可审阅的案件草稿。
- 生成草稿包含 `case-package/v1` split package、validation report 和 adaptation notes。
- 用户不需要手动运行 skill。
- skill 文档、references 和 scripts 足以指导后续 agent 复现相同改写流程。
- 生成的 NPC runtime 配置可被 Agent Runtime v2 直接使用。
- 生成的 actGates 和 storyEvents 可被 schema、loader 和 checker 校验。
- Fatal 问题不会被伪装成可发布案件。
- 人工主要负责推理公平性和文学表达的最终审校，而不是手动修补文件结构。

## 风险

- 单次模型调用可能无法稳定产出长篇案件包。第一版仍接受短篇为主要目标；长文本截断必须进入 warning / fatal。
- 发行级文学质量无法完全自动证明。需要 adaptation notes 和 human review checklist 公开风险。
- 模型可能生成 schema-valid 但推理不公平的案件。需要 validation report 增加公平性检查项，并在 Studio 中显式展示。
- 写入 draft package 后，`draft.json` 和 `package/` 可能产生双来源不一致。实施时应以 package reload 校验作为落盘成功标准。
- 把完整 skill references 注入 prompt 会增加 token 成本。实施时可先加载核心 sections，后续再按任务阶段拆多轮生成。
