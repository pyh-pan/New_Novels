# 案件包 v1

案件包是推理故事与 New Novels runtime 之间的内容边界。一个案件包同时包含可读小说正文，以及结构化事实、NPC、规则和最终指认数据。

权威 schema 位于：

- `lib/case/schema.ts`
- `lib/case-package/schema.ts`

本地 skill 参考文档位于：

- `skills/new-novels-case-adapter/references/case-package-v1.md`

## 文件系统布局

可运行案件包目录必须包含：

```text
manifest.json
case.json
story/chapters.json
story/*.md
agents/global-context.json
agents/<agent-id>.json
facts/facts.json
acts/acts.json
acts/gates.json
scenes/scenes.json
clues/clues.json
relationships/relationships.json
propagation/rules.json
contradictions/contradictions.json
truth/truth.json
victims/victims.json
accusation/questions.json
```

`case.json` 是聚合审查快照。加载器读取拆分文件，章节正文来自 `story/*.md`。

## 内置示例

当前默认内置包是：

```text
cases/hunters-lodge/
```

它由 `getDefaultCase()` 加载，并驱动默认应用体验。当前仓库只保留这一个内置可玩案件。

## 重要部分

### 清单（Manifest）

`manifest.json` 标识案件包：

- `schemaVersion`：必须是 `case-package/v1`；
- `caseId`：必须匹配 `caseFile.id`；
- `title`；
- `language`；
- `entryChapterId`；
- 来源标题、作者和版权说明。

### 故事正文（Story）

`story/chapters.json` 包含章节元数据。每章的 `body` 指向 `story/` 下的 Markdown 文件。

故事正文应保持文学性。不要把 UI 指令、隐藏事实或最终解答文本放入早期章节。

### 事实账本（Facts）

`facts/facts.json` 是事实账本。事实是以下内容的稳定来源：

- 场景观察；
- 线索支撑；
- NPC 揭示规则；
- 矛盾；
- 指认答案；
- 隐藏真相。

事实可见性可以是 `public`、`unlocked`、`private` 或 `truth`。

### Agent 配置（Agents）

每个案件都必须包含一个通用 agent：

```json
{
  "id": "general",
  "type": "general"
}
```

NPC 文件定义：

- 别名；
- 性格；
- 知识；
- 边界；
- 撒谎策略；
- 揭示规则；
- 压力模型；
- 情绪弧；
- 风格锚点。

NPC 私有事实会影响行为，但不会自动变成允许说出口的事实。

### Acts 与 Act Gates

`acts/acts.json` 定义可玩的调查阶段。

`acts/gates.json` 定义玩家如何解锁下一阶段。门槛可以要求：

- 线索 id；
- 事实 id；
- 矛盾 id；
- NPC 交互；
- 场景交互。

Act gate 应证明玩家完成了调查进展，不应只依赖模糊关键词猜测。

### 最终指认（Accusation）

`accusation/questions.json` 定义最终问题和可接受答案。

最终指认校验是确定性的。可接受答案应足够宽容，覆盖合理的人类表达，但必须基于标准真相。

## 校验

运行：

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hunters-lodge
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hunters-lodge
```

同一个检查器支持聚合 package JSON、拆分包目录和 zip 文件：

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs case-package.zip
```

加载器也可以返回结构化校验报告：

```ts
validateCasePackageDirectory("cases/hunters-lodge")
```

报告字段：

- `severity`；
- `code`；
- `filePath`；
- 可选 `fieldPath`；
- `message`；
- `suggestion`。

## 内容改写

将推理故事转换为案件包时，使用 `skills/new-novels-case-adapter/`。该 skill 负责生成可运行数据，而不只是重写正文。

最低有效输出：

- 章节；
- 事实；
- 线索；
- 矛盾；
- agent；
- 压力模型；
- 揭示规则；
- 剧情幕和 act gate；
- 最终指认问题。

## Zip 导入

网页应用提供统一的案件包导入路径：

```text
POST /api/cases/preview
```

发送包含案件包 zip 的 multipart `file` 字段。端点既接受文件直接位于根目录的 zip，也接受带单个顶层文件夹的 zip。成功后返回：

- manifest 数据；
- 案件 id 和标题；
- 章节、agent、剧情幕、线索和指认问题数量；
- 结构化问题。
- Studio 草稿 id。

Studio 入口使用该端点。用户从 `/studio` 导入案件包后，系统会把 zip 内容注册为 `draft` 状态的 Studio 草稿，并进入 `/studio/cases/<draft-case-id>` 审阅工作台。此后 zip 导入和原文上传生成进入同一条链路：创作者可以保存草稿，也可以发布为正式可玩案件。

## Studio 审阅视图

Studio 不直接编辑原始 zip。它先把案件包映射为 `StudioDraftView`，让创作者审查完整设计：

- 故事章节：正文、所属幕、玩家可见事实、隐藏调查内容、关联线索、关联矛盾和下一幕条件；
- 角色：性格语气、公开知识、私有事实、边界、揭示规则和章节约束矩阵；
- 线索、矛盾、多幕推进、最终指认和校验报告；
- 右侧改写助手工作区：收集针对当前节点的批注，并生成后续 diff 建议。

这一层的目标是让创作者知道当前故事在每一章、每个 agent 和每个解锁条件下会如何运行。

## 质量检查

`check_case_package_refs.mjs` 同时检查引用完整性和最低 runtime 就绪度：

- 恰好一个 `general` agent；
- id 唯一；
- facts、clues、acts、gates、scenes、relationships、propagation rules、contradictions、pressure rules 和 reveal rules 引用有效；
- 至少三个指认问题；
- 非最终幕具备解锁门槛；
- NPC 包含来源特定的压力规则、情绪弧、对质触发器和风格锚点。
