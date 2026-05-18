# New Novels 产品路线图

本文档记录 New Novels 当前的产品方向、已完成能力、暂缓事项和后续迭代计划。它不是日期承诺，而是后续讨论和开发的共同地图。

## 一、产品北极星

New Novels 要做的是一个 **文字优先的沉浸式推理体验**。

传统推理小说让读者跟随作者铺好的叙事线索前进；New Novels 希望让玩家在小说文本中停下来，主动询问、调查、记录、对质，并靠自己的推理完成最终指认。

玩家应该能够：

- 像读中短篇推理小说一样阅读故事。
- 自由向现场、物证和 NPC 发问。
- 通过对话、调查和前后矛盾发现线索。
- 用侦探笔记记录自己的判断，而不是被系统替他整理答案。
- 在信息足够后进入最终指认，并由结构化答案公平判定是否破案。

创作者未来应该能够：

- 上传或导入一篇推理小说。
- 借助 AI 将小说改写为结构化互动案件。
- 定义 NPC 的知识、性格、动机、隐瞒、撒谎边界和揭示规则。
- 生成符合规范的案件包，并直接在 New Novels 中运行。

## 二、当前已完成

### 1. 可运行的单案原型

已完成基于 G. K. Chesterton《The Hammer of God》的第一版验证案件“钟楼下的锤击案”。

当前原型包含：

- Next.js Web 应用。
- 左侧故事阅读区。
- 右侧调查台。
- 可展开/收起的侦探笔记。
- 标签化笔记：线索、证词、疑点、矛盾。
- 最终指认页面。
- 本地浏览器状态保存。
- 重新开始确认弹窗。
- 移动端故事 / 调查 / 笔记底部 Tab。

### 2. 文字阅读与交互布局

已确定当前网页设计雏形：

- 主体采用故事栏 + 调查台双栏结构。
- 故事栏只负责小说文本，不放提示按钮或系统引导。
- 调查台由通用调查助手和多个 NPC 对话模块组成。
- 用户只使用一个全局输入框提问，系统自动路由到对应模块。
- 侦探笔记通过右上角轻量入口唤起，而不是常驻占位。
- 笔记展开后作为第三工作区参与布局。

Pretext 已作为文本布局方向引入到阅读体验中：

- 一章内容默认作为一页上下滚动。
- 章节底部提供前一章 / 后一章按钮。
- 阅读过程中点击故事区可临时浮现章节跳转控件。

### 3. Agent Runtime v1

已完成第一版 Agent Runtime 内核，当前它不是玩家可见的角色，而是管理所有 agent 的运行时系统。

已完成能力：

- `AgentRegistry`：根据案件配置注册通用 agent 和 NPC。
- `AgentRouter`：根据别名和语义路由结果定位目标 agent。
- `RuntimeContext`：为每次回答生成 allowed facts、hidden facts、private facts。
- `pressureLevel`：记录 NPC 被追问和对质后的压力变化。
- `lastTopics`：记录最近被追问的话题。
- `mood`：记录 NPC 当前状态，例如 calm、guarded、cornered。
- `evaluateRevealRules`：根据线索、话题、压力和剧情幕判断可揭示事实。
- `validateAgentOutput`：阻止模型输出未允许事实、隐藏真相或编造证据。
- `PlayerKnowledgeGraph`：以结构化方式表达玩家已知事实、线索、证词、矛盾和假设。
- `AgentRelationship`：记录 NPC 之间的关系态度。
- `parseAgentResponseContract`：支持模型返回结构化响应，同时兼容普通文本回答。

### 4. Case Schema 升级

案件结构已从简单 `storyText + agents + clues` 升级为更完整的结构化 schema。

当前 `caseSchema` 已支持：

- `facts`：事实账本。
- `chapters`：章节。
- `acts`：剧情幕。
- `scenes`：场景。
- `agents`：通用 agent 和 NPC。
- `permissions`：agent 权限。
- `aliases`：agent 别名。
- `lieStrategy`：撒谎和回避策略。
- `revealRules`：升级版揭示规则。
- `relationships`：NPC 关系图。
- `propagationRules`：信息传播规则。
- `contradictions`：结构化矛盾。
- `PlayerKnowledgeState`：当前幕、已发现线索、已发现事实、证词、矛盾、逼问对象、问题历史和玩家假设。

### 5. Case Package v1 雏形

已新增 `case-package/v1` 的代码级契约。

当前包含：

- `casePackageManifestSchema`
- `casePackageSchema`
- `hammerOfGodPackage`

这为未来“上传一个符合规范的 zip 包并解析成案件”打下基础。

### 6. 最终指认

当前最终指认是确定性校验，不依赖模型自由判断。

当前流程：

- 中间显示一个简洁对话框。
- 系统逐题询问关键问题。
- 用户答错任意一题后，弹出提示并返回主页面继续调查。
- 失败后清空本次指认历史。
- 全部答对后显示“真相大白”，游戏结束。

### 7. 工程与发布准备

已完成：

- `AGENTS.md` 开发规范。
- `readme.md` 项目介绍。
- `design.md` 设计方向文档。
- CoWork Guard 子应用规范调研与发布副本打包验证。
- 测试覆盖扩展到 Agent Runtime 和 Case Package。

当前验证基线：

- `npm test`：15 个测试文件，72 个测试通过。
- `npm run lint`：通过。
- `npm run build`：通过。

## 三、当前判断：暂缓或不需要优先做的事

这些方向不是永久不做，而是当前阶段不应该优先投入。

### 1. 不做重视觉游戏化

当前产品核心不是 2D/3D 场景、角色立绘或复杂地图，而是文字、推理和 AI NPC 交互。过早做视觉游戏化会稀释核心验证。

### 2. 暂缓大型创作者后台

现在应先定义稳定的案件包规范和解析流程。完整创作者后台、可视化编辑器、权限管理、发布审核等平台能力后置。

### 3. 暂缓真正外部 subagent 进程化

当前 NPC 应继续作为 Runtime 管理的 `AgentSession` 存在，而不是每个 NPC 都启动外部独立 agent 服务。这样更易测试、更可控，也方便未来替换为平台 subagent。

### 4. 暂缓自动判断“关键笔记”

系统目前无法可靠判断玩家哪条笔记是关键推理。侦探笔记应继续由玩家主动记录和打标签，避免系统过度指导。

### 5. 暂缓多案件平台化

在第一个案件没有证明体验足够吸引推理读者前，不应急着做公开案件库、社区分享、推荐系统或复杂账号体系。

### 6. 暂缓过度使用 Pretext

Pretext 适合用于文本测量、阅读体验和长文本布局优化，但不应把所有 UI 控件都改造成复杂文本排版系统。当前应保持 DOM 可访问性和交互稳定。

## 四、下一阶段路线图

## Phase 1：案件包规范落地

目标：让案件内容从硬编码 TS 文件迁移为可导入、可验证、可复用的文件系统。

计划：

- 定义正式的 `Case Package v1` 文件结构：
  - `manifest.json`
  - `case.json`
  - `story/chapters.json`
  - `story/*.md`
  - `agents/*.json`
  - `clues/clues.json`
  - `accusation/questions.json`
  - `assets/`
- 将“钟楼下的锤击案”迁移到 `cases/hammer-of-god/`。
- 新增 `CaseLoader`：
  - 从本地目录加载案件。
  - 从 zip 解包后的目录加载案件。
  - 校验 schema。
  - 生成前端运行所需的 `CaseFile`。
- 新增案件导入校验报告：
  - 缺少文件。
  - 重复 id。
  - reveal rule 引用不存在的 clue/fact。
  - 指认题没有覆盖关键真相。
  - agent 缺少 personality / boundaries / permissions。

成功标准：

- 当前案件不再依赖 `lib/case/hammer-of-god.ts` 手写大对象。
- 修改案件内容不需要改应用代码。
- 任意符合规范的本地案件目录可以被解析和验证。

## Phase 2：Agent Runtime v2

目标：让 NPC 的审问体验真正随着玩家掌握的信息变化。

计划：

- 将 `AgentSession` 从单次请求临时状态升级为可持久状态。
- 在玩家提问后更新：
  - `pressureLevel`
  - `lastTopics`
  - `revealedFactIds`
  - `mood`
  - `confrontedAgentIds`
- 让模型结构化返回：
  - `reply`
  - `revealedFactIds`
  - `suggestedClueIds`
  - `emotionalState`
  - `confidence`
- 将 `revealedFactIds` 同步进玩家状态。
- 根据 `suggestedClueIds` 支持可选的线索发现提示，但不自动替玩家记关键笔记。
- 增强 `validateAgentOutput`：
  - 检查输出是否包含未允许 fact。
  - 检查是否泄露 truth fact。
  - 检查是否编造不在 schema 中的证物。
  - 检查是否跨 NPC 泄露私有事实。
- 增加 retry / repair 策略：
  - 第一次越界时重试。
  - 第二次仍失败时返回安全兜底。

成功标准：

- 玩家连续逼问同一矛盾时，NPC 的语气和可透露内容会变化。
- NPC 不会说出其他角色私有事实。
- 通用调查助手只基于玩家已解锁信息回答。
- 每次回答为什么被允许，都可以追溯到 fact / clue / reveal rule。

## Phase 3：多幕剧情与场景推进

目标：让案件从静态开场发展为多阶段推理故事。

计划：

- 完善 `acts`：
  - 每一幕可用 NPC。
  - 每一幕可见场景。
  - 每一幕可发现线索。
  - 每一幕 forbidden facts。
  - 进入和退出条件。
- 完善 `scenes`：
  - 地点。
  - 可观察事实。
  - 可调查物件。
  - 场景氛围文本。
- 支持故事栏动态追加或解锁章节。
- 支持“继续故事”动作，但不能破坏故事栏的纯阅读体验。
- NPC context 随 act 改变：
  - 第一幕回避。
  - 第二幕紧张。
  - 第三幕被逼入角落。

成功标准：

- 玩家感觉案件在推进，而不是一直停留在案发现场聊天。
- 新剧情幕的触发条件清晰、公平、可测试。
- NPC 回答会随剧情阶段自然变化。

## Phase 4：小说改写 Skill

目标：开发专门用于把现成推理小说改写为 New Novels 案件包的 skill。

计划：

- 定义 skill 输入：
  - 原始小说文本。
  - 版权/来源说明。
  - 目标语言。
  - 改写粒度。
  - 玩家可调查范围。
- 定义 skill 输出：
  - `case-package.zip`
  - `validation-report.json`
  - 改写说明。
- 让 skill 生成：
  - 章节正文。
  - agent 文件。
  - fact ledger。
  - clues。
  - contradictions。
  - reveal rules。
  - accusation questions。
- 增加自动质量检查：
  - 是否提前剧透。
  - 是否有孤立线索。
  - 是否缺少最终指认覆盖。
  - NPC 是否知道了不该知道的信息。

成功标准：

- 给定一篇短篇推理小说，可以产出结构完整、可校验的案件包。
- skill 生成的内容不需要人工改代码即可运行。
- 人工主要负责审校推理公平性和文学表达。

## Phase 5：案件导入与预览

目标：让用户上传符合规范的 zip 包，并在本项目中预览运行。

计划：

- 新增上传入口。
- 解压 zip 后执行 `CaseLoader`。
- 展示导入校验报告。
- 校验通过后进入预览。
- 校验失败时明确指出错误路径和修复建议。
- 保留当前内置案件作为默认示例。

成功标准：

- 用户可以上传符合规范的案件包并直接进入游戏。
- 用户可以看到导入失败的具体原因。
- 内置案件和外部案件走同一套 runtime。

## Phase 6：推理体验打磨

目标：让推理小说读者觉得“这是我自己破出来的”，而不是被系统带着答题。

计划：

- 优化调查台信息密度。
- 优化笔记创建、编辑、筛选和删除确认。
- 增强矛盾识别：
  - 玩家指出矛盾。
  - Runtime 判断是否成立。
  - NPC 根据压力和规则反应。
- 支持玩家假设：
  - 玩家可以写下推理假设。
  - 通用调查助手只给非剧透反馈。
- 优化最终真相揭示：
  - 答对后逐步展开真相。
  - 对照玩家发现过的线索解释推理链。

成功标准：

- 玩家不看攻略也能形成推理路径。
- 玩家不会觉得系统直接喂答案。
- 指认成功时有“原来如此”的闭环。

## Phase 7：发布与平台适配

目标：稳定部署到 CoWork / Guard 平台，并保持本地开发与平台运行一致。

计划：

- 将 Guard 发布副本中的平台适配沉淀回主工程：
  - `install.sh`
  - `start.sh`
  - `health.sh`
  - Next standalone 配置。
  - 平台 AI API 适配。
- 明确本地开发 AI provider 与平台运行 AI provider 的切换方式。
- 增加平台发布自检脚本。
- 确保压缩包不包含凭据、`.env`、顶层 `node_modules` 或开发缓存。

成功标准：

- 主工程可以直接生成平台可运行 zip。
- 本地测试、build、平台健康检查流程一致。
- 平台 AI 接口接入不会污染本地开发体验。

## 五、接下来最建议的三步

### 第一步：Case Package v1 落地

这是最优先的下一步。原因是后续小说改写 skill、案件上传、动态多案件都依赖它。

建议实现：

- `cases/hammer-of-god/`
- `CaseLoader`
- 本地目录加载测试。
- schema 错误报告。

### 第二步：Agent Runtime v2 状态持久化

当前 runtime 已有核心模型，但 session 仍主要是单次请求里的临时结构。下一步应该让 NPC 压力、已揭示事实、最后话题真正进入玩家状态。

建议实现：

- `AgentSessionState`
- 前端 play state 持久化 agent sessions。
- API 接收和返回 session patch。
- 结构化模型响应更新玩家状态。

### 第三步：多幕最小闭环

不要一次做完整长篇，先做“钟楼下的锤击案”的两到三幕闭环。

建议实现：

- 第一幕：案发现场。
- 第二幕：证词矛盾。
- 第三幕：最终指认前的逼问。
- 每幕只增加少量可测试 fact 和 reveal rule。

## 六、主要风险

- AI 仍可能编造事实，需要继续强化 output guard 和重试策略。
- 自由对话可能让玩家错过必要线索，需要设计非剧透提示。
- 过多系统辅助会让游戏像答题器，过少辅助又会像无结构聊天。
- Case Package 规范如果过早复杂化，会拖慢第一个完整案件验证。
- 小说改写 skill 可能生成“形式正确但推理不公平”的案件，需要专门 linter 和人工审校。
- 平台发布适配和本地开发环境需要分层，否则会互相污染。

## 七、当前原则

- 先把一个案件做到好玩，再做多案件平台。
- 先让 NPC 在规则内自由对话，再追求复杂 subagent 形态。
- 先让内容包规范稳定，再做创作者后台。
- 先保护公平推理，再增强戏剧性。
- 任何 AI 输出都不能成为事实源；事实源只能来自 case schema 和玩家状态。
