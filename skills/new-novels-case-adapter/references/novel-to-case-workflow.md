# 小说转案件工作流

使用本工作流将源小说转化为可玩的 New Novels 案件，同时不丢失公平推理结构和文学阅读质量。

## 禁止 Demo 摘要（Demo Summary Prohibition）

除非用户明确要求，不要生成 demo summary。默认目标是发行级产品内容：故事层必须像成熟中文推理样章一样可读，调查层必须保留玩家主动性。仅证明 schema 有效的案件包不算完成。

## 1. 源文本初读

建立私有工作简报：

- 来源标题、作者、版权状态、语言。
- 场景、时代、核心地点、叙述声音。
- 受害者和嫌疑人。
- 最终真相：真凶、动机、手法、决定性证据。
- 假解答：谁看起来有罪，为什么诱人。
- 原始线索顺序。
- 依赖文本细节而非明确证据的线索。

如果故事仍受版权保护，且用户未说明拥有权利，不要复现大量改写文本。此时提供结构抽取流程。

## 2. 源文本分段轮（Source Segmentation Pass）

写章节或案件数据前，先把源文本分类为可玩层和可读层。不要跳过这一步。

使用以下标签：

- `story-keep`：保留在阅读栏。包括背景、氛围、普通剧情推进、人物介绍、非线索对话和文学质感。
- `investigation-hide`：从阅读栏移除并转为玩法。包括侦探搜索、现场检查、物件观察、证人询问、警方核查、外部验证和线索发现。
- `deduction-hide`：从阅读栏移除并转为后期推理。包括假设、识别矛盾、比较证词、推翻假解答、手法推理、动机推理和缩小真凶范围。
- `solution-lock`：排除在普通游玩外。包括最终答案、完整手法、真凶确认、动机锁定和结案后解释。
- `bridge-rewrite`：只有在移除隐藏调查 / 推理后会破坏叙事连续性时，才新增连接文本。

生成私有分段表：

```text
source span | label | why | destination | player discovery route
```

目标位置示例：

- `story/chapter-1.md`
- `scene-gun-room:window`
- `clue-missing-revolver`
- `agent-japp.revealRules`
- `storyEvents`
- `contradiction-middleton-existence`
- `truth.method`
- `accusation.questions`

每个 `investigation-hide` 和 `deduction-hide` 项都必须有 player discovery route。如果没有路线，先补路线再继续。

## 3. 公平推理主干

将源文本压缩为可解链条：

1. 开场情境。
2. 表层证据。
3. 误导性嫌疑人或假解释。
4. 不合拍的异常细节。
5. 形成压力的证词。
6. 指向手法的矛盾。
7. 动机或身份锁定。
8. 最终指认要求。

每个最终答案都必须至少由一个结构化线索或矛盾支撑。

## 4. 调查抽取映射（Investigation Extraction Map）

写最终章节前先建立该映射。

对每个 `investigation-hide` 片段说明：

- 原侦探做了什么。
- 玩家应该做什么来替代。
- 哪个 scene、object、NPC 或外部询问会暴露它。
- 哪个 fact / clue / contradiction id 存储它。
- 它是否需要 `storyEvents` 表达行动后果。
- 哪个 act gate 依赖它。

对每个 `deduction-hide` 片段说明：

- 它比较哪些事实。
- 它支撑哪个矛盾或指认问题。
- 它是否可以作为后期由 general agent 或波洛式导师给出的提示。
- 哪些内容必须保留到最终指认。

错误映射：

```text
Poirot discovers the housekeeper is fake -> chapter text says the housekeeper is fake.
```

正确映射：

```text
Poirot asks about clothing -> story bridge says Poirot sends oddly specific telegrams.
Agency denies the housekeeper -> clue-agency-denial via Japp/external inquiry.
No one saw both women together -> contradiction-never-together via Poirot reveal.
Housekeeper is fake -> solution-lock and accusation question.
```

## 4.5 故事事件分类（Story Event Design）

在写 acts 和 reveal rules 前，先判断原文中每个行动的因果顺序。目标不是模拟现实耗时，而是表达玩家行为是否改变 NPC、证据、场景或调查阶段。

使用 `storyEvents` 记录四类事件：

- `instant-result`：玩家提出正确调查方向后立即获得资料。查账单、查登记、查时刻表、查介绍所、核实俱乐部签到、核实电报来源都属于这一类。`timing` 必须是 `none`，不推进故事时间。
- `agent-state-change`：玩家把某条事实、矛盾或怀疑暴露给 NPC，导致该 NPC 后续回答、压力、撒谎策略或 reveal rules 改变。`timing` 使用 `immediate`。
- `story-beat`：侦探或导师的行为导致世界状态变化，例如 NPC 消失、证据被移动、警方封锁现场、波洛电报改变调查方向、新场景开放。`timing` 使用 `story-beat`。
- `act-transition`：玩家完成阶段性 required discoveries 后进入下一幕。`timing` 使用 `act-transition`，并与对应 `ActGate` 对齐。

判断规则：

1. 这个动作只是获得信息吗？是则 `instant-result`。
2. 这个动作会让某个 NPC 知道玩家掌握了什么吗？是则 `agent-state-change`。
3. 这个动作会改变世界状态、机会窗口或角色可用性吗？是则 `story-beat`。
4. 这个动作是否打开新的调查阶段？是则 `act-transition`。

错误设计：

```text
Japp takes two days to check railway bills -> create a waiting task.
```

正确设计：

```text
Player asks Japp to verify railway bills -> instant-result, unlock verified alibi facts.
Poirot says watch the housekeeper -> story-beat, Middleton vanishes and can no longer be questioned normally.
Player confronts Zoe with "no one saw both women together" -> agent-state-change, Zoe becomes guarded.
```

每个 story event 必须写明 `designRationale`，说明为什么需要或不需要推进故事时间。这能防止把小说压缩时间误翻译成游戏等待。

## 5. 重写章节

章节应作为文学化案件上下文来写：

- 故事栏保持安静、小说化。
- 不插入 UI 指令或清单式语言。
- 除非该章设计为破案后解锁，否则不要揭示最终真凶、手法或动机。
- 开场章节需要包含足够氛围和初始证据，让玩家能开始调查。
- 以 `story-keep` 为主要材料。翻译、轻改并保留质感，而不是把案件压缩成摘要。
- 从普通章节中移除 `investigation-hide`、`deduction-hide` 和 `solution-lock`，除非故事故意从这些事实已公开的阶段开始。
- 用 `bridge-rewrite` 保持因果、时间跳跃和情绪连续性。
- 如果某个线索本应由玩家发现，不要在故事中保留原侦探发现它的路径。
- 保留能建立人物、动机质感、氛围或关系的非调查对话。

阅读保留率 guideline：

- 如果权利允许改写正文，应保留大部分非调查内容。一个较好目标是保留 60%-80% 的 `story-keep` 信息。
- 除非源文本本身极短，否则像 synopsis 一样的章节不可接受。
- 调查内容应转化为交互，而不是消失。

## 5.5 发行级重写轮（Publication-Grade Rewrite Pass）

第一版章节草稿完成后，先进行专门的文学编辑轮，再构建或交付案件包。

编辑要求：

- 文本必须像完成度足够的中文推理文本，而不是翻译笔记。
- 保留叙述者质感、社会氛围、场景压力、人物反差和戏剧节奏。
- 当源文本支持场景级材料时，把压缩说明扩展为场景。
- 用 `bridge-rewrite` 让被移除的调查段落对读者不可见：不能有突兀跳转、情绪缺口或 “the investigation then found” 占位。
- 当线索性问题应成为玩家行动时，不要把这些问题留在故事层。
- 保留足够暧昧，让故事邀请调查，但不替玩家完成推理。
- 不要告诉玩家要做什么。好奇心应来自场景，而不是说明文字。

最低读者测试：

- 从不打开调查台的读者，也应感觉自己读到了一个打磨过的侦探小说开篇。
- 打开调查台的玩家，应感觉故事给了自己动机、人物、地点和可继续拉扯的可疑缝隙。

通过该轮后，才能进入数据校验。

推荐章节 id：

- `chapter-1`
- `chapter-2`
- `chapter-solution`：仅在需要破案后揭示章节时使用。

## 6. 设计剧本杀式多幕结构

不要把多幕剧情理解成普通章节分页。Act 是玩家的信息状态和调查阶段。

为每一幕定义：

- 玩家当前知道什么。
- 这一幕能问哪些 NPC。
- 这一幕能调查哪些 scene 和 object。
- 这一幕必须发现哪些 facts、clues、contradictions。
- 这一幕必须完成哪些 NPC interactions 或 scene interactions。
- 进入下一幕的 ActGate。
- 解锁下一幕时给玩家看的 non-spoiler unlockNarrative。

常见结构：

1. `act-opening`：案发现场，发现表层物证和 false solution。
2. `act-testimony`：证词阶段，发现人物关系和前后矛盾。
3. `act-confrontation`：对质阶段，用已发现矛盾逼问关键 NPC。
4. `act-accusation`：指认或真相阶段。

每一幕都要有 required discoveries。玩家进入下一幕时应该感觉自己完成了一个阶段性谜题，而不是只是翻到下一章。对应的 `act-transition` story event 应解释为什么调查结构发生变化，但真正的进入条件仍以 `ActGate` 为准。

## 7. 先写事实，再写 Agents

先写所有 facts，再写 NPC。这能防止 agent 发明细节。

有用类别：

- 场景事实：尸体位置、物件、天气、视线、声音、时间。
- 证词事实：每个角色声称发生了什么。
- 人物事实：关系、动机、恐惧、秘密。
- 法医或逻辑事实：物理限制、时间不可能、缺失痕迹。
- 真相事实：真凶、手法、动机、伪造证据、决定性解释。

然后连接：

- scenes 到 observable facts；
- clues 到 facts；
- contradictions 到 facts；
- reveal rules 到 facts；
- accusation 到 truth facts。

## 8. 从知识边界设计 NPC

为每个 NPC 写明：

- 公开知道什么。
- 私下知道什么。
- 相信什么但可能错了。
- 隐瞒什么。
- 对什么撒谎。
- 绝不能声称什么。
- 平静时如何说话。
- 压力下如何反应。

然后生成 runtime 行为：

- `pressureProfile`：baseline、guarded / cornered 阈值，以及来自源文本触发器的 increase rules。
- `emotionalArc`：NPC 如何从 calm 变为 guarded 再到 cornered。
- `confrontationTriggers`：让该 NPC 防御的源文本话题、线索、事实或矛盾。
- `confessionBoundary`：即使被逼到 cornered 也不能直接承认什么。
- `styleAnchors`：指导语气的短角色台词。

不要给每个 NPC 使用同一套压力模型。骄傲嫌疑人、惊恐证人、保护性伴侣和真凶应有不同阈值与压力增量。

不要因为叙述者知道完整真相，就让 NPC 知道完整解答。即使真凶也应被阻止通过普通 reveal rules 直接供认。

## 9. General Agent

`general` agent 是调查台，不是全知侦探。

它可以：

- 描述已解锁场景信息。
- 帮助比较已知事实。
- 指向相关 NPC 或物件。
- 说明证据不足。

它不能：

- 替玩家破案。
- 在最终指认前揭示 truth facts。
- 创造新事实或证据。

## 10. Reveal Rule 设计

用 reveal rules 让问询更有生命力：

- `direct`：可以直接说出的事实信息。
- `partial`：有用但不完整的提示或观察。
- `reluctant`：在社交或证据压力后才透露的信息。
- `evasive`：回避式回答，但仍更新怀疑或暴露行为。

好的 reveal rules 会引用：

- 已持有线索；
- 话题词；
- act；
- pressure level；
- contradictions。

避免一个 reveal rule 解锁完整答案。

## 11. Accusation 设计

问题应测试玩家推理，而不是测试精确措辞。

accepted answers 应包含：

- 姓名和别名。
- 对手法和动机的简洁转述。
- 如果案件有翻译名，应包含源语言姓名。
- 避免要求完整句子。

好的指认可以公平失败。如果玩家漏掉手法或决定性矛盾，应知道自己需要继续调查，而不是过早得到谜底。

## 12. 阅读与可玩性审查

组装前，像普通玩家一样阅读章节：

- 隐藏调查后，故事是否仍然有叙事意义？
- 它像小说，而不是案件摘要吗？
- 改写是否保留了氛围、人物质感和非调查事件？
- 调查和推理段落是否从故事文本中隐藏？
- 每个隐藏线索是否有可探索入口？
- 每个原文行动是否已按 storyEvents 分类，且纯记录核查没有误用时间推进？
- 玩家是否知道足够多，能开始提出有效问题？
- 故事是否避免告诉玩家侦探已经证明了什么？

然后测试调查路径：

- 玩家能否通过 NPC、scenes 或 objects 发现每个隐藏线索？
- 玩家能否不猜内部 id 就解锁每一幕？
- 每一幕是否揭示新阶段，而不是只翻新页面？
- 最终指认能否仅凭已发现线索和矛盾解出？

读者-玩家双重验收：

- Reader acceptance：文本作为发行级样章，应连贯、有氛围、有节奏、情绪可读。
- Player acceptance：每个隐藏调查或推理片段，都有 scene、NPC、object、contradiction、act gate 或 accusation 路线。
- Event acceptance：`storyEvents` 清楚表达因果顺序，instant-result、agent-state-change、story-beat 和 act-transition 各自边界清楚。
- 失败条件：如果读者体验只是 synopsis，或玩家路径只是重复正文已经说出的事实，交付前必须重写。

## 13. 自审清单

交付前：

- 每个 id 是否使用小写连字符形式？
- 是否存在 `general` 且 `type: "general"`？
- 每个被引用的 agent、clue、fact、act、scene、victim 和 question id 是否存在？
- `truth.culprit` 和 `truth.victim` 是否是有效 id？
- 每个 truth 组件是否有 clue / fact 支撑？
- 是否有 NPC 能过早揭示 truth fact？
- 误导线索是否误导但公平？
- 章节是否可作为 prose 阅读，并基于 `story-keep` 加 `bridge-rewrite`？
- `investigation-hide`、`deduction-hide` 和 `solution-lock` 是否从普通阅读中排除？
- 每个隐藏调查项是否有可玩发现路线？
- `storyEvents` 是否覆盖即时结果、NPC 状态变化、故事节拍和幕推进？
- 查账单、查档案、查介绍所等纯信息动作是否保持 `instant-result` 且不推进故事时间？
- 最终可接受答案（accepted answers）是否足以覆盖自然人类输入？

## 14. 案件包组装（Package Assembly）

同时组装聚合快照和拆分导入包：

- `case.json` 包含完整 `CaseFile`，便于审查和 diff。
- `story/chapters.json` 包含章节元数据，每个 `body` 指向 `story/` 中的 Markdown 文件。
- `agents/global-context.json` 包含共享行为规则。
- `agents/<agent-id>.json` 每个文件只包含一个已配置 agent，包括 runtime 行为字段。
- `acts/gates.json` 包含带具体 required discoveries 的 ActGates。
- `events/story-events.json` 包含即时信息、角色状态变化、故事节拍和幕推进设计。
- `truth/`、`victims/`、`relationships/`、`propagation/` 和 `contradictions/` 即使数组很小或为空，也应是独立目录。

对目录运行 skill checker：

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/<case-id>
```

如果案件包已加入应用，再运行仓库 loader 测试。
