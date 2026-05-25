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

### 3. Agent Runtime v2

已完成第一版 Agent Runtime 内核，当前它不是玩家可见的角色，而是管理所有 agent 的运行时系统。

已完成能力：

- `AgentRegistry`：根据案件配置注册通用 agent 和 NPC。
- `AgentRouter`：根据别名和语义路由结果定位目标 agent。
- `RuntimeContext`：为每次回答生成 allowed facts、hidden facts、private facts。
- `pressureLevel`：记录 NPC 被追问和对质后的压力变化。
- `lastTopics`：记录已被追问的话题。
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

### 5. Case Package v1 文件系统落地

已新增 `case-package/v1` 的代码级契约，并完成第一版文件系统案件包落地。

当前包含：

- `casePackageManifestSchema`
- `casePackageSchema`
- `hammerOfGodPackage`
- `cases/hammer-of-god/` 示例案件目录。
- `manifest.json`、`case.json`、`story/*.md`、`agents/*.json`、`acts/gates.json`、`truth/truth.json` 等拆分文件。
- `CaseLoader`：从本地目录读取 split package，并组装为 `CaseFile`。
- `validateCasePackageDirectory`：输出统一校验报告，包含错误级别、文件路径、字段路径、原因和修复建议。

上传 zip 后的产品化导入预览已完成第一版；仍未完成的是将上传包激活为当前可玩案件。

### 6. 小说改写 Skill

已新增 `skills/new-novels-case-adapter/`，用于把推理小说改写为 New Novels 案件包。

当前已经覆盖：

- 小说内容 ingest。
- 推理主干提取。
- 章节、事实账本、线索、NPC、揭示规则、多幕结构、最终指认的生成流程。
- `case-package/v1` 参考文档。
- `novel-to-case-workflow` 工作流文档。
- `check_case_package_refs.mjs` 引用完整性校验脚本，支持 package JSON、package directory 和 zip。
- NPC `pressureProfile`、`emotionalArc`、`confrontationTriggers`、`confessionBoundary`、`styleAnchors` 输出要求。
- `ActGate`、required discoveries、scene goals 和 package assembly 流程。

当前还需要完善：

- 将 skill 生成流程从文档规范升级为可执行脚本或半自动工作流。
- 增加更强的“推理公平性”和“多幕节奏”质量 linter。
- 让 skill 直接产出 validation report 和人工审校说明。

### 7. 最终指认

当前最终指认是确定性校验，不依赖模型自由判断。

当前流程：

- 中间显示一个简洁对话框。
- 系统逐题询问关键问题。
- 用户答错任意一题后，弹出提示并返回主页面继续调查。
- 失败后清空本次指认历史。
- 全部答对后显示“真相大白”、真凶、手法、动机和关键证据，游戏结束。

### 8. 工程与发布准备

已完成：

- `agents.md` 开发规范。
- `readme.md` 项目介绍。
- `design.md` 设计方向文档。
- CoWork Guard 子应用规范调研、平台脚本、健康检查、standalone 配置、AI provider 适配与发布 zip 打包验证。
- 测试覆盖扩展到 Agent Runtime 和 Case Package。

当前验证基线：

- `npm test`：21 个测试文件，92 个测试通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- `npm run guard:package`：通过，生成 `dist/new-novels-guard.zip`。
- `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org`：高危审计通过，仍有 npm 报告的 PostCSS moderate 链路；`npm audit fix --force` 会错误降级 Next 到 9.x，暂不执行。

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

## 四、下一内容验证候选

下一阶段建议用一个新的著名短篇推理小说验证完整核心体验，而不是继续只打磨《The Hammer of God》。

优先候选：

- Agatha Christie 的 **“The Mystery of Hunter's Lodge”**。
- 推荐原因：
  - 篇幅适合短周期拆包。
  - NPC 关系和证词结构清晰，适合验证 agent context、知识边界、隐瞒和压力规则。
  - 核心谜题围绕身份、证词、现场和时间线矛盾，适合验证自由提问、笔记、矛盾识别和最终指认。
  - 可以自然拆成命案现场、人物询问、证词矛盾、最终指认等多幕结构。
- 使用前提：
  - 用户提供原文文本。
  - 正式发布前确认目标发布地区的版权状态。
  - 先作为 `new-novels-case-adapter` 的内容拆分样例，不立即替换内置默认案件。

备选候选：

- Agatha Christie 的 **“The Tragedy at Marsdon Manor”**：更适合测试心理欺骗和动机推理。
- Agatha Christie 的 **“The Adventure of the Egyptian Tomb”**：更适合测试氛围叙事和“诅咒 vs 理性调查”的反差。

## 五、下一阶段路线图

## Phase 1：Case Package 文件系统落地

目标：把已经存在的 `case-package/v1` 代码契约，真正落地为可导入、可验证、可复用的文件系统案件包。

当前判断：

- `casePackageSchema`、文件系统结构、示例目录和本地目录 loader 已完成第一版。
- `new-novels-case-adapter` skill 已更新为输出 split package，并提供目录校验脚本。
- 默认运行案件已切换为从 `cases/hammer-of-god/` 加载。
- zip 上传预览已落地。还没落地的是 **通过上传包切换当前可玩案件** 和更完整的质量报告 UI。

已完成：

- 定义正式的 `Case Package v1` 文件结构：
  - `manifest.json`
  - `case.json`
  - `story/chapters.json`
  - `story/*.md`
  - `agents/global-context.json`
  - `agents/<agent-id>.json`
  - `facts/facts.json`
  - `acts/acts.json`
  - `acts/gates.json`
  - `scenes/scenes.json`
  - `clues/clues.json`
  - `relationships/relationships.json`
  - `propagation/rules.json`
  - `contradictions/contradictions.json`
  - `truth/truth.json`
  - `victims/victims.json`
  - `accusation/questions.json`
  - `assets/`
- 将“钟楼下的锤击案”迁移到 `cases/hammer-of-god/`。
- 新增 `CaseLoader`：
  - 从本地目录加载案件。
  - 从 zip 解包后的目录加载案件的底层能力。
  - 校验 schema。
  - 生成前端运行所需的 `CaseFile`。
- 新增案件目录校验报告：
  - 缺少文件。
  - 重复 id。
  - reveal rule 引用不存在的 clue/fact。
- 新增 skill 校验脚本：
  - 支持 package JSON。
  - 支持 package directory。
  - 支持 package zip。
  - 检查 ActGate、pressureProfile、revealRules、relationships、contradictions 等引用。
- 新增 `POST /api/cases/preview`：
  - 支持 multipart zip 上传。
  - 支持单顶层目录 zip 自动归一。
  - 返回 manifest、案件摘要和结构化 issues。
- 新增页面工具栏中的“导入案件包”预览入口。

下一步：

- 将预览通过的外部案件切换为当前运行案件。
- 增加更完整的导入质量报告 UI，展示 fatal error、warning、quality suggestion。
- 增加指认题是否覆盖关键真相、agent 是否缺少 personality / boundaries / permissions 的更细质量检查。

成功标准：

- 任意符合规范的本地案件目录可以被解析和验证。已完成。
- 符合规范的 zip 可以被 API 与前端预览。已完成第一版。
- `new-novels-case-adapter` skill 生成的目录可以直接被 `CaseLoader` 加载。已完成第一版。
- 前端和 API 的默认运行案件不再直接依赖 `lib/case/hammer-of-god.ts` 手写大对象。已完成。
- 修改 `cases/hammer-of-god/` 中的案件内容不需要改应用代码。已完成第一版。

## Phase 2：Skill 与 Agent Runtime v2 联合设计

目标：让 NPC 的审问体验不再依赖固定默认模型，而是由 skill 在适配小说时生成角色专属的压力模型、性格参数和揭示节奏，再由 Agent Runtime v2 执行。

核心原则：

- Runtime 提供通用机制。
- Skill 根据小说内容生成具体配置。
- NPC 的压力阈值、回避方式、撒谎策略、破防条件不能写死在 Runtime 中。
- 同一个 Runtime 应该能运行不同案件中性格完全不同的 NPC。

已完成第一版：

- 扩展 NPC runtime 配置：
  - `pressureProfile`：压力增长方式、初始防御程度、破防阈值。
  - `emotionalArc`：从平静到防御再到慌乱的阶段变化。
  - `confrontationTriggers`：哪些话题、线索、矛盾会增加压力。
  - `confessionBoundary`：即使压力很高也不能直接承认的内容。
  - `styleAnchors`：少量角色语气样例。
- 更新 `new-novels-case-adapter` skill：
  - 从原小说中提取每个 NPC 的性格、动机、社会姿态和压力反应。
  - 为每个 NPC 生成差异化 `pressureProfile`。
  - 为每个 NPC 生成差异化 `lieStrategy` 和 `evasiveHabits`。
  - 生成 act-specific NPC context。
- 在玩家提问后更新：
  - `pressureLevel`
  - `lastTopics`
  - `revealedFactIds`
  - `mood`
  - `confrontedAgentIds`
  - `triggeredPressureRules`
  - `currentActAgentState`
- 支持模型结构化返回：
  - `reply`
  - `revealedFactIds`
  - `suggestedClueIds`
  - `revealedContradictionIds`
  - `sceneInteractionIds`
  - `emotionalState`
  - `confidence`
- 让 Runtime 根据 skill 生成的 pressure/reveal 配置判断：
  - 当前 NPC 是否只是回避。
  - 是否允许部分透露。
  - 是否应该被激怒。
  - 是否应该进入下一阶段证词。
- 将 `revealedFactIds` 同步进玩家状态。
- 根据 `suggestedClueIds` 支持可选的线索发现提示，但不自动替玩家记关键笔记。
- 将 `AgentSession` 接入前端 play state，API 接收当前 session 并返回更新后的 session 与 playerState。
- 调查台可以展示 NPC 对玩家可见的状态变化，例如“状态：谨慎”。
- 增强 `validateAgentOutput`：
  - 检查输出是否包含未允许 fact。
  - 检查是否泄露 truth fact。
  - 检查是否编造不在 schema 中的证物。

下一步：

- 检查是否跨 NPC 泄露私有事实。
- 增加 retry / repair 策略：
  - 第一次越界时重试。
  - 第二次仍失败时返回安全兜底。

成功标准：

- 玩家连续逼问同一矛盾时，NPC 的语气和可透露内容会变化。
- NPC 不会说出其他角色私有事实。
- 通用调查助手只基于玩家已解锁信息回答。
- 每次回答为什么被允许，都可以追溯到 fact / clue / reveal rule。
- 不同案件的 NPC 可以有不同压力模型，而不是共享固定阈值。
- Skill 生成的 NPC 配置可以被 Runtime 直接执行。

## Phase 3：剧本杀式多幕剧情

目标：让案件从静态开场发展为类似剧本杀的多幕推理结构。每一幕都应有明确调查目标、关键触发条件和下一幕解锁门槛，强化玩家在过程中的解谜体验。

核心难点：

- 小说原文通常是线性叙事，不天然等于可玩的多幕结构。
- 多幕划分不能只是按章节平均切分，而要按“玩家可调查的信息状态”划分。
- 每一幕都需要控制玩家能知道什么、能问谁、能调查哪里、必须触发什么剧情。
- 幕与幕之间的解锁条件必须公平，不能要求玩家猜隐藏按钮或触发任意关键词。

已完成第一版：

- 完善 `acts`：
  - 每一幕可用 NPC。
  - 每一幕可发现线索。
  - 每一幕 forbidden facts。
- 完善 `scenes`：
  - 地点。
  - 可观察事实。
  - 可调查物件。
  - 场景氛围文本。
- 新增 `ActGate`：
  - `requiredClueIds`
  - `requiredFactIds`
  - `requiredContradictionIds`
  - `requiredNpcInteractions`
  - `requiredSceneInteractions`
  - `unlockNarrative`
- 为“钟楼下的锤击案”建立三幕最小结构：
  - `act-opening`
  - `act-testimony`
  - `act-confrontation`
- 新增 `evaluateActGates`，根据玩家已知状态、NPC 交互和场景交互判断下一幕是否解锁。
- `/api/investigate` 会在结构化响应更新玩家状态后评估 ActGate。
- 前端在 ActGate 满足后合并状态、切换到下一章，并在通用调查助手模块展示非剧透解锁叙事。
- 更新 skill 的多幕设计流程：
  - 从小说中识别“信息释放节点”。
  - 把原文拆成 opening、investigation、confrontation、resolution 等可玩阶段。
  - 为每一幕生成目标、可调查场景、可问 NPC、关键线索和退出条件。

下一步：

- 增加“接近解锁下一幕”的非剧透提示，但不能直接给答案。
- 支持更细的章节锁定/解锁 UI，而不是只切换当前章节。
- NPC context 随 act 改变：
  - 第一幕回避。
  - 第二幕紧张。
  - 第三幕被逼入角落。

成功标准：

- 玩家感觉案件在推进，而不是一直停留在案发现场聊天。
- 新剧情幕的触发条件清晰、公平、可测试。
- NPC 回答会随剧情阶段自然变化。
- 每一幕都至少有一个必须完成的推理目标。
- 玩家进入下一幕时能感觉到“我解开了一个阶段性谜题”。

## Phase 4：小说改写 Skill 完善

目标：把当前 `new-novels-case-adapter` 从雏形完善为可稳定产出案件包的内容生产工具。

当前判断：

- Skill 的大方向是对的，已经覆盖案件包主要字段。
- 下一步重点不是再写更多泛泛规则，而是让它输出 Runtime 真正需要的动态行为配置和多幕结构。

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
  - NPC `pressureProfile`。
  - NPC `emotionalArc`。
  - NPC act-specific context。
  - act gates。
  - scene goals。
  - required discoveries。
- 增加自动质量检查：
  - 是否提前剧透。
  - 是否有孤立线索。
  - 是否缺少最终指认覆盖。
  - NPC 是否知道了不该知道的信息。
  - 每一幕是否有清晰目标。
  - 每一幕是否有可验证退出条件。
  - NPC 压力模型是否引用了不存在的 clue/fact/topic。
  - 多幕结构是否把最终真相过早暴露。

已完成第一版：

- `check_case_package_refs.mjs` 支持 package JSON、目录和 zip。
- 校验脚本检查 NPC 压力规则、情绪弧线、风格锚点、非最终幕 ActGate 和最终指认题数量。

成功标准：

- 给定一篇短篇推理小说，可以产出结构完整、可校验的案件包。
- skill 生成的内容不需要人工改代码即可运行。
- 人工主要负责审校推理公平性和文学表达。
- Skill 输出的 NPC 行为配置可以被 Agent Runtime v2 直接执行。
- Skill 输出的多幕结构可以被 ActGate 校验。

## Phase 5：案件导入与预览

目标：让用户上传符合规范的 zip 包，并在本项目中预览运行。

已完成第一版：

- 新增工具栏上传入口。
- 解压 zip 后执行 `CaseLoader` 底层能力。
- `POST /api/cases/preview` 返回导入校验报告和案件摘要。
- 校验失败时明确指出错误路径和修复建议。
- 保留当前内置案件作为默认示例。

下一步：

- 校验通过后将上传案件激活为当前可玩 runtime。
- 增加导入报告的 warning / suggestion 分层展示。
- 增加多案件本地选择状态，仍不做公开案件库。

成功标准：

- 用户可以上传符合规范的案件包并看到预览摘要。已完成。
- 用户可以看到导入失败的具体原因。已完成。
- 用户可以直接进入上传案件游戏。下一步。
- 内置案件和外部案件走同一套 runtime。

## Phase 6：推理体验打磨

目标：让推理小说读者觉得“这是我自己破出来的”，而不是被系统带着答题。

计划：

- 优化调查台信息密度。
- 优化笔记创建、编辑、筛选和删除确认。
- 增强矛盾识别：
  - 模型结构化返回可以记录已知矛盾。
  - 玩家指出矛盾后，Runtime 判断是否成立。
  - NPC 根据压力和规则反应。
- 支持玩家假设：
  - 玩家可以写下推理假设。已完成。
  - 通用调查助手只给非剧透反馈。下一步。
- 优化最终真相揭示：
  - 答对后展示真相摘要。已完成第一版。
  - 对照玩家发现过的线索解释推理链。

成功标准：

- 玩家不看攻略也能形成推理路径。
- 玩家不会觉得系统直接喂答案。
- 指认成功时有“原来如此”的闭环。

## Phase 7：发布与平台适配

目标：稳定部署到 CoWork / Guard 平台，并保持本地开发与平台运行一致。

当前判断：

- 第一版平台适配已经沉淀回主工程。
- 后续重点是实际在 CoWork/Guard 平台发布后验证路径、AI 配置和健康检查。

已完成第一版：

- `install.sh`
- `start.sh`
- `health.sh`
- `/health`
- `/api/healthz`
- Next standalone 配置。
- 平台 AI API 适配：
  - 读取 `ai.properties` 或 `APP_AI_*`。
  - 调用 Runway Bedrock InvokeModel。
  - 使用 `token` / `api-key` header。
  - 使用 Anthropic Messages body，不传 model 和 temperature。
- `npm run guard:package` 生成平台 zip。
- 压缩包不包含顶层 `node_modules`，包含 standalone 运行产物。

下一步：

- 在 CoWork/Guard 平台真实发布后验证：
  - prefix 下首页、API、静态资源。
  - `ai.properties` 注入路径。
  - `/health` 生命周期检查。
  - `/api/healthz` 前端可见状态接口。

成功标准：

- 主工程可以直接生成平台可运行 zip。
- 本地测试、build、平台健康检查流程一致。
- 平台 AI 接口接入不会污染本地开发体验。

## 六、本轮已完成的三步

### 第一步：Case Package 文件系统落地

已完成第一版：

- `cases/hammer-of-god/`
- `CaseLoader`
- 本地目录加载测试。
- schema 错误报告。
- skill 生成目录与 loader 的第一轮联调。
- skill 校验脚本支持 package directory 和 zip。

### 第二步：Agent Runtime v2 与 Skill 配置联动

已完成第一版：

- 结构化模型响应更新玩家状态。
- `pressureProfile`
- `emotionalArc`
- `confrontationTriggers`
- skill 输出对应字段。
- Runtime 根据 `pressureProfile.increaseRules` 更新 NPC 压力和状态。
- `applyAgentResponseContractToState` 将模型结构化输出合并到玩家状态与 agent session。

### 第三步：剧本杀式多幕最小闭环

已完成第一版：

- 第一幕：案发现场。
- 第二幕：证词矛盾。
- 第三幕：最终指认前的逼问。
- 每一幕必须有进入下一幕的触发条件。
- 每幕只增加少量可测试 fact、reveal rule 和 act gate。
- `evaluateActGates` 可以基于 required discoveries 判断幕解锁。

## 七、接下来最建议的三步

### 第一步：让默认案件真正由 CaseLoader 驱动

已完成第一版。应用首页、故事阅读、调查路由、调查回答和最终指认都通过默认案件服务读取 `cases/hammer-of-god/`。

已完成：

- 新增统一 `getDefaultCase()` 或 `loadDefaultCase()`。
- API、story reader、routing、accusation 统一从默认案件服务读取。
- 保留 `lib/case/hammer-of-god.ts` 作为测试 fixture 和迁移期兼容层。
- 增加默认案件目录加载测试。

下一步：

- 增加“目录数据和内置 fixture 一致性”测试，直到完全移除手写 fixture。
- 增加通过上传包切换当前可玩案件的激活入口。

### 第二步：把 Runtime v2 session patch 接到前端状态

已完成第一版。前端 play state 已包含 `agentSessions`，`/api/investigate` 接收当前 session 并返回 session/playerState patch。

已完成：

- 在 `PlayerKnowledgeState` 旁边新增 `AgentSessionState`。
- `/api/investigate` 接收当前 session，返回 session patch 和 playerState patch。
- 前端合并 patch 后保存到本地状态。
- 调查台展示 NPC 当前状态变化，但不把内部规则暴露给玩家。

### 第三步：把 ActGate 做成可玩的幕推进体验

已完成第一版。结构化调查回复可以更新线索、事实、矛盾、场景交互和 agent session；满足 ActGate 后前端切换下一章并在通用调查助手模块展示解锁叙事。

已完成：

- 玩家满足 ActGate 后解锁下一章或下一幕。
- 故事栏保持纯阅读体验。
- 通用调查助手展示非剧透幕推进叙事。

下一步：

- 通用调查助手可以给非剧透的“信息不足”提示。
- NPC 在不同 act 中使用更细的回答边界和语气。

## 八、主要风险

- AI 仍可能编造事实，需要继续强化 output guard 和重试策略。
- 自由对话可能让玩家错过必要线索，需要设计非剧透提示。
- 过多系统辅助会让游戏像答题器，过少辅助又会像无结构聊天。
- Case Package 规范如果过早复杂化，会拖慢第一个完整案件验证。
- 小说改写 skill 可能生成“形式正确但推理不公平”的案件，需要专门 linter 和人工审校。
- 多幕剧情可能被错误拆成普通章节，导致“剧情推进”没有解谜意义。
- NPC 压力模型如果由 Runtime 写死，会让不同小说角色变得同质化。
- 平台发布适配和本地开发环境需要分层，否则会互相污染。

## 九、当前原则

- 先把一个案件做到好玩，再做多案件平台。
- 先让 NPC 在规则内自由对话，再追求复杂 subagent 形态。
- 先让内容包规范稳定，再做创作者后台。
- Agent Runtime 的机制可以通用，但 NPC 的压力、性格和破防条件必须来自案件内容和 skill 适配结果。
- 多幕剧情不是章节分页，而是玩家完成阶段性推理后的推进结构。
- 先保护公平推理，再增强戏剧性。
- 任何 AI 输出都不能成为事实源；事实源只能来自 case schema 和玩家状态。
