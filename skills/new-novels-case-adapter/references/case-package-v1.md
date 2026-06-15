# 案件包 v1 参考

本文档总结当前仓库状态下的 New Novels schema。如果与 `lib/case/schema.ts` 或 `lib/case-package/schema.ts` 中的实时 TypeScript schema 不一致，始终以代码 schema 为准。

## 包形状

```json
{
  "manifest": {},
  "caseFile": {}
}
```

可导入的文件系统案件包必须包含：

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
events/story-events.json
scenes/scenes.json
clues/clues.json
relationships/relationships.json
propagation/rules.json
contradictions/contradictions.json
truth/truth.json
victims/victims.json
accusation/questions.json
```

`case.json` 是聚合审查快照。目录加载器读取拆分文件，并使用 `story/*.md` 作为章节正文来源，因此复制或上传案件包时必须保持这些文件同步。

`manifest` 必须满足：

- `schemaVersion`：必须等于 `case-package/v1`。
- `caseId`：与 `caseFile.id` 相同。
- `title`
- `language`，例如 `zh-CN`。
- `entryChapterId`：必须匹配某个章节 id。
- `createdBy`
- `source.title`
- `source.author`
- `source.rightsNote`

`caseFile` 是应用消费的 runtime 对象。

## 必需 CaseFile 部分

- `id`、`title`
- `globalContext`
- `source`
- `storyText`
- `chapters`
- `acts`
- `actGates`
- `storyEvents`
- `scenes`
- `facts`
- `relationships`
- `propagationRules`
- `contradictions`
- `truth`
- `victims`
- `agents`
- `clues`
- `accusation.questions`

## 全局上下文（Global Context）

使用简短、具体的规则：

- `fairPlayRules`：谜题如何保持可解且真相固定。
- `conversationRules`：agent 如何回答。
- `spoilerRules`：最终指认前不能揭示什么。
- `fabricationRules`：agent 绝不能编造什么。
- `toneRules`：语言、长度和文学风格。

## 章节（Chapters）

每个章节包含：

- `id`
- `title`
- 可选 `subtitle`
- `body`
- `availableFromStart`
- 可选 `previousChapterId`
- 可选 `nextChapterId`

章节用于可读正文，不用于系统指令。如果源文本较长，应重写为可玩的章节，并保留线索顺序和公平推理节奏。

从小说源文本改写时，章节应由改写过程中的分段标签组装：

- `story-keep`：非调查叙事、氛围、关系和普通人物对话。它们应在版权和翻译约束允许的范围内尽量完整地保留在读者可见故事中。
- `bridge-rewrite`：只有在移除侦探调查会破坏连续性时插入的短连接文本。

不要把 `investigation-hide`、`deduction-hide` 或 `solution-lock` 片段留在读者可见章节中。这些片段必须移动到 scenes、clues、agent knowledge、reveal rules、contradictions、act gates 或 final accusation material。每个隐藏调查或推理项都需要清晰的 `可探索入口`：scene object、NPC topic、clue unlock hint、contradiction 或 act gate condition，使玩家能通过游玩发现它。

## 剧情幕（Acts）

每个 act 包含：

- `id`
- `title`
- `availableAgentIds`
- `visibleClueIds`
- `lockedFactIds`
- 可选 `entryConditions`
- 可选 `exitConditions`

使用 acts 控制信息门禁。开局幕应暴露嫌疑人和表层证据，后续幕可以解锁矛盾或更深证词。

## 剧情幕门槛（ActGates）

每个 act gate 包含：

- `id`
- `fromActId`
- `toActId`
- `requiredClueIds`
- `requiredFactIds`
- `requiredContradictionIds`
- `requiredNpcInteractions`
- `requiredSceneInteractions`
- `unlockNarrative`

使用 actGates 创造剧本杀式 progression。gate 应证明玩家已经完成某个推理阶段，然后才打开下一幕。不要仅凭模糊话题解锁 acts。

## 故事事件（storyEvents）

`storyEvents` 记录原文行动在互动案件中的因果设计。它不是后台任务队列，也不是现实时间模拟；它说明玩家行为、NPC 行为、世界状态和调查阶段之间的关系。

每个 story event 包含：

- `id`
- `kind`：`instant-result`、`agent-state-change`、`story-beat` 或 `act-transition`
- `title`
- `description`
- `timing`：`none`、`immediate`、`story-beat` 或 `act-transition`
- `trigger`：可包含 `requiresAct`、`agentId`、`topics`、`requiredClueIds`、`requiredFactIds`、`requiredContradictionIds`、`requiredNpcInteractions`、`requiredSceneInteractions`
- `effects`：可包含 `revealedFactIds`、`revealedClueIds`、`revealedContradictionIds`、`targetAgentIds`、`nextActId` 和 `narrative`
- `designRationale`

四类事件的使用边界：

- `instant-result`：查账单、查登记、查时刻表、核实电报、核实俱乐部签到等纯信息获取。价值在于玩家提出正确调查方向，`timing` 必须是 `none`，不推进故事时间。
- `agent-state-change`：玩家向 NPC 暴露怀疑、展示矛盾或告知某条事实，导致对方防御、慌张、改口或改变撒谎策略。`timing` 应为 `immediate`。
- `story-beat`：玩家、导师或警方行动触发 NPC 离场、证据状态变化、波洛电报、场景开放等世界变化。`timing` 应为 `story-beat`。
- `act-transition`：阶段性调查完成后打开新幕。它应与 act gate 对齐，`timing` 应为 `act-transition`。

不要因为原文写“过了两天”就引入等待。只有这段时间造成新的角色行为、机会窗口、证据变化或调查阶段变化时，才需要 story-beat。

## 场景（Scenes）

每个 scene 包含：

- `id`
- `actId`
- `location`
- `observableFactIds`
- `interactableObjects`
- `ambientText`

Scenes 是调查表面。Observable facts 必须指向已有 fact ids。

## 事实（Facts）

每个 fact 包含：

- `id`
- `text`
- `visibility`：`public`、`private`、`truth` 或 `unlocked`
- `ownerAgentIds`
- `relatedClueIds`
- 可选 `actId`
- `keywords`

Facts 是事实账本。每条 clue、reveal、contradiction、scene observation 和 accusation 都应追溯到 facts。

可见性说明：

- `public`：开局安全可见。
- `unlocked`：通过调查发现。
- `private`：一个或多个 NPC 知道，但不会自动揭示。
- `truth`：最终解答或剧透级事实。

## 线索（Clues）

每条 clue 包含：

- `id`
- `title`
- `text`
- `tag`：`clue`、`testimony`、`doubt` 或 `contradiction`
- `source`
- `unlockHints`
- 可选 `unlock.type`：`agent-response`、`story`、`manual` 或 `system`
- 可选 `unlock.agentId`
- 可选 `unlock.topics`
- 可选 `unlock.factIds`

Clue 应对玩家有用：它要么改变怀疑方向，要么打开新问题，要么解决假解答，要么支撑最终指认。

## Agent（Agents）

所有 agents 共享：

- `id`
- `type`
- `aliases`
- `name`
- `role`
- `promptVersion`
- `permissions`
- `lieStrategy`
- `pressureProfile`
- `emotionalArc`
- `confrontationTriggers`
- `confessionBoundary`
- `styleAnchors`
- `personality`
- `knowledge`
- `revealRules`

案件必须包含：

```json
{
  "id": "general",
  "type": "general",
  "knowledgeScope": "unlocked-only"
}
```

通用 agent 还需要 `allowedTopics` 和 `forbiddenClaims`。

NPC agents 需要 `boundaries`：

- `hides`
- `liesAbout`
- `forbiddenClaims`

权限通常用于约束 agents：

```json
{
  "canSeeTruth": false,
  "canSeeOtherAgentsPrivateFacts": false,
  "canRevealUnsolvedClues": false,
  "canCreateNewFacts": false,
  "canReferencePlayerNotes": false
}
```

通常只有 general agent 将 `canReferencePlayerNotes` 设为 true。

## Runtime 行为字段

每个 NPC 都应有来自源文本的 `pressureProfile`：

```json
{
  "baseline": 0,
  "thresholds": { "guarded": 2, "cornered": 5 },
  "increaseRules": [
    {
      "id": "wilfred-tower-contradiction",
      "topics": ["钟楼", "小锤", "伤口"],
      "clueIds": ["small-hammer", "tower-height"],
      "factIds": ["fact-small-hammer-weight"],
      "contradictionIds": ["contradiction-hammer-force"],
      "delta": 3,
      "reason": "玩家把钟楼高度、小锤重量和伤口力度放在一起逼问。"
    }
  ]
}
```

`emotionalArc` 必须定义 `calm`、`guarded` 和 `cornered`。`confrontationTriggers` 列出会增加压力的话题。`confessionBoundary` 标明 NPC 仍不能直接承认什么。`styleAnchors` 提供短角色台词示例，用于控制语气。

## 揭示规则（Reveal Rules）

每条 reveal rule 包含：

- `id`
- `factId`
- `fact`
- 可选 `requiresClues`
- 可选 `requiresAllClues`
- 可选 `requiresAnyClues`
- 可选 `requiresTopics`
- 可选 `requiresPressureAtLeast`
- 可选 `requiresAct`
- 可选 `requiresContradictions`
- `revealMode`：`direct`、`reluctant`、`evasive` 或 `partial`

每个 `factId`、clue id、act id 和 contradiction id 都必须存在。

## Relationships 与 Propagation

Relationships 描述 NPC 之间的态度：

- `from`
- `to`
- `attitude`：`protective`、`hostile`、`fearful` 或 `indifferent`
- `knownFactsAboutOther`

Propagation rules 描述信息如何移动：

- `fromAgentId`
- `toAgentId`
- `factId`
- `condition`
- `mode`：`rumor`、`direct` 或 `observed`

只有当这些字段能澄清 runtime 行为时才使用。无需时保持数组为空。

## 矛盾（Contradictions）

每个 contradiction 包含：

- `id`
- `title`
- `factIds`：至少两个
- `clueIds`
- `agentIds`

Contradictions 很适合公平推理锁和最终指认问题。

## Truth 与 Accusation

`truth`：

- `culprit`：必须匹配 agent id
- `victim`：必须匹配 victim id
- `motive`
- `method`
- `decisiveEvidence`

每个 accusation question：

- `id`
- `prompt`
- `acceptedAnswers`
- `explanation`

最低可用最终指认集合：

- 真凶（culprit）
- 手法（method）
- 决定性矛盾或证据（decisive contradiction 或 evidence）
- 动机（motive）

只有当谜题需要时，才增加 victim、opportunity 或 alibi 问题。
