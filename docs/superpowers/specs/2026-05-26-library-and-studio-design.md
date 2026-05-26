# 故事书架与创作者工作台设计方案

## 背景

当前产品默认打开某个案件的游玩界面。下一阶段需要把产品结构升级为两层：

1. 玩家先进入故事书架，以封面形式选择故事。
2. 创作者通过独立 Studio 上传原文或导入案件包，并在专业审阅工作台中确认、批注、修改和发布故事。

本方案只定义产品模块、页面结构、交互模式、数据流和实现边界。具体代码实现需要在本设计确认后再拆成实施计划。

## 已确认决策

- 首页采用故事书架，不再默认直接进入某篇小说。
- 点击故事封面后进入该故事的现有游玩界面。
- Studio 是同一 Web 产品内的创作者工作台，不做独立运营后台。
- Studio 首页只保留两个主入口：上传原文、导入案件包。
- 上传原文第一版支持 `.txt` / `.md`，后续再扩展 PDF / Word。
- 导入案件包继续支持 `case-package/v1` zip。
- 原文生成采用异步任务体验，界面类似下载并安装应用：拖拽上传、进度条、当前步骤、步骤列表。
- 生成结果进入案件审阅工作台。
- 审阅工作台采用左侧文件树、中间审阅区、右侧 agent 工作区。
- 修改采用评论模式：创作者选中具体内容添加多条批注，最后统一提交给改写 agent 生成修改。
- 确认发布后，第一版写入 `cases/<case-id>/`，进入故事书架；后续预留数据库 / 对象存储。
- 案件包支持自带封面图；没有封面图时使用统一模板封面。
- “用户从零创建故事设计、agent、线索、多幕剧情和最终指认”的完整创作流程进入 roadmap，暂不在第一版实现。

## 产品结构

```text
/
  故事书架

/cases/[caseId]
  单个故事游玩界面

/studio
  创作者工作台首页

/studio/jobs/[jobId]
  原文生成任务进度与生成后预览

/studio/cases/[draftCaseId]
  案件审阅、批注、改写、校验、发布工作台
```

第一版也可以把 `/studio/jobs/[jobId]` 和 `/studio/cases/[draftCaseId]` 合并为同一个页面的不同状态，但路由语义应按上述结构预留。

## 玩家故事书架

### 页面目标

让玩家明确当前有哪些可玩的故事，并以“选择一本推理小说”的心智进入体验，而不是直接落入某个案件。

### 展示内容

每个故事封面卡片展示：

- 封面图或模板封面；
- 案件标题；
- 原作标题 / 作者；
- 简介；
- 标签，例如本格、身份伪装、证词矛盾；
- 章节数；
- agent 数；
- 预计游玩时长；
- 难度；
- 当前进度，例如未开始、继续调查、已破解。

### 交互

- 点击封面进入 `/cases/[caseId]`。
- 已有本地进度时显示“继续调查”。
- 没有进度时显示“开始调查”。
- 右上角提供“创作者工作台”入口。

### 封面资源

案件包新增可选封面资源：

```text
assets/cover.*
```

manifest 或 case metadata 中预留：

```ts
cover?: {
  imagePath?: string;
  alt?: string;
  palette?: {
    background?: string;
    foreground?: string;
  };
}
```

没有封面图时，使用统一模板生成封面，模板至少包含标题、作者和案件标签。

## 创作者 Studio 首页

### 页面目标

Studio 首页不承载复杂信息，只让创作者选择下一步：

1. 上传原文。
2. 导入案件包。

### 页面结构

页面中心纵向排列两个大型按钮：

- `上传原文`
  - 副文案：支持 `.txt` / `.md`，系统会自动生成章节、agents、线索、幕门槛和最终指认。
- `导入案件包`
  - 副文案：上传 `case-package/v1` zip，校验后进入预览与发布流程。

不在 Studio 首页展示复杂任务列表、教程、表格或历史记录。后续如果需要草稿列表，可以作为页面下方的次级区域，而不是第一版核心。

## 上传原文弹窗

### 页面目标

让创作者理解“上传原文后，系统会执行一串生成步骤”，并清楚看到当前进度。

### 结构

弹窗包含：

- 标题：上传原文。
- 文件拖拽区：
  - 支持拖入 `.txt` / `.md`；
  - 支持点击选择文件；
  - 显示文件名、大小、语言识别结果。
- 生成进度条：
  - 百分比；
  - 当前任务状态；
  - 可诊断失败状态。
- 当前步骤说明。
- 步骤列表。

### 生成步骤

第一版任务步骤：

1. 解析文件与元数据。
2. 源文本分段：识别 `story-keep`、`investigation-hide`、`deduction-hide`、`solution-lock`、`bridge-rewrite`。
3. 构建公平推理主干。
4. 生成章节文本。
5. 生成 agent、知识边界、隐瞒、撒谎策略和揭示规则。
6. 生成线索、矛盾、场景、多幕推进和解锁条件。
7. 生成最终指认问题、答案、解释和证据支撑。
8. 组装 `case-package/v1`。
9. 运行校验并生成质量报告。
10. 进入案件审阅工作台。

### 错误处理

- 文件类型错误：提示仅支持 `.txt` / `.md`，保留后续 PDF / Word 扩展说明。
- 文件为空或过短：提示无法构建完整案件。
- 生成失败：展示失败步骤、错误摘要和重试按钮。
- 校验失败：仍可进入审阅工作台，但必须在发布前修复 fatal 问题。

## 导入案件包弹窗

### 页面目标

让创作者导入已有 `case-package/v1` zip，并在进入工作台前看到结构化校验结果。

### 展示内容

- 文件拖拽区；
- schema 版本；
- 标题；
- 章节数；
- agent 数；
- act 数；
- clue 数；
- contradiction 数；
- 最终指认问题数；
- fatal / warning / suggestion 统计；
- 校验问题列表。

### 交互

- fatal 问题存在时，不允许发布，但允许进入工作台审阅。
- 没有 fatal 问题时，可以进入工作台预览。
- 工作台内仍必须保留校验报告页。

## 案件审阅工作台

### 核心原则

审阅区不是漂亮预览，而是创作者的案件控制台。系统生成的一切剧情推进、agent 边界、线索解锁、真相条件都必须可见、可追溯、可批注。创作者需要知道一切细节。

工作台必须回答这些问题：

- 当前故事每章向玩家展示了什么？
- 哪些调查和推理内容被隐藏起来，留给玩家主动发现？
- 每个隐藏内容通过什么 scene、object、agent topic、clue、contradiction 或 act gate 被发现？
- 每个 agent 在不同章节 / act 中知道什么、能说什么、必须隐瞒什么、什么时候会松动？
- 玩家触发什么条件后推进到下一幕？
- 玩家触发什么条件后才能发现真相？
- 最终指认的每个答案由哪些事实、线索和矛盾支撑？
- 是否存在提前剧透、无支撑答案、孤儿线索、死路门槛或 agent 越权？

### 布局

工作台采用三栏：

```text
左侧文件树 | 中间审阅区 | 右侧 Agent 工作区
```

#### 左侧文件树

文件树按创作者理解案件的方式组织，而不是按物理文件组织。

建议结构：

```text
总览
  案件控制台
  公平推理图
  质量校验报告

故事章节
  chapter-1
  chapter-2
  chapter-3

Agents
  general
  <npc>

推理结构
  线索
  矛盾
  多幕推进
  信息传播
  最终指认
```

每个节点显示批注数量、fatal/warning 标记和未应用修改状态。

#### 中间审阅区

根据左侧选中节点显示不同 Inspector。所有 Inspector 都支持：

- 查看完整内容；
- 查看结构化字段；
- 查看关联元素；
- 进入评论模式；
- 选中文本或字段添加批注；
- 查看该模块历史版本和 diff；
- 应用或撤回 agent 修改。

#### 右侧 Agent 工作区

右侧始终绑定当前选中节点和选区上下文。

展示：

- 当前文件 / 模块；
- 当前选区；
- 已添加但未提交的批注；
- 与改写 agent 的对话；
- 提交批注并生成修改；
- 查看变更 diff；
- 应用修改；
- 放弃修改。

用户可以用自然语言补充修改意图，但第一版修改范围应由当前选中模块决定，不让 agent 自动跨全案乱改。

## 审阅区页面类型

### 案件控制台

展示全局掌控信息：

- 故事简介；
- 原作来源；
- 章节数、agent 数、线索数、矛盾数、最终问题数；
- 章节推进链；
- agent × act 约束矩阵；
- 真相发现路径；
- 关键可玩性风险；
- 校验摘要。

重点组件：

- **章节推进链**：展示每幕目标、玩家应发现内容、解锁条件、下一幕入口。
- **Agent × 章节约束矩阵**：展示每个 agent 在每幕能说什么、不能说什么、压力状态如何变化。
- **真相发现路径**：展示从初始证据到最终指认答案的链条。

### 章节页

展示：

- 章节全文；
- 章节标题、副标题；
- 所属 act；
- 该章节玩家可见事实；
- 从原文移除并转为交互的调查内容；
- 从原文移除并转为后期推理的内容；
- 连接文本 `bridge-rewrite`；
- 玩家在本章应该探索的内容；
- 可用 agents；
- 可调查 scenes / objects；
- 关联 clues、facts、contradictions；
- 通向下一章 / 下一幕的条件；
- 本章剧透风险。

章节页必须同时满足文学审稿和玩法审稿：

- 文学审稿关注是否像成熟小说，而不是剧情梗概。
- 玩法审稿关注是否把该隐藏的调查留给玩家。

### Agent 页

展示：

- 姓名、身份、角色类型；
- 人物简介；
- 说话风格；
- 情绪基线；
- 压力反应；
- 回避习惯；
- 与其他人的关系；
- public facts；
- private facts；
- beliefs；
- hides；
- liesAbout；
- forbiddenClaims；
- revealRules；
- pressureProfile；
- emotionalArc；
- confrontationTriggers；
- confessionBoundary；
- 每个 act 中的知识边界和话语边界。

Agent 页必须展示 **act 级约束**。同一个 NPC 在不同阶段可能可说内容不同，创作者必须能看清这种变化。

### 线索页

展示：

- clue id；
- 标题；
- 描述；
- 发现入口；
- 触发条件；
- 所属 act；
- 关联章节；
- 关联 scene / object；
- 关联 agent；
- 支撑 facts；
- 指向 contradictions；
- 是否 required discovery；
- 是否支撑最终指认答案。

### 矛盾页

展示：

- contradiction id；
- 矛盾描述；
- 需要比较的 facts / testimonies / clues；
- 玩家如何发现；
- 关联 agents；
- 关联 act gate；
- 是否必须发现；
- 支撑哪个最终问题。

### 多幕推进页

展示：

- 每个 act 的标题、目标和玩家信息状态；
- 可用 agents；
- 可调查 scenes / objects；
- visible clues；
- locked facts；
- exit conditions；
- act gate；
- requiredClueIds；
- requiredFactIds；
- requiredContradictionIds；
- requiredNpcInteractions；
- requiredSceneInteractions；
- unlockNarrative。

多幕推进页必须让创作者判断：玩家进入下一幕时是否真的完成了一个阶段性谜题，而不是只是翻到下一页。

### 信息传播页

展示：

- propagation rules；
- 哪个 agent 在什么条件下知道新信息；
- 玩家对质后哪些事实可以影响其他 agent；
- 哪些事实禁止传播；
- 信息传播是否可能造成提前剧透。

第一版如果 runtime 尚未完整支持传播，也应在工作台中预留页面，以便后续迭代。

### 最终指认页

展示：

- 每个最终问题；
- 标准答案；
- 可接受答案；
- 解释；
- 证据支撑；
- 对应 facts / clues / contradictions；
- 错误答案后的提示边界；
- 进入指认前建议掌握的信息；
- 是否存在无支撑答案。

最终指认页必须让创作者清楚：玩家为什么应该能答对，而不是系统凭空要求玩家猜中。

### 校验报告页

展示 fatal / warning / suggestion。

第一版至少覆盖：

- 缺失引用；
- 重复 id；
- 缺失 general agent；
- 孤儿线索；
- 无支撑最终答案；
- act gate 死路；
- agent 越权知道真相；
- reveal rule 引用不存在；
- private fact 被直接暴露；
- 普通章节中提前出现 solution-lock 内容；
- 案件包资源缺失；
- 封面资源引用无效。

## 评论模式

### 进入方式

用户在任意 Inspector 点击“进入评论模式”。

### 添加批注

用户可以：

- 选中文本段落添加批注；
- 选中字段添加批注；
- 选中矩阵单元格添加批注；
- 选中文件树节点添加批注。

批注内容包括：

```ts
type ReviewComment = {
  id: string;
  targetType:
    | "chapter"
    | "agent"
    | "clue"
    | "contradiction"
    | "act"
    | "actGate"
    | "accusation"
    | "validationIssue";
  targetId: string;
  fieldPath?: string;
  selectedText?: string;
  body: string;
  status: "draft" | "submitted" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
};
```

### 提交批注

用户可以一次提交当前模块的多条批注。提交后：

1. 批注和当前模块上下文进入右侧改写 agent。
2. agent 生成结构化修改建议。
3. 工作台展示 diff。
4. 用户选择应用或放弃。
5. 应用后重新运行局部校验。

第一版不做任意全案自动重写。跨模块修改必须显式提示用户会影响哪些模块。

## 改写 Agent 工作区

### 职责

右侧改写 agent 不是玩家游戏里的 NPC，而是创作者工具。它负责解释生成结果、响应批注、提出修改、生成 diff，并提醒可能破坏公平推理的影响。

### 输入上下文

每次提交修改时，传入：

- 当前案件 package；
- 当前选中模块；
- 相关引用模块；
- 当前批注列表；
- 用户补充说明；
- 校验报告；
- 不能破坏的规则，例如 schema、truth、fair play、no spoiler。

### 输出

第一版建议输出结构：

```ts
type StudioPatch = {
  summary: string;
  touchedTargets: Array<{
    targetType: ReviewComment["targetType"];
    targetId: string;
    fieldPath?: string;
  }>;
  changes: Array<{
    targetType: ReviewComment["targetType"];
    targetId: string;
    fieldPath: string;
    before: unknown;
    after: unknown;
    reason: string;
  }>;
  risks: string[];
  validationNotes: string[];
};
```

所有修改必须先进入 diff，不直接写入案件。

## 发布流程

发布前必须满足：

- 没有 fatal 校验问题；
- 案件包 schema 通过；
- 至少存在一个 general agent；
- 至少存在一个可玩章节；
- 最终指认问题都有证据支撑；
- 封面资源存在或可回退模板封面；
- 用户显式点击发布确认。

发布后：

- 案件写入 `cases/<case-id>/`；
- 书架页面出现新故事；
- 用户可以点击进入游玩界面；
- 本地 play state 按 `caseId` 隔离。

## 后端与数据流

### 原文生成

```text
上传 .txt/.md
→ 创建 StudioJob
→ 解析源文本
→ 调用 new-novels-case-adapter 流程
→ 生成 draft case package
→ 校验
→ 进入审阅工作台
```

第一版可以在本地开发环境中用伪队列或单进程任务实现，但 API 设计应保留任务状态：

```ts
type StudioJob = {
  id: string;
  type: "source-to-case" | "package-import";
  status: "queued" | "running" | "failed" | "ready";
  progress: number;
  currentStep: string;
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "running" | "done" | "failed";
    message?: string;
  }>;
  draftCaseId?: string;
  error?: string;
};
```

### 案件包导入

```text
上传 zip
→ 读取并规范化单根目录
→ loadCasePackageFromFiles
→ validate
→ 生成 draft preview
→ 进入审阅工作台
```

### 审阅与修改

```text
用户选择文件树节点
→ 前端加载对应 Inspector 数据
→ 用户添加批注
→ 提交到 Studio Patch API
→ 改写 agent 生成 StudioPatch
→ 展示 diff
→ 用户应用 patch
→ 重新校验
```

## API 草案

第一版可以设计为：

- `GET /api/cases`
  - 返回书架可用案件列表。
- `GET /api/cases/[caseId]`
  - 返回单个案件的游玩数据。
- `POST /api/studio/source-jobs`
  - 上传 `.txt` / `.md`，创建原文生成任务。
- `GET /api/studio/jobs/[jobId]`
  - 查询生成任务状态。
- `POST /api/studio/packages/preview`
  - 上传 `case-package/v1` zip 并生成 draft 预览。
- `GET /api/studio/drafts/[draftCaseId]`
  - 获取 draft 案件包和审阅视图数据。
- `POST /api/studio/drafts/[draftCaseId]/comments`
  - 添加或提交批注。
- `POST /api/studio/drafts/[draftCaseId]/patches`
  - 请求改写 agent 根据批注生成 patch。
- `POST /api/studio/drafts/[draftCaseId]/patches/[patchId]/apply`
  - 应用 patch。
- `POST /api/studio/drafts/[draftCaseId]/publish`
  - 校验并发布到书架。

## 第一版非目标

- 不做从零创建故事的完整可视化编辑器。
- 不做账号、权限、团队协作和审核流。
- 不做 PDF / Word 高质量解析。
- 不做多人实时批注。
- 不做公开故事市场或社区发布。
- 不让改写 agent 自动跨全案修改，除非用户明确选择全案修改。

## 测试策略

### 数据与 API

- 案件列表返回所有内置案件。
- 案件封面缺失时回退模板。
- 上传非法文件返回可读错误。
- `case-package/v1` zip 预览沿用现有校验逻辑。
- fatal 问题阻止发布。
- 发布后案件可被 CaseLoader 读取。
- draft 与已发布案件互不污染。

### 工作台

- Studio 首页只展示两个主入口。
- 上传弹窗显示拖拽区、进度条、当前步骤和步骤列表。
- 导入弹窗显示校验摘要。
- 文件树切换后中间 Inspector 更新。
- 章节 Inspector 展示全文、隐藏调查点和推进条件。
- Agent Inspector 展示 act 级约束。
- 最终指认 Inspector 展示答案与证据支撑。
- 评论模式可添加多条批注。
- 提交批注后右侧 agent 工作区展示 patch / diff。
- 应用 patch 后重新校验。

### 浏览器验证

- 桌面端三栏工作台可用，文字不重叠。
- 移动端第一版可以降级为顶部文件选择 + 内容区 + agent 抽屉，不强求完整三栏。
- 书架封面卡片点击进入对应故事。
- 发布后的案件出现在书架。

## Roadmap 更新要求

实现本方案时同步更新 `roadmap.md`：

- 把“故事书架首页”列入近期迭代。
- 把“Studio 上传原文生成案件”列入近期迭代。
- 把“评论模式审阅工作台”列入核心创作者体验。
- 把“用户从零设计故事、agent、线索、多幕剧情、最终指认”的完整创作流程列为后续阶段。
- 把“数据库 / 对象存储版本的动态案件库”列为 CoWork 平台发布后的平台化阶段。

## 自检

- 没有把 Studio 首页设计成复杂后台；复杂度集中到审阅工作台。
- 没有把审阅区设计成只读预览；它明确承担案件控制台职责。
- 没有让 agent 修改直接写入案件；所有修改必须先生成 diff 并由用户应用。
- 没有把第一版范围扩大到账号权限、完整 CMS 或从零创作。
- 保留了当前 `case-package/v1` 和 `cases/<case-id>/` 文件系统架构。
