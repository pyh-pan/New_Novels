---
name: new-novels-case-adapter
description: "当用户上传、粘贴或指向一篇推理 / 悬疑故事，并希望将其改写为可玩的 New Novels 案件包时使用。"
---

# New Novels 案件改写 Skill

## 目的

将推理故事源文件转化为完整的 New Novels 案件包。案件包必须能通过本仓库 case schema 校验，并能作为公平推理互动体验运行。

默认交付目标是 `publication-grade`，`not a demo`。有效改写应该像可以展示给真实推理读者的成熟产品样章：可读小说文本在前，可玩调查结构在后，底层由结构化 runtime 数据支撑。

当用户上传、粘贴或指向一篇推理故事，并要求解析、改写、结构化、导入或使其可在 New Novels 中运行时，使用本 skill。

## 首先阅读

生成或编辑案件前，先检查当前仓库中的：

- `readme.md` 和 `roadmap.md`，了解产品方向。
- `lib/case/schema.ts`，了解标准 runtime `CaseFile` 契约。
- `lib/case-package/schema.ts`，了解案件包包装契约。
- `lib/case-package/loader.ts` 和 `lib/case-package/writer.ts`，了解拆分案件包读写边界。
- 相关测试，了解当前代码实际验证的契约。

不要把任何既有案件目录作为内容模板、质量模板或 prompt anchor。既有案件只能在用户明确指定审阅、调试或迁移某个案件时读取；通用改写任务必须以 schema、reference、writer/loader 和测试为准。

字段细节参考 `references/case-package-v1.md`。改写流程参考 `references/novel-to-case-workflow.md`。Studio 内置执行契约参考 `references/studio-runner-contract.md`。

## 输出契约

Studio runner 会把本 skill 作为版本化生成契约注入平台 AI 改写任务。默认输入选项：

- `targetLanguage: "zh-CN"`
- `adaptationGranularity: "publication-grade"`
- `investigationScope: "full-playable-investigation"`

优先生成完整目录案件包。保留聚合版 `case.json` 作为便携审查快照，但应用加载器与校验流程必须能直接读取拆分文件系统布局。

必需布局：

- `manifest.json`
- `case.json`
- `story/chapters.json`
- `story/*.md`
- `agents/global-context.json`
- `agents/<agent-id>.json`
- `facts/facts.json`
- `acts/acts.json`
- `acts/gates.json`
- `events/story-events.json`
- `scenes/scenes.json`
- `clues/clues.json`
- `relationships/relationships.json`
- `propagation/rules.json`
- `contradictions/contradictions.json`
- `truth/truth.json`
- `victims/victims.json`
- `accusation/questions.json`
- 仅在确实需要真实资产时加入 `assets/`

拆分文件同时面向创作者和导入流程。`case.json` 应包含相同的聚合数据，便于审查、diff 和外部校验。

Studio 生成草稿还必须产出非案件包工件：

- `validation-report.json`：机器可读质量与结构校验报告。
- `adaptation-notes.md`：给创作者和后续改写 agent 的改写说明。

这两个文件不能放入纯 `case-package/v1` 的 `package/` 目录内，应作为 Studio draft artifacts 与 `package/` 并列保存。

## 改写规则

- 保持固定真相。不得让 agent prompt 或模型行为发明真凶、手法、动机、时间线、证据或最终答案。
- 保持公平推理：每个最终答案都必须能从明确事实、线索、证词或矛盾中推导出来。
- 在优化数据模型前，先保护阅读体验。故事栏应像成熟可读的中篇小说，而不是剧情摘要。
- 除非用户明确要求一次性原型，否则每次改写都按 `publication-grade` 处理。源材料可用时，不交付 demo summary。
- 改写前先分段。每个源文本片段必须归类为 `story-keep`、`investigation-hide`、`deduction-hide`、`solution-lock` 或 `bridge-rewrite`。
- 在版权和翻译约束允许的范围内，尽可能完整地保留 `story-keep` 片段。不要把非调查叙事压缩成梗概。
- 将 `investigation-hide` 片段转化为可玩探索：场景、线索、NPC 证词、揭示规则、矛盾和 act gates。
- 将 `deduction-hide` 片段转化为后期矛盾、压力揭示或最终指认要求。不要让故事文本替玩家完成侦探推理。
- `solution-lock` 只放入 `truth`、剧透级事实和通关后解释。
- `bridge-rewrite` 只用于修复删除调查 / 推理段落后的连续性，不得泄露被替换的隐藏线索。
- 分离阅读文本与调查数据。章节应像小说，facts 和 clues 承载可机器校验的案件逻辑。
- 将所有模型可见 NPC 内容视为围绕结构化事实的非可信表演。产品规则应放在 `facts`、`clues`、`truth`、`revealRules`、`boundaries` 和 `accusation` 中。
- 保持剧透门禁。`truth` facts 可以存在于包内，但普通 NPC 不应在最终指认前揭示它们。
- 每个 id 稳定、小写、连字符化且有意义，例如 `fact-bell-tower-shadow`、`clue-light-hammer`、`act-opening`。
- 优先少量强线索，而不是大量模糊线索。每条线索都应帮助玩家提出更好的问题、发现矛盾或回答最终指认。
- 多幕设计是游戏结构，不是章节分页。每一幕需要 required discoveries、scene goals，以及能证明下一幕为何解锁的 `ActGate`。
- 为小说中的行动后果生成 `storyEvents`。不要按现实耗时设计游戏时间；查账单、查登记、查时刻表、核实俱乐部签到等纯记录核查应是 `instant-result`，`timing: "none"`，不推进故事时间。只有玩家行为导致 NPC 行为、证据状态、角色可用性或调查阶段变化时，才使用事件推进。
- `storyEvents` 必须分为四类：`instant-result`（玩家提出正确调查方向后立即获得记录或事实）、`agent-state-change`（玩家暴露怀疑或拿出证据后 NPC 变得防御/慌张/改口）、`story-beat`（NPC 消失、证据被移动、外部电报改变调查方向等世界状态变化）、`act-transition`（调查阶段打开或关闭）。
- 为每个 NPC 生成 runtime 行为。`pressureProfile`、`emotionalArc`、`confrontationTriggers`、`confessionBoundary` 和 `styleAnchors` 必须来自源文本中的角色功能与性格，而不是固定模板。
- 案件包组装后必须运行 `editorial pass`。修订章节文本的文学连续性、叙述声音、节奏、场景质感和读者信任。
- 交付前必须运行 `reader-player validation`：先判断故事不依赖调查 UI 时是否值得阅读，再判断隐藏调查内容是否能通过游玩发现。

## 工作流

1. **摄取源文本**
   - 识别标题、作者、语言、版权说明、叙述者、场景、受害者、嫌疑人、时间线和最终真相。
   - 如果源文本仍受版权保护或状态不明，且用户未说明拥有改写权利，不要生成可分发的大段改写文本；改为提供结构抽取流程。

2. **源文本分段**
   - 写案件包前先分类源文本片段。
   - `story-keep`：背景、氛围、人物介绍、非调查剧情推进、普通对话和可读连接组织。
   - `investigation-hide`：侦探搜索、现场检查、物件观察、证人询问、警方核查、外部验证和线索发现。
   - `deduction-hide`：侦探比较、假设、识别矛盾、推理手法 / 动机 / 真凶或推翻假解答。
   - `solution-lock`：最终解释、真凶确认、完整手法、动机锁定和结案后命运。
   - `bridge-rewrite`：因移除调查 / 推理段落而必须新增的连接文本。
   - 产出私有分段表，包含源文本范围、分类、原因、目标位置以及玩家是否必须发现。

3. **提取公平推理主干**
   - 真凶、受害者、动机、手法、决定性证据。
   - 诱人的假解答及其原因。
   - 玩家公平破案所需的最小线索链。
   - 真实、虚假、回避、部分真实或误导性证词。
   - 对线索链中的每条线索，记录它来自 `story-keep`、`investigation-hide`、`deduction-hide` 还是 `solution-lock`。

4. **设计可玩结构**
   - 创建代表剧本杀式调查阶段的 acts。
   - 创建包含可观察事实和可交互物件的 scenes。
   - 章节来自 `story-keep` 加必要 `bridge-rewrite`，不能来自整案摘要。
   - 创建 NPC agents 和一个必需的 `id: "general"` 通用 agent。
   - 为每一幕定义玩家目标、required discoveries、可用 NPC、scene goals，以及解锁下一幕的 `ActGate`。

5. **建立调查抽取映射**
   - 每个 `investigation-hide` 片段至少要变成一个可玩入口：`scene.interactableObjects`、`clues`、`facts`、`agent.revealRules`、`contradictions`、`storyEvents` 或 `actGates`。
   - 每个 `deduction-hide` 片段要变成后期矛盾、压力揭示、最终指认问题或通关后解释。
   - 每个隐藏线索都必须回答：谁能揭示、在哪里观察、什么话题解锁、支持玩家什么行动。
   - 如果隐藏信息没有可玩发现路径，继续前必须添加场景 / NPC 路径，或在故事文本中暴露非剧透版本。
   - 对每个原文行动判断是否需要时间或事件：只获得资料就是 `instant-result`；让某个 NPC 知道玩家掌握了什么就是 `agent-state-change`；造成世界状态变化就是 `story-beat`；打开新调查阶段就是 `act-transition`。

6. **重写阅读章节**
   - 在权利允许范围内保留尽可能多的 `story-keep` 文本；翻译或轻改，而不是摘要化。
   - 保持叙事声音、氛围、人物质感和时间顺序。
   - 删除或遮蔽侦探搜索、询问、外部核查和推理，让玩家自己执行。
   - 只在连续性断裂时加入 `bridge-rewrite`。
   - 读者应理解案件前提并想要调查，但不应直接得到调查路径。

7. **发行级编辑轮**
   - 将章节正文当作独立推理中篇样章阅读，而不是 case metadata。
   - 当源文本支持时，把压缩说明扩写为场景、动作、环境、节奏和人物质感。
   - 移除 UI 化解释、案件设计语言和过度直白的推理。
   - 保留暧昧：文本可以引发怀疑，但玩家仍需要调查来证明。
   - 做第二轮中文可读性、段落流动、句子节奏和叙述声音统一检查。

8. **建立事实账本**
   - 公开事实：开局安全信息。
   - 已解锁事实：通过调查揭示的公平线索。
   - 私有事实：NPC 特定知识、动机、秘密和谎言。
   - 真相事实：最终答案组成和剧透级逻辑。

9. **建立线索与揭示逻辑**
   - 每条线索都应有 unlock hints 和可选结构化 unlock metadata。
   - 每条 reveal rule 必须引用已存在的 `factId`、`clueId`、`actId` 和 contradiction ids。
   - reveal mode 应匹配戏剧行为：`direct`、`reluctant`、`evasive` 或 `partial`。

10. **构建 NPC**
    - 每个 NPC 需要 aliases、role、personality、knowledge、boundaries、lie strategies 和 reveal rules。
    - NPC 只能知道其角色允许知道的内容。
    - 使用 `forbiddenClaims` 防止跨 NPC 全知和提前泄露真相。
    - 从源文本中识别会让角色防御的话题、线索、事实或矛盾，并写入 `pressureProfile`。
    - 添加 `emotionalArc`，让 Runtime 能让语气从 calm 转向 guarded 或 cornered。
    - 添加 `confrontationTriggers`、`confessionBoundary` 和 `styleAnchors`，区分审问表现。

11. **构建 act gates**
    - 每个非最终幕都应有 `ActGate`，包含 `requiredClueIds`、`requiredFactIds`、`requiredContradictionIds`、`requiredNpcInteractions`、`requiredSceneInteractions` 和 `unlockNarrative`。
    - Act gate 应要求真实调查进展，而不是任意关键词猜测。
    - 解锁叙事应告诉玩家发生了什么变化，但不剧透完整解答。

12. **构建 storyEvents**
    - 为源文本中所有侦探行动建立因果分类，而不是照搬“过了两天”“稍后”等小说压缩时间。
    - `instant-result`：查账单、查档案、查介绍所、查车站记录、核实电报、核实俱乐部签到。这类事件的价值是玩家想到要查；结果可以即时返回，`timing` 必须是 `none`。
    - `agent-state-change`：玩家向 NPC 暴露怀疑、展示矛盾或告诉某人某条事实，导致对方后续语气、撒谎策略或 reveal rules 变化。
    - `story-beat`：玩家或导师的某个行为触发角色离场、证据移动、警方行动、波洛电报或新场景出现。这类事件才推进故事节拍。
    - `act-transition`：玩家完成阶段性 required discoveries 后进入新幕。它应与 `ActGate` 对齐，但用 `storyEvents` 解释为什么这是调查结构变化。
    - 每个事件都必须写明 `designRationale`，说明为什么需要或不需要推进故事时间。

13. **构建最终指认**
    - 包含覆盖真凶、手法、决定性矛盾 / 证据和动机的问题。
    - accepted answers 应包含常见变体、别名和简洁转述。
    - explanation 应在成功或失败处理后揭示标准真相。

14. **校验和修复**
    - 当包已接入代码时，运行仓库测试。
    - 对独立 package JSON 或 package directory，运行本 skill 的 `scripts/check_case_package_refs.mjs` 做引用完整性快速检查。
    - 交付前修复重复 id、缺失引用、缺失 general agent、真相覆盖不足、剧透泄露、缺失压力模型和缺失 ActGates。

## 质量门槛

生成案件满足以下条件前，不算完成：

- `caseFile` 能满足 `caseSchema`。
- `manifest.caseId` 匹配 `caseFile.id`。
- `manifest.entryChapterId` 存在于 `caseFile.chapters`。
- 所有被引用 id 都存在。
- 恰好一个 `id: "general"` 且 `type: "general"` 的通用调查 agent。
- 指认问题覆盖所有核心真相组成。
- 每个 NPC 具备 runtime-ready 的 pressureProfile、emotionalArc、confrontationTriggers、confessionBoundary 和 styleAnchors。
- 每个非最终幕都有包含 required discoveries 和非剧透 unlock narrative 的 ActGate。
- `storyEvents` 覆盖纯信息获取、NPC 状态变化、故事节拍和幕推进；纯记录核查不得被设计成等待或时间门槛。
- 普通 NPC 无法通过正常对话揭示完整解答。
- 故事文本不包含 UI 指令。
- 故事读起来像 `publication-grade` 产品样章，而不是 demo、梗概、大纲或设计说明。
- 章节正文来自 `story-keep` 加 `bridge-rewrite`，不是压缩后的全案摘要。
- 除非案件有意从某些事实公开后开始，否则章节正文必须隐藏 `investigation-hide`、`deduction-hide` 和 `solution-lock`。
- 每个隐藏调查片段都能通过 scene、NPC、clue、contradiction 或 act gate 被玩家发现。
- 移除调查段落后故事仍连贯；`bridge-rewrite` 修复连续性且不泄露隐藏线索。
- 改写保留足够的非调查内容，让它像在读故事，而不只是解谜。
- 文本已通过 `editorial pass`，检查声音、节奏、转场、场景质感和中文可读性。
- 包已通过 `reader-player validation`：读者能享受文本，玩家能通过交互发现每个隐藏调查项。

## 常见失败模式

- 把完整谜底放进 `storyText` 或早期章节。
- 认为“能在 app 中运行”就足够。runtime 有效是必要条件，但案件达到发行级阅读质量前仍未完成。
- 把完整源文本压缩成几段摘要，导致沉浸感丢失。
- 把侦探发现线索的路径留在故事文本中，让玩家只是在重复已经展示过的发现。
- 删除调查段落后没有加入 `bridge-rewrite`，造成章节突兀或不连贯。
- 隐藏线索后没有给玩家通过 scene、NPC 或 clue logic 发现它的可探索入口。
- 把所有对话都视为调查。普通人物质感可以保留在正文中；只有承载线索的询问应转为玩法。
- 在 `revealRules` 中创建不存在的 clue id。
- 因为源故事叙述者知道真相，就让所有 NPC 全知。
- accepted answers 过于严格，导致正确的人类回答失败。
- 把氛围当证据。只有结构化 facts 和 clues 能驱动最终判断。
- 按文本长度而不是调查状态拆分 acts。
- 把查账单、查档案、查介绍所这类纯信息获取做成等待任务，误把现实耗时当成故事推进。
- 缺少 `agent-state-change` 或 `story-beat`，导致玩家暴露怀疑后 NPC 和世界仍像静态问答库。
- 给每个 NPC 相同的压力阈值和情绪行为。
- 创建依赖任意话题而非 required discoveries 的 ActGates。
